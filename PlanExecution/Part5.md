# Part 5: Publishing Flow — Replies

## Goal

Allow users to reply to a thread using the same rich Plate.js editor.
Each reply is a full Lens publication with `commentOn` pointing to the
root post, published to the same Feed as the root. Supabase tracks the
reply's position in the thread. By the end of this part, a thread can
accumulate replies displayed in order.

---

## Prerequisites

- Part 4 complete (root post publishing works)
- Thread detail page route exists (even if bare — Part 6 builds the full UI)
- `forum_thread_replies` table created (Part 3)

---

## How Replies Differ From Root Posts

| Aspect | Root Post (Part 4) | Reply (Part 5) |
|---|---|---|
| Lens `commentOn` | null | `{ post: rootPublicationId }` |
| Feed | determined by category | same feed as root post |
| Title | required | optional (can be empty) |
| Category | user selects | inherited from thread |
| Supabase table | `forum_threads` | `forum_thread_replies` |
| Position | N/A | sequential integer (1, 2, 3...) |
| Editor | full Plate.js | full Plate.js (identical) |
| Metadata attribute | `forumCategory` | `forumThreadId` (root pub ID) |

The reply is a first-class Lens article. On Hey.xyz it appears as a
standalone publication that happens to be a comment on the root post.
On our forum UI, it's displayed as reply #N in the thread.

---

## Step 1: Create the Reply Publishing Service

```ts
// src/lib/forum/publish-reply.ts

import { postId as lensPostId, uri, evmAddress } from "@lens-protocol/client"
import { fetchPost, post } from "@lens-protocol/client/actions"
import { handleOperationWith } from "@lens-protocol/client/viem"
import { article } from "@lens-protocol/metadata"
import { MetadataAttributeType } from "@lens-protocol/metadata"
import type { Draft } from "@/components/draft/draft"
import { getLensClient } from "@/lib/lens/client"
import { storageClient } from "@/lib/lens/storage-client"
import { getUserAccount } from "@/lib/auth/get-user-profile"
import { FEED_MAP, type FeedType } from "./constants"

export interface PublishReplyArgs {
  draft: Draft
  threadRootPublicationId: string   // Lens post ID of the thread root
  threadFeed: FeedType              // 'commons' or 'research'
  walletClient: any
}

export interface PublishReplyResult {
  success: boolean
  publicationId?: string
  error?: string
}

export async function publishReply({
  draft,
  threadRootPublicationId,
  threadFeed,
  walletClient,
}: PublishReplyArgs): Promise<PublishReplyResult> {
  const { username, address } = await getUserAccount()
  if (!username || !address) {
    return { success: false, error: "Not logged in" }
  }

  const lens = await getLensClient()
  if (!lens.isSessionClient()) {
    return { success: false, error: "No Lens session" }
  }

  const contentMarkdown = draft.contentMarkdown || ""
  const contentJson = draft.contentJson

  // Build metadata — same rich article format as root posts
  const attributes = [
    {
      key: "contentJson",
      type: MetadataAttributeType.JSON,
      value: JSON.stringify(contentJson),
    },
    {
      key: "forumThreadId",
      type: MetadataAttributeType.STRING,
      value: threadRootPublicationId,
    },
  ]

  const metadata = article({
    title: draft.title || "",
    content: contentMarkdown,
    locale: "en",
    tags: draft.tags || [],
    attributes,
  })

  // Upload to Grove
  const { uri: contentUri } = await storageClient.uploadAsJson(metadata)
  if (!contentUri) {
    return { success: false, error: "Failed to upload content" }
  }

  // Publish to Lens with commentOn
  const feedAddress = FEED_MAP[threadFeed]

  const result = await post(lens, {
    contentUri: uri(contentUri),
    feed: evmAddress(feedAddress),
    commentOn: {
      post: lensPostId(threadRootPublicationId),
    },
  })
    .andThen(handleOperationWith(walletClient))
    .andThen(lens.waitForTransaction)

  if (result.isErr()) {
    return { success: false, error: `Publish failed: ${result.error}` }
  }

  // Fetch the created post
  const postResult = await fetchPost(lens, { txHash: result.value })
  if (postResult.isErr() || !postResult.value) {
    return { success: false, error: "Published but failed to fetch post" }
  }

  const publicationId = postResult.value.id

  // Track in Supabase
  await trackReply({
    threadRootPublicationId,
    publicationId,
    contentUri,
    contentText: contentMarkdown,
    summary: contentMarkdown.slice(0, 200),
    authorAddress: address,
    authorUsername: username,
  })

  return { success: true, publicationId }
}

async function trackReply(params: {
  threadRootPublicationId: string
  publicationId: string
  contentUri: string
  contentText: string
  summary: string
  authorAddress: string
  authorUsername: string
}) {
  const res = await fetch("/api/forum/replies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    console.error("Failed to track reply:", await res.text())
  }
}
```

