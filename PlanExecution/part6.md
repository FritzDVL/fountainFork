# Part 6: Thread Display

## Goal

Build the forum UI pages: board homepage (sections + categories), thread
list (filtered by category), thread detail (root post + stacked replies
in Discourse style), and individual publication view. By the end of this
part, users can browse boards, read threads, and navigate between them.

---

## Prerequisites

- Part 4 complete (root posts can be published)
- Part 5 complete (replies can be published)
- Supabase tables populated with at least test data
- Fountain's Plate.js editor renders in `readOnly` mode

---

## Pages Overview

```
/                                    → Homepage (board sections)
/boards/:feed?category=:slug        → Thread list for a category
/thread/:rootPublicationId           → Thread detail (root + replies)
/publication/:publicationId          → Standalone article view (for a reply)
```

---

## Page 1: Homepage — Board Sections

Route: `/` (or `/boards`)

Displays all sections with their categories, thread counts, and latest
activity. This replaces the current Web3Forum homepage.

### Data Fetching

```ts
// src/lib/forum/get-board-sections.ts

import { createClient } from "@/lib/db/client"
import { SECTIONS } from "./categories"

export interface BoardCategory {
  slug: string
  name: string
  description: string
  threadCount: number
  latestActivity: string | null
}

export interface BoardSection {
  id: string
  title: string
  layout: "list" | "grid"
  categories: BoardCategory[]
}

export async function getBoardSections(): Promise<BoardSection[]> {
  const db = await createClient()

  const { data: dbCategories } = await db
    .from("forum_categories")
    .select("slug, thread_count")

  // Get latest activity per category
  const { data: latestThreads } = await db
    .from("forum_threads")
    .select("category, last_reply_at, created_at")
    .eq("is_hidden", false)
    .order("last_reply_at", { ascending: false, nullsFirst: false })

  // Build a map of latest activity per category
  const activityMap = new Map<string, string>()
  for (const t of latestThreads || []) {
    if (!activityMap.has(t.category)) {
      activityMap.set(t.category, t.last_reply_at || t.created_at)
    }
  }

  const countMap = new Map(
    (dbCategories || []).map((c) => [c.slug, c.thread_count]),
  )

  return SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    layout: section.layout,
    categories: section.categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      threadCount: countMap.get(cat.slug) || 0,
      latestActivity: activityMap.get(cat.slug) || null,
    })),
  }))
}
```

### Page Component

```tsx
// src/app/(app)/boards/page.tsx

import { getBoardSections } from "@/lib/forum/get-board-sections"
import { BoardSectionList } from "@/components/forum/board-section-list"

export const dynamic = "force-dynamic"

export default async function BoardsPage() {
  const sections = await getBoardSections()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {sections.map((section) => (
        <BoardSectionList key={section.id} section={section} />
      ))}
    </div>
  )
}
```

### Section Component

```tsx
// src/components/forum/board-section-list.tsx

import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"
import type { BoardSection } from "@/lib/forum/get-board-sections"

export function BoardSectionList({ section }: { section: BoardSection }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold tracking-wider text-muted-foreground mb-3">
        {section.title}
      </h2>

      <div className="border rounded-lg divide-y">
        {section.categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/boards/commons?category=${cat.slug}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{cat.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {cat.description}
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-muted-foreground ml-4">
              <div className="text-right w-16">
                <div className="font-medium">{cat.threadCount}</div>
                <div>threads</div>
              </div>
              {cat.latestActivity && (
                <div className="text-right w-20">
                  {formatRelativeTime(cat.latestActivity)}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

## Page 2: Thread List — Category View

Route: `/boards/:feed?category=:slug`

Shows all threads in a category, sorted by latest activity (pinned first).

### Data Fetching

```ts
// src/lib/forum/get-threads.ts

import { createClient } from "@/lib/db/client"

export interface ThreadListItem {
  id: string
  rootPublicationId: string
  title: string
  summary: string | null
  authorUsername: string | null
  authorAddress: string
  replyCount: number
  viewsCount: number
  upvotes: number
  downvotes: number
  lastReplyAt: string | null
  createdAt: string
  isPinned: boolean
  isLocked: boolean
}

