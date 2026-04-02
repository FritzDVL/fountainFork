# Board Category Page — Visual Structure Specification

## What This Document Describes

This is the page a user sees after clicking a category on the landing page.
Example: clicking "Beginners & Help" from the GENERAL DISCUSSION section.

URL: `/boards/commons?category=beginners`

This page shows a list of threads (topics) within that category, and each
thread links to a thread detail page showing the full discussion.

This document covers BOTH views:
1. The thread list (the board category page itself)
2. The thread detail (what you see when you click a thread)

---

## View 1: Thread List Page

URL: `/boards/commons?category=beginners`

### Full Page Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (sticky)                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Boards / Beginners & Help                    ← breadcrumb      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Beginners & Help                        [+ New Thread]    │  │
│  │ New to the forum? Start here.                             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Topic                    │ Started by │Replies│Views│Active│  │
│  ├──────────────────────────┼────────────┼───────┼─────┼──────┤  │
│  │📌 Welcome to the forum  │ 🟢 alice   │  24   │ 340 │  2h  │  │
│  ├──────────────────────────┼────────────┼───────┼─────┼──────┤  │
│  │ How do I create a Lens   │ 🟢 bob     │   8   │ 120 │  5h  │  │
│  │ account?                 │            │       │     │      │  │
│  ├──────────────────────────┼────────────┼───────┼─────┼──────┤  │
│  │ What is GHO token?       │ 🟢 carol   │   3   │  45 │  1d  │  │
│  ├──────────────────────────┼────────────┼───────┼─────┼──────┤  │
│  │ First time posting here  │ 🟢 dave    │   1   │  22 │  3d  │  │
│  ├──────────────────────────┼────────────┼───────┼─────┼──────┤  │
│  │ Help with wallet setup   │ 🟢 eve     │   0   │  10 │  5d  │  │
│  └──────────────────────────┴────────────┴───────┴─────┴──────┘  │
│                                                                  │
│                       [Load More]                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Tree

```
ThreadListPage (server component)
├── Breadcrumb
│   └── "Boards" (link to /boards) / "Beginners & Help" (current, no link)
│
├── PageHeader
│   ├── <div> left side
│   │   ├── <h1> "Beginners & Help" (text-xl font-bold)
│   │   └── <p> "New to the forum? Start here." (text-sm text-muted-foreground)
│   └── <div> right side
│       └── <Link href="/w/new?mode=forum&category=beginners">
│           └── <Button> "+ New Thread"
│
└── ThreadTable
    ├── <thead>
    │   └── <tr> column headers: Topic | Started by | Replies | Views | Activity
    │
    ├── <tbody>
    │   ├── ThreadRow (pinned, has 📌 icon)
    │   ├── ThreadRow
    │   ├── ThreadRow
    │   ├── ThreadRow
    │   └── ThreadRow
    │
    └── LoadMoreButton (if more pages exist)
```

### Breadcrumb

```
┌──────────────────────────────────────────┐
│ Boards / Beginners & Help                │
└──────────────────────────────────────────┘
```

- "Boards" = `<Link href="/boards">` with `hover:underline`
- " / " = plain text separator, `text-muted-foreground`
- "Beginners & Help" = plain `<span>`, current page, no link
- Container: `text-sm text-muted-foreground mb-4`

### Page Header

```
┌──────────────────────────────────────────────────────────────┐
│ Beginners & Help                              [+ New Thread] │
│ New to the forum? Start here.                                │
└──────────────────────────────────────────────────────────────┘
```

- Container: `flex items-center justify-between mb-6`
- Left:
  - Title: `text-xl font-bold`
  - Description: `text-sm text-muted-foreground`
- Right:
  - Button: primary style, `gap-1.5`, Plus icon + "New Thread" text
  - Links to editor with category pre-selected

### Thread Table

This is the core of the page. A `<table>` with fixed column widths.

```
Column widths:
  Topic:      58%   (left-aligned)
  Started by: 12%   (center-aligned)
  Replies:    10%   (center-aligned)
  Views:      10%   (center-aligned)
  Activity:   10%   (center-aligned)
```

#### Table Header Row

```
┌──────────────────────────┬────────────┬───────┬─────┬────────┐
│ Topic                    │ Started by │Replies│Views│Activity│
└──────────────────────────┴────────────┴───────┴─────┴────────┘
```