---

## Step 2: Create the API Route for Reply Tracking

```ts
// src/app/api/forum/replies/route.ts

import { createClient } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = await createClient()

  // Find the thread
  const { data: thread, error: threadError } = await db
    .from("forum_threads")
    .select("id, reply_count")
    .eq("root_publication_id", body.threadRootPublicationId)
    .single()

  if (threadError || !thread) {
    return NextResponse.json(
      { error: "Thread not found" },
      { status: 404 },
    )
  }

  // Next position = current reply_count + 1
  const position = thread.reply_count + 1

  // Insert reply
  const { error: insertError } = await db
    .from("forum_thread_replies")
    .insert({
      thread_id: thread.id,
      publication_id: body.publicationId,
      content_uri: body.contentUri,
      position,
      content_text: body.contentText,
      summary: body.summary,
      author_address: body.authorAddress,
      author_username: body.authorUsername,
    })

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    )
  }

  // Update thread counters
  await db.rpc("forum_add_reply", {
    p_thread_id: thread.id,
    p_reply_time: new Date().toISOString(),
  })

  return NextResponse.json({ success: true, position })
}
```

---

## Step 3: Create the Reply Editor Component

The reply editor lives at the bottom of the thread detail page. It's a
smaller version of the full Plate.js editor — same capabilities, but
presented inline rather than as a full-page editor.

```tsx
// src/components/forum/thread-reply-editor.tsx

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWalletClient } from "wagmi"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { publishReply } from "@/lib/forum/publish-reply"
import type { FeedType } from "@/lib/forum/constants"
import type { Draft } from "@/components/draft/draft"

// Reuse fountain's Plate editor component
// The exact import depends on how fountain structures its editor
// This is the integration point — use their PlateEditor in a compact form

interface Props {
  threadRootPublicationId: string
  threadFeed: FeedType
  onReplyPublished?: () => void
}

export function ThreadReplyEditor({
  threadRootPublicationId,
  threadFeed,
  onReplyPublished,
}: Props) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [editorContent, setEditorContent] = useState<any>(null)
  const { data: walletClient } = useWalletClient()
  const router = useRouter()

  async function handlePublish() {
    if (!editorContent || !walletClient) {
      toast.error("Write something first")
      return
    }

    setIsPublishing(true)
    const pending = toast.loading("Publishing reply...")

    // Build a minimal Draft object from the editor content
    // The exact shape depends on how fountain's editor exposes content
    const draft: Draft = {
      contentJson: editorContent,
      contentMarkdown: extractMarkdown(editorContent),
      title: "",
      // ... other Draft fields with defaults
    } as Draft

    const result = await publishReply({
      draft,
      threadRootPublicationId,
      threadFeed,
      walletClient,
    })

    toast.dismiss(pending)
    setIsPublishing(false)

    if (result.success) {
      toast.success("Reply published!")
      // Clear editor
      setEditorContent(null)
      // Refresh thread to show new reply
      onReplyPublished?.()
      router.refresh()
    } else {
      toast.error(result.error || "Failed to publish reply")
    }
  }

  return (
    <div className="border rounded-lg p-4 mt-6">
      <h3 className="text-sm font-medium mb-3">Write a reply</h3>

      {/*
        Mount fountain's Plate editor here in compact mode.
        The exact component depends on fountain's editor API.
        Key: same rich editing capabilities as root posts.

        <PlateEditor
          readOnly={false}
          showToolbar={true}
          showToc={false}
          value={JSON.stringify(editorContent || initialValue)}
          onChange={setEditorContent}
        />
      */}
      <div className="min-h-[200px] border rounded mb-3">
        {/* Plate editor mounted here */}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handlePublish}
          disabled={isPublishing || !editorContent}
        >
          {isPublishing ? "Publishing..." : "Post Reply"}
        </Button>
      </div>
    </div>
  )
}

// Helper to extract markdown from Plate.js JSON
// Fountain already has this — reuse their serialization
function extractMarkdown(contentJson: any): string {
  // Use fountain's existing markdown serializer
  // or plate's built-in serialization
  // This is a placeholder — the actual implementation
  // depends on fountain's editor setup
  return JSON.stringify(contentJson)
}
```

---

## Step 4: Integration Notes for Plate.js Editor

Fountain's editor is initialized in `src/components/editor/editor.tsx` with:
- `createPlateEditor()` with plugins from `getEditorPlugins()`
- Rich elements from `getRichElements()`
- Optional collaborative editing via YjsPlugin

For the reply editor, we reuse the same setup but:
- No collaborative editing (replies are single-author)
- No table of contents sidebar
- Compact toolbar (fewer buttons, or floating toolbar only)
- No autosave to drafts (replies are published directly)

