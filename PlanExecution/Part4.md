# Part 4: Publishing Flow — Root Posts

## Goal

Adapt fountain.ink's editor and publishing flow so users can create forum
threads. The flow: Plate.js editor → add title + category → publish as full
Lens article to the correct Feed → track in `forum_threads` table. By the
end of this part, a user can create a new thread that appears in the board.

---

## Prerequisites

- Part 1 complete (auth working)
- Part 2 complete (Groups + Feeds created, addresses in constants)
- Part 3 complete (Supabase tables created, categories seeded)
- Fountain fork running locally with Plate.js editor functional

---

## How Fountain's Publishing Works (What We're Adapting)

Fountain's current flow:
```
1. User writes in Plate.js editor → content stored as JSON (draft)
2. User clicks "Publish" → PublishDialog opens with tabs:
   - Details (title, subtitle, cover, slug, tags)
   - Distribution (which blog/group to post to, newsletter)
   - Monetization (collecting settings)
3. On submit:
   a. getPostContent() → converts to markdown
   b. getPostAttributes() → stores contentJson, subtitle, coverUrl as metadata attributes
   c. article() from @lens-protocol/metadata → builds metadata object
   d. storageClient.uploadAsJson(metadata) → uploads to Grove → gets contentUri
   e. post(lens, { contentUri, feed }) → publishes to Lens
   f. createPostRecord() → saves to Supabase posts table
```

Our forum adaptation:
```
1. User writes in Plate.js editor → same (keep as-is)
2. User clicks "Create Thread" → ForumPublishDialog opens:
   - Title (required)
   - Category selector (required — picks from forum_categories)
   - Tags (optional)
   - Summary auto-generated from first ~200 chars
3. On submit:
   a. Same content pipeline (markdown + attributes + article metadata)
   b. Upload to Grove → contentUri
   c. Determine feed from category (commons or research)
   d. post(lens, { contentUri, feed: FEED_ADDRESS })
   e. Insert into forum_threads table
   f. Increment category thread_count
```

The key difference: we replace the blog/distribution/monetization tabs with
a simple category selector, and we write to `forum_threads` instead of
fountain's `posts` table.

---

## Step 1: Create the Forum Publish Service

This is the core function that publishes a thread. It mirrors fountain's
`publish-post.ts` but targets the forum.

