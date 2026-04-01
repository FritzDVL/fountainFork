# Core Concept: The Forum Is a Display Layer

## What You're Actually Building

You are NOT changing how content is created or stored. Fountain's entire
publishing pipeline stays untouched:

```
User writes in Plate.js editor
  → Draft saved to Supabase (autosave)
  → User clicks Publish
  → article() metadata built (title, markdown, contentJson attribute)
  → Uploaded to Grove → contentUri
  → Published to Lens via post() → permanent onchain publication
  → Each post has its own URL, its own page, its own life on Lens
```

This does not change. Every piece of content is still a full Lens article.

What you're building is a **second way to view** that same content. The
article page (`/p/[user]/[post]`) still exists. But you're adding a
thread page (`/thread/[id]`) that takes the `contentJson` from multiple
related publications and stacks them vertically on a single page.

---

## How Fountain Currently Displays Content

Right now, Fountain is article-centric. The flow is:

```
Lens Publication (onchain)
  │
  │  has metadata.attributes.contentJson = Plate.js JSON
  │
  └─→ /p/[user]/[post] page
        │
        │  Fetches post from Lens API
        │  Extracts contentJson from metadata attributes
        │  Renders: <Editor value={contentJson} readOnly={true} />
        │
        └─→ Full article page with author, date, reactions, comments
```

Every post opens in its own page. Comments are Lens-native comments
shown in a `CommentPreview` component at the bottom. They're lightweight
text, not rich articles.

---

## What You Want Instead

You want to keep the article pages but ADD a forum view where:

```
Thread Page (/thread/[id])
  │
  ├─ Root Post (a full Lens publication)
  │    └─ contentJson rendered via <Editor readOnly />
  │
  ├─ Reply #1 (another full Lens publication, linked via commentOn)
  │    └─ contentJson rendered via <Editor readOnly />
  │
  ├─ Reply #2 (another full Lens publication)
  │    └─ contentJson rendered via <Editor readOnly />
  │
  └─ Reply #3 ...
```

Each reply is a FULL article published to Lens — not a lightweight
comment. It has rich formatting, images, code blocks, everything the
Plate.js editor supports. But instead of each reply opening its own
page, you STACK them on a single thread page.

---

## Why This Is Fast

Here's the key insight about speed:

Fountain's article page (`/p/[user]/[post]/page.tsx`) fetches the post
from the Lens API on every page load:

```ts
const post = await fetchPost(lens, { post: postId }).unwrapOr(null);
const contentJson = post?.metadata?.attributes?.find(
  (attr: any) => attr.key === "contentJson"
)?.value;
```

This works fine for a single article. But for a thread with 50 replies,
you'd need 50 Lens API calls. That's slow.

Your approach: **mirror the contentJson into Supabase at publish time**.
When someone publishes a thread or reply, you store the Plate.js JSON
in your own database alongside the Lens publication ID. Then the thread
page reads everything from Supabase in 1-2 queries:

```
Thread page load:
  1. SELECT * FROM forum_threads WHERE id = $1           → thread metadata
  2. SELECT * FROM forum_thread_replies WHERE thread_id   → all replies + content
  
  Total: 2 Supabase queries, 0 Lens API calls
  All contentJson is already in your database
  Render everything server-side, instant page load
```

You're not constrained by Lens Protocol's reply system because you're
not using it for display. You use Lens `commentOn` only as the onchain
link between publications. The actual display is pure web2 — read from
Postgres, render with React, done.

---

## The Relationship Between Lens Publications and Forum Display

```
LENS (permanent, onchain)              YOUR FORUM (display layer)
═══════════════════════════            ═══════════════════════════

Publication A                          Thread Page /thread/A
  type: article                          ┌─────────────────────┐
  feed: COMMONS_FEED                     │ Root Post            │
  metadata.contentJson: {...}            │ (Publication A)      │
  commentOn: null                        │ rendered contentJson  │
                                         ├─────────────────────┤
Publication B                            │ Reply #1             │
  type: article                          │ (Publication B)      │
  feed: COMMONS_FEED                     │ rendered contentJson  │
  metadata.contentJson: {...}            ├─────────────────────┤
  commentOn: A                           │ Reply #2             │
                                         │ (Publication C)      │
Publication C                            │ rendered contentJson  │
  type: article                          ├─────────────────────┤
  feed: COMMONS_FEED                     │ [Reply Editor]       │
  metadata.contentJson: {...}            │ Write your reply...  │
  commentOn: A                           └─────────────────────┘

Each publication ALSO has its own article page:
  /p/[user]/A → full article view of Publication A
  /p/[user]/B → full article view of Publication B
  /p/[user]/C → full article view of Publication C

The thread page is an ADDITIONAL view, not a replacement.
```