- `<thead>` row
- Bottom border: `border-b-2 border-slate-400 dark:border-gray-500`
- Text: `text-xs font-medium uppercase tracking-wider text-gray-500`
- Column separators: vertical lines using CSS `::before` pseudo-elements
  (`before:border-l before:border-slate-300`)

#### Thread Row (Single Row)

```
┌──────────────────────────┬────────────┬───────┬─────┬────────┐
│                          │            │       │     │        │
│ 📌 Welcome to the forum │  🟢 alice  │  24   │ 340 │   2h   │
│                          │            │       │     │        │
└──────────────────────────┴────────────┴───────┴─────┴────────┘
```

Each row is a `<tr>` rendered by a ThreadRow component:

- **Topic cell** (58%):
  - Entire cell is a `<Link>` to `/thread/{rootPublicationId}`
  - If pinned: 📌 pin icon before title (or `<Pin>` lucide icon, `text-primary`)
  - If locked: 🔒 lock icon before title
  - Title: `text-lg font-medium text-slate-900 hover:text-blue-600`
  - On hover: text turns blue, underline optional

- **Started by cell** (12%):
  - `<Link>` to `/u/{username}`
  - Contains: small avatar (20x20, `h-5 w-5`) + username text
  - Avatar: circular, gradient fallback with first letter
  - Text: `text-sm text-gray-600`
  - Layout: `inline-flex items-center gap-1.5`

- **Replies cell** (10%):
  - Plain number, `text-sm text-gray-500 text-center`

- **Views cell** (10%):
  - Plain number, `text-sm text-gray-500 text-center`

- **Activity cell** (10%):
  - Relative time string: "2h", "5h", "1d", "3d", "Jan 15"
  - `text-sm text-gray-500 text-center`

- **Row styling**:
  - Border bottom: `border-b border-slate-300 dark:border-gray-600`
  - Hover: `hover:bg-slate-50 dark:hover:bg-gray-800/50`
  - Vertical padding: `py-5`

#### Empty State

When no threads exist in this category:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│           No posts yet. Be the first to create a post!       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Container: `rounded-lg border p-12 text-center`
- Text: `text-gray-600 dark:text-gray-400`

#### Load More Button

```
                       [Load More]
```

- Centered: `flex justify-center pt-6`
- Button: `rounded-lg border px-6 py-3 text-sm font-medium`
- Disabled state while loading: `disabled:opacity-50`
- Only visible if there are more pages (`nextCursor` exists)

### Mobile Behavior

On mobile (`< md`):
- Table columns "Started by", "Replies", "Views", "Activity" are hidden
- Only the Topic column is visible (full width)
- Thread title may wrap to 2 lines
- "New Thread" button shows icon only (no text)

---

## View 2: Thread Detail Page

URL: `/thread/{rootPublicationId}`

This is what the user sees after clicking a thread title from the list above.