```ts
// src/lib/forum/publish-thread.ts

import { uri } from "@lens-protocol/client"
import { fetchPost, post } from "@lens-protocol/client/actions"
import { handleOperationWith } from "@lens-protocol/client/viem"
import { article } from "@lens-protocol/metadata"
import { MetadataAttributeType } from "@lens-protocol/metadata"
import type { Draft } from "@/components/draft/draft"
import { getLensClient } from "@/lib/lens/client"
import { storageClient } from "@/lib/lens/storage-client"
import { getUserAccount } from "@/lib/auth/get-user-profile"
import { FEED_MAP, type FeedType } from "./constants"
import { getCategoryBySlug } from "./categories"
import { evmAddress } from "@lens-protocol/client"

export interface PublishThreadArgs {
  draft: Draft
  category: string          // category slug
  walletClient: any
}

export interface PublishThreadResult {
  success: boolean
  publicationId?: string
  error?: string
}

export async function publishThread({
  draft,
  category,
  walletClient,
}: PublishThreadArgs): Promise<PublishThreadResult> {
  // Validate category
  const cat = getCategoryBySlug(category)
  if (!cat) {
    return { success: false, error: `Invalid category: ${category}` }
  }

  // Get user
  const { username, address } = await getUserAccount()
  if (!username || !address) {
    return { success: false, error: "Not logged in" }
  }

  // Get Lens session
  const lens = await getLensClient()
  if (!lens.isSessionClient()) {
    return { success: false, error: "No Lens session" }
  }

  // Build metadata (same pattern as fountain's publish-post.ts)
  const contentMarkdown = draft.contentMarkdown || ""
  const contentJson = draft.contentJson

  const attributes = [
    {
      key: "contentJson",
      type: MetadataAttributeType.JSON,
      value: JSON.stringify(contentJson),
    },
    {
      key: "forumCategory",
      type: MetadataAttributeType.STRING,
      value: category,
    },
  ]

  if (draft.subtitle) {
    attributes.push({
      key: "subtitle",
      type: MetadataAttributeType.STRING,
      value: draft.subtitle,
    })
  }

  if (draft.coverUrl) {
    attributes.push({
      key: "coverUrl",
      type: MetadataAttributeType.STRING,
      value: draft.coverUrl,
    })
  }

  const metadata = article({
    title: draft.title || "Untitled",
    content: contentMarkdown,
    locale: "en",
    tags: [category, ...(draft.tags || [])],
    attributes,
  })

  // Upload to Grove
  const { uri: contentUri } = await storageClient.uploadAsJson(metadata)
  if (!contentUri) {
    return { success: false, error: "Failed to upload content" }
  }

  // Determine feed from category
  const feedAddress = FEED_MAP[cat.feed]

  // Publish to Lens
  const result = await post(lens, {
    contentUri: uri(contentUri),
    feed: evmAddress(feedAddress),
  })
    .andThen(handleOperationWith(walletClient))
    .andThen(lens.waitForTransaction)

  if (result.isErr()) {
    return { success: false, error: `Publish failed: ${result.error}` }
  }

  // Fetch the created post to get its ID
  const postResult = await fetchPost(lens, { txHash: result.value })
  if (postResult.isErr() || !postResult.value) {
    return { success: false, error: "Published but failed to fetch post" }
  }

  const publicationId = postResult.value.id

  // Track in Supabase
  await trackThread({
    publicationId,
    contentUri,
    feed: cat.feed,
    category,
    title: draft.title || "Untitled",
    summary: contentMarkdown.slice(0, 200),
    contentText: contentMarkdown,
    authorAddress: address,
    authorUsername: username,
  })

  return { success: true, publicationId }
}

async function trackThread(params: {
  publicationId: string
  contentUri: string
  feed: string
  category: string
  title: string
  summary: string
  contentText: string
  authorAddress: string
  authorUsername: string
}) {
  const res = await fetch("/api/forum/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    console.error("Failed to track thread in Supabase:", await res.text())
  }
}
```

---

## Step 2: Create the API Route for Thread Tracking

```ts
// src/app/api/forum/threads/route.ts

import { createClient } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = await createClient()

  const { error } = await db.from("forum_threads").insert({
    root_publication_id: body.publicationId,
    content_uri: body.contentUri,
    feed: body.feed,
    category: body.category,
    title: body.title,
    summary: body.summary,
    content_text: body.contentText,
    author_address: body.authorAddress,
    author_username: body.authorUsername,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Increment category thread count
  await db.rpc("forum_add_thread_to_category", { p_slug: body.category })

  return NextResponse.json({ success: true })
}
```

---

## Step 3: Create the Forum Publish Dialog

This replaces fountain's multi-tab PublishDialog with a simpler forum-focused
version. It reuses fountain's form infrastructure (react-hook-form + zod).

```tsx
// src/components/forum/forum-publish-dialog.tsx

"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useWalletClient } from "wagmi"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { SECTIONS } from "@/lib/forum/categories"
import { publishThread } from "@/lib/forum/publish-thread"
import { usePublishDraft } from "@/hooks/use-publish-draft"

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.string().min(1, "Select a category"),
})

type FormValues = z.infer<typeof schema>

interface Props {
  documentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForumPublishDialog({ documentId, open, onOpenChange }: Props) {
  const [isPublishing, setIsPublishing] = useState(false)
  const { getDraft, updateDraft } = usePublishDraft(documentId)
  const { data: walletClient } = useWalletClient()
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: getDraft()?.title || "",
      category: "",
    },
  })

  async function onSubmit(values: FormValues) {
    const draft = getDraft()
    if (!draft) {
      toast.error("No draft found")
      return
    }
    if (!walletClient) {
      toast.error("Wallet not connected")
      return
    }

    setIsPublishing(true)
    const pending = toast.loading("Publishing thread...")

    // Update draft with title before publishing
    updateDraft({ title: values.title })
    const updatedDraft = { ...draft, title: values.title }

    const result = await publishThread({
      draft: updatedDraft,
      category: values.category,
      walletClient,
    })

    toast.dismiss(pending)
    setIsPublishing(false)

    if (result.success) {
      toast.success("Thread published!")
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["drafts"] })
      router.push(`/thread/${result.publicationId}`)
    } else {
      toast.error(result.error || "Failed to publish")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Thread</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Thread title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SECTIONS.map((section) => (
                        <div key={section.id}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {section.title}
                          </div>
                          {section.categories.map((cat) => (
                            <SelectItem key={cat.slug} value={cat.slug}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish Thread"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Step 4: Wire the Dialog into the Editor Page

Fountain's editor page has a "Publish" button that opens the PublishDialog.
We add a parallel "Create Thread" button that opens our ForumPublishDialog.

The exact integration point depends on fountain's editor layout, but the
pattern is:

```tsx
// In the editor page or toolbar component