The key function to reuse is `getEditorPlugins()` — it configures all the
formatting capabilities (bold, italic, headings, code blocks, images, etc.).

Fountain stores the editor content as Plate.js JSON in the `contentJson`
field of the Draft, and converts to markdown via `getPostContent()` for
the Lens metadata. The reply flow does the same thing.

---

## Step 5: The `forumThreadId` Metadata Attribute

Each reply stores `forumThreadId` in its Lens metadata attributes:

```ts
{
  key: "forumThreadId",
  type: MetadataAttributeType.STRING,
  value: threadRootPublicationId,  // e.g., "0x01-0x42"
}
```

This serves two purposes:

1. **Recovery** — If Supabase is lost, the recovery script reads this
   attribute to know which thread a reply belongs to, even without
   relying on the `commentOn` field (belt and suspenders).

2. **Cross-app identification** — Other apps can read this attribute
   to understand that this publication is a forum reply, not a
   standalone article.

Combined with `commentOn`, there are now two independent ways to
reconstruct thread structure from onchain data:
- `commentOn` → Lens-native parent-child relationship
- `forumThreadId` attribute → explicit thread membership

---

## Step 6: Position Assignment

Positions are assigned sequentially: `reply_count + 1` at the time of
insertion. This is simple and works for a linear thread model (Discourse-style).

Edge case: two replies submitted simultaneously could get the same position.
The API route handles this by reading `reply_count` from the thread row,
which is updated atomically by `forum_add_reply()`. If a race condition
occurs, the unique constraint on `publication_id` prevents duplicate rows,
and the position might have a gap — acceptable for a forum.

For stricter ordering, the recovery script (Part 9) can re-number positions
based on `created_at` timestamps.

---

## Data Flow Summary

```
User is viewing a thread (/thread/[rootPubId])
  ↓
Writes reply in Plate.js editor at bottom of page
  ↓
Clicks "Post Reply"
  ↓
publishReply():
  ├─ Build article metadata (content, contentJson, forumThreadId attribute)
  ├─ Upload to Grove → contentUri
  ├─ post(lens, { contentUri, feed, commentOn: { post: rootPubId } })
  ├─ fetchPost(lens, { txHash }) → get reply publication ID
  └─ POST /api/forum/replies
       ├─ Find thread by root_publication_id
       ├─ Calculate position = reply_count + 1
       ├─ Insert into forum_thread_replies
       └─ forum_add_reply() → increment reply_count + update last_reply_at
  ↓
Thread page refreshes, new reply appears at bottom
```

---

## Onchain Result

After a thread with 3 replies, the Lens state looks like:

```
Publication A (root)
  ├─ commentOn: null
  ├─ feed: COMMONS_FEED
  ├─ metadata.attributes: [{ forumCategory: "beginners" }]
  │
  ├── Publication B (reply #1)
  │   ├─ commentOn: A
  │   ├─ feed: COMMONS_FEED
  │   └─ metadata.attributes: [{ forumThreadId: "A" }]
  │
  ├── Publication C (reply #2)
  │   ├─ commentOn: A
  │   ├─ feed: COMMONS_FEED
  │   └─ metadata.attributes: [{ forumThreadId: "A" }]
  │
  └── Publication D (reply #3)
      ├─ commentOn: A
      ├─ feed: COMMONS_FEED
      └─ metadata.attributes: [{ forumThreadId: "A" }]
```

Supabase state:
```
forum_threads:
  { root_publication_id: "A", category: "beginners", reply_count: 3 }

forum_thread_replies:
  { publication_id: "B", thread_id: <uuid>, position: 1 }
  { publication_id: "C", thread_id: <uuid>, position: 2 }
  { publication_id: "D", thread_id: <uuid>, position: 3 }
```

Recovery from Lens alone:
```
fetchPostReferences("A", [CommentOn]) → [B, C, D] ordered by timestamp
→ position 1 = B, position 2 = C, position 3 = D
```

---

## Checklist — Part 5 Complete When:

- [ ] `publish-reply.ts` service created
- [ ] `/api/forum/replies` API route created
- [ ] `ThreadReplyEditor` component created with Plate.js editor
- [ ] Reply editor mounted on thread detail page
- [ ] User can write rich content and publish a reply
- [ ] Reply appears on Lens with `commentOn` pointing to root post
- [ ] Reply row appears in `forum_thread_replies` with correct position
- [ ] Thread's `reply_count` and `last_reply_at` updated
- [ ] `forumThreadId` attribute present in reply metadata
- [ ] Content cached in Supabase (summary + content_text)
- [ ] Multiple replies maintain correct sequential positions

---

## Next: Part 6 — Thread Display

With both root posts and replies publishable, Part 6 builds the UI:
board listing, thread list, thread detail (stacked replies), and
individual publication view.