---

## What Supabase Stores (The Mirror)

Supabase is a mirror of information that already exists on Lens. It
stores just enough to render the forum UI without calling Lens:

```
forum_threads
  ├─ root_publication_id  → links to Lens publication
  ├─ title                → copied from metadata.title
  ├─ category             → "beginners", "architecture", etc.
  ├─ content_json         → copied from metadata.contentJson attribute
  ├─ content_text         → plain text for search
  ├─ author_address       → from publication.author
  ├─ reply_count          → count of replies
  └─ last_reply_at        → timestamp of latest reply

forum_thread_replies
  ├─ publication_id       → links to Lens publication
  ├─ thread_id            → links to parent thread
  ├─ position             → 1, 2, 3... (display order)
  ├─ content_json         → copied from metadata.contentJson attribute
  ├─ content_text         → plain text for search
  └─ author_address       → from publication.author
```

If Supabase is lost, everything can be rebuilt from Lens because:
- `commentOn` tells you which publications are replies to which root
- `contentJson` attribute in metadata has the full Plate.js JSON
- Timestamps give you ordering

---

## What Changes in Fountain vs. What Stays

### Stays Exactly The Same
- Plate.js editor (write articles)
- Publishing pipeline (draft → metadata → Grove → Lens)
- Article pages (/p/[user]/[post])
- Auth flow (wallet → Lens login → JWT)
- Supabase drafts system (autosave while writing)
- Grove storage (permanent content)
- All UI components (buttons, dialogs, toasts, etc.)

### Gets Added (New Code)
- Thread page route (`/thread/[id]`) — reads from Supabase, renders
  multiple contentJson blocks stacked vertically
- Board/category pages (`/boards`, `/boards/[feed]`) — list threads
  from Supabase, grouped by category
- Reply editor component — Plate.js editor embedded at the bottom of
  a thread page, publishes with `commentOn`
- Forum publish dialog — adds a category selector when creating a
  thread (instead of Fountain's blog selector)
- Supabase `forum_*` tables — mirror of thread structure
- Sync/recovery scripts — rebuild mirror from Lens if needed

### Gets Modified (Existing Code, Small Changes)
- Header/navigation — add forum links alongside existing nav
- Publish flow — when publishing a "thread", add `forumCategory`
  attribute to metadata and write to `forum_threads` table
- Middleware — add your domain to CORS allowlist

### Gets Deactivated (Not Deleted)
- Draft sharing / collaboration (already done)
- Blog-specific features (blog creation, blog themes, newsletter) —
  can be commented out or left dormant, they don't interfere

---

## The Path to Implementation

Given that this is a display layer on top of Fountain's existing
architecture, the implementation is cleaner than the original plan
suggested. The core work is:

1. **Database tables** — Create `forum_*` tables in Supabase
2. **Publish hook** — When a post is published, also write to
   `forum_threads` or `forum_thread_replies` (mirror the contentJson)
3. **Thread page** — New route that reads from Supabase and renders
   multiple `<Editor readOnly value={contentJson} />` stacked
4. **Board pages** — New routes that list threads from Supabase
5. **Reply flow** — Plate.js editor at bottom of thread, publishes
   with `commentOn`, writes to `forum_thread_replies`

That's the core. Everything else (voting, moderation, search, recovery)
is built on top of this foundation.

The key realization: you're not fighting Fountain's architecture. You're
using it exactly as designed (publish rich articles to Lens) and adding
a new way to browse them (stacked on thread pages instead of individual
article pages).

---

## Answering: "Do We See a Clear Path?"

Yes. The path is clear because:

1. Fountain already stores `contentJson` as a Lens metadata attribute
   on every publication. This is the data you need.

2. Fountain already has `<Editor readOnly value={contentJson} />` for
   rendering articles. You use the same component, just multiple times
   on one page.

3. Fountain already has the full Lens SDK wired up for publishing with
   `commentOn` (it's how their comment system works, just with
   lightweight comments instead of full articles).

4. Fountain already has Supabase with server/browser/service clients.
   You add new tables, not new infrastructure.

5. The forum UI (boards, thread lists, thread detail) is standard
   React/Next.js pages reading from Postgres. No new technology.

The only genuinely new thing is the publish-time mirror: when someone
publishes, you write the contentJson to your Supabase table in addition
to publishing to Lens. Everything else is either reusing Fountain's
existing code or writing standard Next.js pages.