import { ForumPublishDialog } from "@/components/forum/forum-publish-dialog"

// Add state
const [forumDialogOpen, setForumDialogOpen] = useState(false)

// Add button (alongside or replacing fountain's publish button)
<Button onClick={() => setForumDialogOpen(true)}>
  Create Thread
</Button>

<ForumPublishDialog
  documentId={documentId}
  open={forumDialogOpen}
  onOpenChange={setForumDialogOpen}
/>
```

---

## Step 5: Category Tag in Metadata

When publishing, the category slug is stored in two places:

1. **Lens metadata tags** — `tags: [category, ...userTags]`
   This makes the category discoverable onchain. During recovery,
   we can read the first tag to determine which category a post belongs to.

2. **Lens metadata attributes** — `{ key: "forumCategory", value: category }`
   Explicit attribute for unambiguous category identification.

3. **Supabase** — `forum_threads.category` column.
   Fast lookup for the UI.

This triple-storage ensures the category survives even if Supabase is lost.
The recovery script (Part 9) reads the `forumCategory` attribute from the
publication metadata to reconstruct the category assignment.

---

## Step 6: Content Caching Strategy

When a thread is created, we cache two text representations in Supabase:

- `summary` — first ~200 characters of the markdown, used in thread list previews
- `content_text` — full plain text, used for full-text search

The full rich content (Plate.js JSON + markdown) lives on Grove via `content_uri`.
When rendering the thread detail page, we fetch from Grove for the rich view.
For list pages, we use the Supabase summary.

This gives us:
- Fast list pages (Supabase only, no Grove calls)
- Rich detail pages (Grove fetch for full content)
- Working search (Postgres full-text on content_text)

---

## Data Flow Summary

```
User writes in Plate.js editor
  ↓
Clicks "Create Thread"
  ↓
ForumPublishDialog: enters title, selects category
  ↓
publishThread():
  ├─ Build article metadata (title, markdown, contentJson, tags, attributes)
  ├─ Upload to Grove → contentUri
  ├─ Determine feed from category (commons or research)
  ├─ post(lens, { contentUri, feed }) → publish to Lens
  ├─ fetchPost(lens, { txHash }) → get publication ID
  └─ POST /api/forum/threads → insert into Supabase
       ├─ forum_threads row created
       └─ forum_categories.thread_count incremented
  ↓
Redirect to /thread/[publicationId]
```

---

## Checklist — Part 4 Complete When:

- [ ] `publish-thread.ts` service created
- [ ] `/api/forum/threads` API route created
- [ ] `ForumPublishDialog` component created
- [ ] Dialog wired into editor page
- [ ] User can write content in Plate.js editor
- [ ] User can select a category and publish
- [ ] Publication appears on Lens (verify on Hey.xyz)
- [ ] Thread row appears in `forum_threads` table
- [ ] Category `thread_count` incremented
- [ ] Content cached in Supabase (summary + content_text)
- [ ] `forumCategory` attribute present in publication metadata

---

## Next: Part 5 — Publishing Flow (Replies)

With root posts working, Part 5 adds the reply flow: same rich editor,
but publishes with `commentOn` pointing to the root post, and tracks
the reply in `forum_thread_replies` with a position number.