export async function getThreadsByCategory(
  category: string,
  page = 1,
  pageSize = 20,
): Promise<{ threads: ThreadListItem[]; total: number }> {
  const db = await createClient()
  const offset = (page - 1) * pageSize

  const { data, count, error } = await db
    .from("forum_threads")
    .select("*", { count: "exact" })
    .eq("category", category)
    .eq("is_hidden", false)
    .order("is_pinned", { ascending: false })
    .order("last_reply_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1)

  if (error) throw error

  return {
    threads: (data || []).map((t) => ({
      id: t.id,
      rootPublicationId: t.root_publication_id,
      title: t.title,
      summary: t.summary,
      authorUsername: t.author_username,
      authorAddress: t.author_address,
      replyCount: t.reply_count,
      viewsCount: t.views_count,
      upvotes: t.upvotes,
      downvotes: t.downvotes,
      lastReplyAt: t.last_reply_at,
      createdAt: t.created_at,
      isPinned: t.is_pinned,
      isLocked: t.is_locked,
    })),
    total: count || 0,
  }
}
```

### Page Component

```tsx
// src/app/(app)/boards/[feed]/page.tsx

import { getThreadsByCategory } from "@/lib/forum/get-threads"
import { getCategoryBySlug, SECTIONS } from "@/lib/forum/categories"
import { ThreadListView } from "@/components/forum/thread-list-view"
import { notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface Props {
  params: { feed: string }
  searchParams: { category?: string; page?: string }
}

export default async function ThreadListPage({ params, searchParams }: Props) {
  const category = searchParams.category
  if (!category) return notFound()

  const cat = getCategoryBySlug(category)
  if (!cat) return notFound()

  const page = Number(searchParams.page) || 1
  const { threads, total } = await getThreadsByCategory(category, page)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        <Link href="/boards" className="hover:underline">Boards</Link>
        {" / "}
        <span>{cat.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{cat.name}</h1>
          <p className="text-sm text-muted-foreground">{cat.description}</p>
        </div>
        <Link
          href="/editor/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          New Thread
        </Link>
      </div>

      <ThreadListView threads={threads} total={total} page={page} />
    </div>
  )
}
```

### Thread List Component

```tsx
// src/components/forum/thread-list-view.tsx

import Link from "next/link"
import { Pin, Lock, MessageSquare, Eye, ArrowUp } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import type { ThreadListItem } from "@/lib/forum/get-threads"

interface Props {
  threads: ThreadListItem[]
  total: number
  page: number
}

export function ThreadListView({ threads, total, page }: Props) {
  if (threads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No threads yet. Be the first to start a discussion.
      </div>
    )
  }

  return (
    <div className="border rounded-lg divide-y">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          href={`/thread/${thread.rootPublicationId}`}
          className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          {/* Vote score */}
          <div className="flex flex-col items-center w-10 text-xs">
            <ArrowUp className="h-3 w-3" />
            <span className="font-medium">
              {thread.upvotes - thread.downvotes}
            </span>
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {thread.isPinned && <Pin className="h-3 w-3 text-primary" />}
              {thread.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
              <span className="font-medium text-sm truncate">
                {thread.title}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              by {thread.authorUsername || thread.authorAddress.slice(0, 10)}
              {" · "}
              {formatRelativeTime(thread.createdAt)}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {thread.replyCount}
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {thread.viewsCount}
            </div>
            {thread.lastReplyAt && (
              <div className="w-20 text-right">
                {formatRelativeTime(thread.lastReplyAt)}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
```

---

## Page 3: Thread Detail — Stacked Replies (Discourse Style)

Route: `/thread/:rootPublicationId`

The core forum experience. Shows the root post as a full article, followed
by all replies stacked vertically, each rendered with the same rich content
renderer. This is the Discourse-style layout.

### Data Fetching

```ts
// src/lib/forum/get-thread-detail.ts

import { createClient } from "@/lib/db/client"

export interface ThreadDetail {
  id: string
  rootPublicationId: string
  contentUri: string | null
  feed: string
  category: string
  title: string
  authorAddress: string
  authorUsername: string | null
  replyCount: number
  viewsCount: number
  upvotes: number
  downvotes: number
  isPinned: boolean
  isLocked: boolean
  createdAt: string
}

export interface ThreadReply {
  id: string
  publicationId: string
  contentUri: string | null
  position: number
  authorAddress: string
  authorUsername: string | null
  summary: string | null
  upvotes: number
  downvotes: number
  isHidden: boolean
  createdAt: string
}

export async function getThreadDetail(rootPublicationId: string) {
  const db = await createClient()

  const { data: thread } = await db
    .from("forum_threads")
    .select("*")
    .eq("root_publication_id", rootPublicationId)
    .single()

  if (!thread) return null

  // Increment views
  await db.rpc("forum_increment_views", { p_thread_id: thread.id })

  const { data: replies } = await db
    .from("forum_thread_replies")
    .select("*")
    .eq("thread_id", thread.id)
    .eq("is_hidden", false)
    .order("position", { ascending: true })

  return {
    thread: {
      id: thread.id,
      rootPublicationId: thread.root_publication_id,
      contentUri: thread.content_uri,
      feed: thread.feed,
      category: thread.category,
      title: thread.title,
      authorAddress: thread.author_address,
      authorUsername: thread.author_username,
      replyCount: thread.reply_count,
      viewsCount: thread.views_count + 1,
      upvotes: thread.upvotes,
      downvotes: thread.downvotes,
      isPinned: thread.is_pinned,
      isLocked: thread.is_locked,
      createdAt: thread.created_at,
    } as ThreadDetail,
    replies: (replies || []).map((r) => ({
      id: r.id,
      publicationId: r.publication_id,
      contentUri: r.content_uri,
      position: r.position,
      authorAddress: r.author_address,
      authorUsername: r.author_username,
      summary: r.summary,
      upvotes: r.upvotes,
      downvotes: r.downvotes,
      isHidden: r.is_hidden,
      createdAt: r.created_at,
    })) as ThreadReply[],
  }
}
```

### Page Component

```tsx
// src/app/(app)/thread/[rootPublicationId]/page.tsx

import { getThreadDetail } from "@/lib/forum/get-thread-detail"
import { getCategoryBySlug } from "@/lib/forum/categories"
import { ThreadDetailView } from "@/components/forum/thread-detail-view"
import { notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface Props {
  params: { rootPublicationId: string }
}

export default async function ThreadPage({ params }: Props) {
  const result = await getThreadDetail(params.rootPublicationId)
  if (!result) return notFound()

  const { thread, replies } = result
  const category = getCategoryBySlug(thread.category)

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        <Link href="/boards" className="hover:underline">Boards</Link>
        {" / "}
        <Link
          href={`/boards/${thread.feed}?category=${thread.category}`}
          className="hover:underline"
        >
          {category?.name || thread.category}
        </Link>
      </div>

      <ThreadDetailView thread={thread} replies={replies} />
    </div>
  )
}
```

### Thread Detail Component

This is the Discourse-style stacked view. Each post (root + replies) is
rendered using fountain's Plate.js editor in `readOnly` mode.

```tsx
// src/components/forum/thread-detail-view.tsx

"use client"

import { formatRelativeTime } from "@/lib/utils"
import { ArrowUp, ArrowDown, Lock, Pin, ExternalLink } from "lucide-react"
import Link from "next/link"
import type { ThreadDetail, ThreadReply } from "@/lib/forum/get-thread-detail"
import type { FeedType } from "@/lib/forum/constants"
import { ThreadReplyEditor } from "./thread-reply-editor"
import { ForumPostContent } from "./forum-post-content"

interface Props {
  thread: ThreadDetail
  replies: ThreadReply[]
}

export function ThreadDetailView({ thread, replies }: Props) {
  return (
    <div>
      {/* Thread header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {thread.isPinned && <Pin className="h-4 w-4 text-primary" />}
          {thread.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          <h1 className="text-2xl font-bold">{thread.title}</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          {thread.replyCount} replies · {thread.viewsCount} views
        </div>
      </div>

      {/* Root post — post #0 */}
      <ForumPostCard
        publicationId={thread.rootPublicationId}
        contentUri={thread.contentUri}
        authorUsername={thread.authorUsername}
        authorAddress={thread.authorAddress}
        createdAt={thread.createdAt}
        upvotes={thread.upvotes}
        downvotes={thread.downvotes}
        position={0}
        isRoot
      />

      {/* Replies — stacked vertically */}
      {replies.map((reply) => (
        <ForumPostCard
          key={reply.id}
          publicationId={reply.publicationId}
          contentUri={reply.contentUri}
          authorUsername={reply.authorUsername}
          authorAddress={reply.authorAddress}
          createdAt={reply.createdAt}
          upvotes={reply.upvotes}
          downvotes={reply.downvotes}
          position={reply.position}
        />
      ))}

      {/* Reply editor (if thread not locked) */}
      {!thread.isLocked && (
        <ThreadReplyEditor
          threadRootPublicationId={thread.rootPublicationId}
          threadFeed={thread.feed as FeedType}
        />
      )}
    </div>
  )
}

// Individual post card (used for both root and replies)
function ForumPostCard({
  publicationId,
  contentUri,
  authorUsername,
  authorAddress,
  createdAt,
  upvotes,
  downvotes,
  position,
  isRoot = false,
}: {
  publicationId: string
  contentUri: string | null
  authorUsername: string | null
  authorAddress: string
  createdAt: string
  upvotes: number
  downvotes: number
  position: number
  isRoot?: boolean
}) {
  return (
    <div className="border-b py-6 first:pt-0">
      {/* Post header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar placeholder — replace with fountain's UserAvatar */}
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div>
            <div className="text-sm font-medium">
              {authorUsername || authorAddress.slice(0, 10) + "..."}
            </div>
            <div className="text-xs text-muted-foreground">
              {isRoot ? "Original post" : `Reply #${position}`}
              {" · "}
              {formatRelativeTime(createdAt)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Link to standalone publication view */}
          <Link
            href={`/publication/${publicationId}`}
            className="text-muted-foreground hover:text-foreground"
            title="View as standalone article"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Post content — rendered via fountain's Plate.js in readOnly mode */}
      <div className="prose prose-sm max-w-none">
        <ForumPostContent contentUri={contentUri} publicationId={publicationId} />
      </div>

      {/* Post footer — voting */}
      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
        <button className="hover:text-foreground"><ArrowUp className="h-4 w-4" /></button>
        <span className="font-medium">{upvotes - downvotes}</span>
        <button className="hover:text-foreground"><ArrowDown className="h-4 w-4" /></button>
      </div>
    </div>
  )
}
```

### Content Renderer

This component fetches the Plate.js JSON from the publication metadata
and renders it using fountain's editor in read-only mode.

```tsx
// src/components/forum/forum-post-content.tsx

"use client"

import { useEffect, useState } from "react"
import { fetchPost } from "@lens-protocol/client/actions"
import { postId } from "@lens-protocol/client"
import { getLensClient } from "@/lib/lens/client"

// Reuse fountain's editor in readOnly mode
// This is the same component fountain uses to render articles
// import Editor from "@/components/editor/editor"

interface Props {
  contentUri: string | null
  publicationId: string
}

export function ForumPostContent({ contentUri, publicationId }: Props) {
  const [contentJson, setContentJson] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Fetch the Lens post to get metadata attributes
        const client = await getLensClient()
        const result = await fetchPost(client, {
          post: postId(publicationId),
        })

        if (result.isOk() && result.value?.__typename === "Post") {
          const attrs = result.value.metadata?.attributes || []
          const jsonAttr = attrs.find(
            (a: any) => "key" in a && a.key === "contentJson",
          )
          if (jsonAttr?.value) {
            setContentJson(jsonAttr.value)
          }
        }
      } catch (e) {
        console.error("Failed to load post content:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [publicationId])

  if (loading) {
    return <div className="animate-pulse h-24 bg-muted rounded" />
  }

  if (!contentJson) {
    return <div className="text-muted-foreground italic">Content unavailable</div>
  }

  // Render using fountain's Plate.js editor in readOnly mode
  // This is the exact same pattern fountain uses at line 10729:
  //   <Editor showToc value={contentJson} readOnly={true} />
  return (
    <div>
      {/* <Editor value={contentJson} readOnly={true} showToc={false} /> */}
      {/* Placeholder until fountain's Editor component is wired in */}
      <div className="whitespace-pre-wrap">{contentJson}</div>
    </div>
  )
}
```

Note: The `<Editor readOnly={true} value={contentJson} />` call is exactly
how fountain renders published articles. The `contentJson` attribute stores
the Plate.js JSON, and the editor renders it with all formatting intact
but no editing capabilities. This is the key integration point.

---

## Page 4: Standalone Publication View

Route: `/publication/:publicationId`

When someone clicks the external link icon on a reply, or arrives from
Hey.xyz / another Lens app, they see the reply as a standalone article
with a link back to the thread.

```tsx
// src/app/(app)/publication/[publicationId]/page.tsx

import { createClient } from "@/lib/db/client"
import { ForumPostContent } from "@/components/forum/forum-post-content"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

interface Props {
  params: { publicationId: string }
}

export default async function PublicationPage({ params }: Props) {
  const db = await createClient()

  // Check if it's a thread root
  const { data: thread } = await db
    .from("forum_threads")
    .select("root_publication_id, title, category")
    .eq("root_publication_id", params.publicationId)
    .single()

  if (thread) {
    // It's a root post — redirect to thread view
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-4 text-sm">
          <Link
            href={`/thread/${thread.root_publication_id}`}
            className="text-primary hover:underline"
          >
            ← View full thread: {thread.title}
          </Link>
        </div>
        <ForumPostContent
          contentUri={null}
          publicationId={params.publicationId}
        />
      </div>
    )
  }

  // Check if it's a reply
  const { data: reply } = await db
    .from("forum_thread_replies")
    .select("publication_id, thread_id")
    .eq("publication_id", params.publicationId)
    .single()

  if (reply) {
    const { data: parentThread } = await db
      .from("forum_threads")
      .select("root_publication_id, title")
      .eq("id", reply.thread_id)
      .single()

    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {parentThread && (
          <div className="mb-4 text-sm">
            <Link
              href={`/thread/${parentThread.root_publication_id}`}
              className="text-primary hover:underline"
            >
              ← Part of thread: {parentThread.title}
            </Link>
          </div>
        )}
        <ForumPostContent
          contentUri={null}
          publicationId={params.publicationId}
        />
      </div>
    )
  }

  return notFound()
}
```

---

## Content Loading Strategy

For the thread detail page, loading every reply's content from Lens API
individually would be slow. The strategy:

1. **Initial page load** — Supabase provides thread metadata + reply list
   instantly (server-side rendered)
2. **Content hydration** — Each `ForumPostContent` component fetches its
   Plate.js JSON from Lens client-side (parallel requests)
3. **Future optimization** — Cache `contentJson` in Supabase alongside
   `content_text` to eliminate Lens API calls entirely. Serve everything
   from Supabase, use Lens only as fallback.

The progressive approach: ship with Lens API fetching first (simpler),
add Supabase content caching in Part 9 (optimization).

---

## Checklist — Part 6 Complete When:

- [ ] Homepage shows all sections with categories, thread counts, activity
- [ ] Thread list page shows threads filtered by category
- [ ] Thread list has sorting (pinned first, then by last activity)
- [ ] Thread detail page shows root post + stacked replies
- [ ] Each post renders rich content via Plate.js readOnly mode
- [ ] Vote buttons visible (wiring to backend is Part 7)
- [ ] Reply editor visible at bottom of thread (from Part 5)
- [ ] Standalone publication page shows article with thread link
- [ ] Breadcrumb navigation works (Boards → Category → Thread)
- [ ] "New Thread" button links to editor
- [ ] View count increments on thread page load
- [ ] Empty states for categories with no threads

---

## Next: Part 7 — Forum Features (Port from Current Codebase)

With the display layer working, Part 7 wires up voting, moderation,
community management, and notifications — ported from the current
Web3Forum codebase.