### Full Page Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (sticky)                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Boards / Beginners & Help / Welcome to the forum   ← breadcrumb│
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 📌 Welcome to the forum                                   │  │
│  │ 24 replies · 340 views                                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ╔════════════════════════════════════════════════════════════╗  │
│  ║ ROOT POST (post #0)                                       ║  │
│  ║                                                           ║  │
│  ║  [avatar] alice · Original post · 3 days ago              ║  │
│  ║                                                           ║  │
│  ║  Welcome everyone! This is the place to ask your          ║  │
│  ║  first questions about Society Protocol.                  ║  │
│  ║                                                           ║  │
│  ║  ## Getting Started                                       ║  │
│  ║                                                           ║  │
│  ║  Here are some resources to help you:                     ║  │
│  ║  - Link to docs                                           ║  │
│  ║  - Link to tutorial                                       ║  │
│  ║  - **Bold text** and *italic* work here                   ║  │
│  ║                                                           ║  │
│  ║  ```js                                                    ║  │
│  ║  const hello = "code blocks too";                         ║  │
│  ║  ```                                                      ║  │
│  ║                                                           ║  │
│  ║  ▲ 12 ▼                                        [↗ link]  ║  │
│  ╠════════════════════════════════════════════════════════════╣  │
│  ║ REPLY #1                                                  ║  │
│  ║                                                           ║  │
│  ║  [avatar] bob · Reply #1 · 3 days ago                     ║  │
│  ║                                                           ║  │
│  ║  Thanks for this! I had a question about...               ║  │
│  ║                                                           ║  │
│  ║  ▲ 5 ▼                                         [↗ link]  ║  │
│  ╠════════════════════════════════════════════════════════════╣  │
│  ║ REPLY #2                                                  ║  │
│  ║                                                           ║  │
│  ║  [avatar] alice · Reply #2 · 2 days ago                   ║  │
│  ║                                                           ║  │
│  ║  Great question! Here's how it works:                     ║  │
│  ║                                                           ║  │
│  ║  > Blockquotes are supported                              ║  │
│  ║                                                           ║  │
│  ║  And here's an image:                                     ║  │
│  ║  [embedded image]                                         ║  │
│  ║                                                           ║  │
│  ║  ▲ 8 ▼                                         [↗ link]  ║  │
│  ╠════════════════════════════════════════════════════════════╣  │
│  ║                                                           ║  │
│  ║  ... more replies ...                                     ║  │
│  ║                                                           ║  │
│  ╠════════════════════════════════════════════════════════════╣  │
│  ║ REPLY EDITOR                                              ║  │
│  ║                                                           ║  │
│  ║  Write a reply                                            ║  │
│  ║  ┌────────────────────────────────────────────────────┐   ║  │
│  ║  │ [Plate.js rich text editor]                        │   ║  │
│  ║  │                                                    │   ║  │
│  ║  │ Bold, italic, headings, code, images, links...     │   ║  │
│  ║  │                                                    │   ║  │
│  ║  └────────────────────────────────────────────────────┘   ║  │
│  ║                                        [Post Reply]       ║  │
│  ╚════════════════════════════════════════════════════════════╝  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Tree

```
ThreadDetailPage (server component)
├── Breadcrumb
│   └── "Boards" / "Beginners & Help" (link) / thread title (current)
│
├── ThreadHeader
│   ├── <h1> thread title (text-2xl font-bold)
│   │   ├── Pin icon (if pinned)
│   │   └── Lock icon (if locked)
│   └── <div> "24 replies · 340 views" (text-sm text-muted-foreground)
│
├── ForumPostCard (ROOT POST — post #0)
│   ├── PostHeader
│   │   ├── Avatar (32x32)
│   │   ├── Author name (font-medium)
│   │   ├── "Original post" label
│   │   ├── Relative timestamp
│   │   └── External link icon (↗) → /publication/{id}
│   ├── PostContent
│   │   └── <Editor readOnly={true} value={contentJson} />
│   │       (full Plate.js rendering: headings, bold, italic,
│   │        code blocks, images, blockquotes, tables, embeds)
│   └── PostFooter
│       └── VoteButtons (▲ score ▼)
│
├── ForumPostCard (REPLY #1)
│   └── (same structure as root, but "Reply #1" instead of "Original post")
│
├── ForumPostCard (REPLY #2)
│   └── (same structure)
│
├── ... more ForumPostCards ...
│
└── ThreadReplyEditor (client component, hidden if thread is locked)
    ├── <h3> "Write a reply"
    ├── <Editor readOnly={false} /> (Plate.js in edit mode, compact)
    └── <Button> "Post Reply"
```

### Single Post Card (ForumPostCard) — Detailed

This component is used for BOTH the root post and every reply.
The only difference is the label ("Original post" vs "Reply #N").

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [avatar]  alice · Reply #2 · 2 days ago              [↗]   │  ← header
│                                                              │
│  Great question! Here's how it works:                        │  ← content
│                                                              │     (rendered by
│  > Blockquotes are supported                                 │      Plate.js in
│                                                              │      readOnly mode)
│  And here's an image:                                        │
│  ┌──────────────────────────────┐                            │
│  │        [image]               │                            │
│  └──────────────────────────────┘                            │
│                                                              │
│  ▲ 8 ▼                                                      │  ← footer (votes)
│                                                              │
├──────────────────────────────────────────────────────────────┤  ← border-b divider
```

#### Post Header
- Container: `flex items-center justify-between mb-4`
- Left group: `flex items-center gap-3`
  - Avatar: `w-8 h-8 rounded-full` (image or gradient fallback)
  - Author name: `text-sm font-medium`
  - Label: `text-xs text-muted-foreground` — "Original post" or "Reply #N"
  - Separator: `·`
  - Timestamp: `text-xs text-muted-foreground` — relative time
- Right: External link icon `<ExternalLink className="h-4 w-4" />`
  - Links to `/publication/{publicationId}` (standalone view)
  - `text-muted-foreground hover:text-foreground`

#### Post Content
- Container: `prose prose-sm max-w-none`
- Rendered by: `<Editor readOnly={true} value={contentJson} showToc={false} />`
- This is fountain.ink's Plate.js editor in read-only mode
- Supports ALL rich formatting:
  - Headings (h1–h6)
  - Bold, italic, underline, strikethrough
  - Bullet lists, numbered lists
  - Blockquotes
  - Code blocks (with syntax highlighting)
  - Inline code
  - Images (full width, with captions)
  - Links
  - Tables
  - Horizontal rules
  - Embeds (iframes)

#### Post Footer
- Container: `flex items-center gap-2 mt-4 text-sm text-muted-foreground`
- Upvote button: `<ArrowUp className="h-4 w-4" />`, clickable
- Score: `font-medium` — number (upvotes minus downvotes)
- Downvote button: `<ArrowDown className="h-4 w-4" />`, clickable
- Active vote state: the arrow the user clicked turns `text-primary`

#### Divider
- `border-b` between each post card
- First card has no top padding (`first:pt-0`)
- Each card: `py-6`

### Reply Editor (Bottom of Thread)

Only visible if the thread is NOT locked.

```
┌──────────────────────────────────────────────────────────────┐
│ Write a reply                                                │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │                                                          │ │
│ │  [Plate.js editor — same capabilities as root posts]     │ │
│ │                                                          │ │
│ │  Toolbar: B I U H1 H2 • — "" <> 🖼 🔗                  │ │
│ │                                                          │ │
│ │  Type here...                                            │ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│                                           [Post Reply]       │
└──────────────────────────────────────────────────────────────┘
```

- Container: `border rounded-lg p-4 mt-6`
- Title: `text-sm font-medium mb-3` — "Write a reply"
- Editor: `min-h-[200px] border rounded mb-3`
  - Full Plate.js editor in edit mode
  - Same plugins/capabilities as root post editor
  - Toolbar visible (floating or fixed, depending on fountain's config)
- Button: `<Button>` aligned right — "Post Reply"
  - Disabled when editor is empty or publishing
  - Shows "Publishing..." during submission

---

## Data Flow: Thread List → Thread Detail

```
User is on landing page (/boards)
  │
  ├─ Clicks "Beginners & Help" category row
  │
  ▼
Thread List Page (/boards/commons?category=beginners)
  │
  │  Data: SELECT * FROM forum_threads
  │        WHERE category = 'beginners' AND is_hidden = false
  │        ORDER BY is_pinned DESC, last_reply_at DESC
  │
  ├─ Clicks thread title "Welcome to the forum"
  │
  ▼
Thread Detail Page (/thread/{rootPublicationId})
  │
  │  Data: SELECT * FROM forum_threads WHERE root_publication_id = $1
  │        SELECT * FROM forum_thread_replies WHERE thread_id = $1
  │                                           ORDER BY position ASC
  │
  │  Content: Each post's content_json loaded from Supabase cache
  │           (or fetched from Lens API as fallback)
  │
  ├─ User writes reply in Plate.js editor
  ├─ Clicks "Post Reply"
  │
  ▼
Reply Published
  │
  │  1. Article metadata built (contentJson + markdown)
  │  2. Uploaded to Grove → contentUri
  │  3. Published to Lens with commentOn: rootPublicationId
  │  4. Tracked in forum_thread_replies (position = reply_count + 1)
  │  5. Thread reply_count and last_reply_at updated
  │  6. Page refreshes, new reply appears at bottom
```

---

## Responsive Behavior

| Element | Desktop (lg+) | Tablet (md) | Mobile (<md) |
|---|---|---|---|
| Thread table columns | All 5 visible | All 5 visible | Topic only |
| Thread title | Single line | May wrap | May wrap to 2 lines |
| "New Thread" button | Icon + text | Icon + text | Icon only |
| Post card avatar | 32x32 | 32x32 | 28x28 |
| Post content images | Full width | Full width | Full width |
| Reply editor | Full toolbar | Full toolbar | Floating toolbar |
| Vote buttons | Visible | Visible | Visible |
| Breadcrumb | Full path | Full path | Shortened |
