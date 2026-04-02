# Research Section — Visual Structure Specification

## What This Document Describes

The Research section is a Discourse-style discussion area for technical
topics. It differs from the Boards section in three key ways:

1. It has a **filter toolbar** (category dropdown + tag dropdown + "Latest" tab)
2. Thread rows show a **colored category badge + tags** below the title
3. The thread detail view uses a **numbered post format** (#1, #2, #3...)
   with heart reactions, permalink buttons, and a quote-reply feature

This document covers:
1. The Research thread list page (with filter toolbar)
2. The Research thread detail page (Discourse-style numbered posts)

---

## View 1: Research Thread List

URL: `/research` (or in the new architecture: `/boards/research`)

### Full Page Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (sticky)                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Society Protocol Research                                       │
│  Technical research and discussion                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ [All Categories ▾]  [All Tags ▾]  Latest    [+ New Topic]│    │ ← toolbar
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Topic                    │ Started by │Replies│Views│Active│   │
│  ├──────────────────────────┼────────────┼───────┼─────┼──────┤  │
│  │ Proof of Hunt consensus  │ 🟢 alice   │  12   │ 230 │  3h  │  │
│  │ 🟠 Consensus  #hunting   │            │       │     │      │  │
│  ├──────────────────────────┼────────────┼───────┼─────┼──────┤  │
│  │ State machine formal     │ 🟢 bob     │   5   │  89 │  1d  │  │
│  │ verification approach    │            │       │     │      │  │
│  │ 🟣 State Machine         │            │       │     │      │  │
│  ├──────────────────────────┼────────────┼───────┼─────┼──────┤  │
│  │ ZK-SNARK integration     │ 🟢 carol   │   8   │ 145 │  2d  │  │
│  │ 🔴 Cryptography  #zk     │            │       │     │      │  │
│  ├──────────────────────────┼────────────┼───────┼─────┼──────┤  │
│  │ Economic incentive model │ 🟢 dave    │   3   │  67 │  4d  │  │
│  │ 🔵 Architecture  #econ   │            │       │     │      │  │
│  └──────────────────────────┴────────────┴───────┴─────┴──────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Tree

```
ResearchPage (server component)
├── PageHeader
│   ├── <h1> "Society Protocol Research" (text-3xl font-bold)
│   └── <p> "Technical research and discussion" (text-gray-600)
│
└── ResearchThreadList (client component)
    ├── FilterToolbar
    │   ├── CategoryDropdown (custom dropdown, not <select>)
    │   ├── TagDropdown (custom dropdown)
    │   ├── LatestTab (text button, underline when active)
    │   └── NewTopicButton (right-aligned, gradient style)
    │
    └── ThreadTable
        ├── <thead> (same 5-column layout as Boards)
        └── <tbody>
            ├── ResearchThreadRow (with category badge + tags)
            ├── ResearchThreadRow
            └── ...
```

### Filter Toolbar — Detailed

```
┌──────────────────────────────────────────────────────────────┐
│ [🟠 Consensus ▾]  [#hunting ▾]  Latest           [+ New Topic]│
└──────────────────────────────────────────────────────────────┘
```

The toolbar is a horizontal row: `flex items-center gap-3 mb-6`

#### Category Dropdown

```
┌─────────────────────┐
│ All Categories    ▾ │  ← closed state
└─────────────────────┘
        │
        ▼ (when clicked)
┌─────────────────────────┐
│ All Categories          │  ← option (bold blue if active)
│ 🔵 Architecture    × 8  │  ← colored square + name + count
│ 🟣 State Machine   × 3  │
│ 🟢 Objects         × 5  │
│ 🟠 Consensus       × 4  │
│ 🔴 Cryptography    × 6  │
│ 🔵 Account System  × 2  │
│ 🟡 Security        × 1  │
└─────────────────────────┘
```

- Trigger button: `rounded-lg border px-3 py-2 text-sm font-medium`
- Dropdown panel: `absolute z-20 mt-1 w-64 rounded-lg border shadow-lg`
- Each option: `flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50`
- Color squares: `inline-block h-3 w-3 rounded-sm` with category-specific colors:
  - architecture: `bg-blue-500`
  - state-machine: `bg-purple-500`
  - objects: `bg-emerald-500`
  - consensus: `bg-orange-500`
  - cryptography: `bg-red-500`
  - account-system: `bg-cyan-500`
  - security: `bg-yellow-500`
- Count: `text-xs text-gray-400` — "× 8"
- Active option: `font-semibold text-blue-600`

#### Tag Dropdown

Same visual structure as category dropdown but:
- Shows `#tagname` format
- Color squares are all `bg-gray-400` (no per-tag colors)
- Default tags: Hunting, Property, Parenting, Governance, Organizations,
  Curation, Farming, Portal, Communication
- Plus any user-created tags from the database

#### Latest Tab

- Text button: `text-sm font-medium`
- Active state: `text-blue-600` with a `h-0.5 w-full bg-blue-600` underline bar
- Inactive: `text-gray-500 hover:text-gray-700`
- Clicking "Latest" clears both category and tag filters

#### New Topic Button

- Right-aligned: `ml-auto`
- Style: gradient button (primary color)
- Content: Plus icon + "New Topic"
- Links to the editor with research mode pre-selected

### Research Thread Row — Detailed

The key difference from Board thread rows: a second line below the title
showing the category badge and tags.

```
┌──────────────────────────┬────────────┬───────┬─────┬────────┐
│                          │            │       │     │        │
│ Proof of Hunt consensus  │  🟢 alice  │  12   │ 230 │   3h   │
│ 🟠 Consensus  #hunting   │            │       │     │        │
│                          │            │       │     │        │
└──────────────────────────┴────────────┴───────┴─────┴────────┘
```

- **Line 1** (title): same as Board rows — `text-lg font-medium`, link to thread
- **Line 2** (metadata): `mt-1 flex items-center gap-3`
  - Category badge: colored square (`h-3 w-3`) + category name (`text-sm text-slate-700`)
  - Tags: gray square (`h-2.5 w-2.5 bg-gray-400`) + `#tagname` (`text-sm text-gray-500`)
- Rest of columns: identical to Board thread rows

---

## View 2: Research Thread Detail

URL: `/research/thread/{lensPostId}` (or `/thread/{lensPostId}` in new arch)

This is the Discourse-style view. Each post is numbered and has
heart reactions, permalink, and quote-reply buttons.

### Full Page Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (sticky)                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Proof of Hunt consensus mechanism                               │
│  🟠 Consensus  #hunting  💬 12 posts  👁 230 views               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  [avatar] Alice · @alice · 3 days ago                 #1   │  │
│  │                                                            │  │
│  │  This paper proposes a novel consensus mechanism based     │  │
│  │  on the concept of "Proof of Hunt"...                      │  │
│  │                                                            │  │
│  │  ## Abstract                                               │  │
│  │                                                            │  │
│  │  The mechanism works by requiring validators to            │  │
│  │  demonstrate resource discovery capabilities...            │  │
│  │                                                            │  │
│  │  ```python                                                 │  │
│  │  def validate_hunt(proof):                                 │  │
│  │      return verify_resource(proof.target)                  │  │
│  │  ```                                                       │  │
│  │                                                            │  │
│  │                              ♡ 8    🔗    💬 Reply         │  │
│  │                                                            │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  [avatar] Bob · @bob · 2 days ago                     #2   │  │
│  │                                                            │  │
│  │  Interesting approach! How does this compare to             │  │
│  │  Proof of Stake in terms of energy efficiency?             │  │
│  │                                                            │  │
│  │                              ♡ 3    🔗    💬 Reply         │  │
│  │                                                            │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  [avatar] Alice · @alice · 2 days ago                 #3   │  │
│  │                                                            │  │
│  │  > Interesting approach! How does this compare to          │  │
│  │  > Proof of Stake in terms of energy efficiency?           │  │
│  │                                                            │  │
│  │  Great question. The key difference is...                  │  │
│  │                                                            │  │
│  │                              ♡ 5    🔗    💬 Reply         │  │
│  │                                                            │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  REPLY EDITOR                                              │  │
│  │                                                            │  │
│  │  [avatar]  ┌──────────────────────────────────────────┐    │  │
│  │            │ [Rich text editor]                        │    │  │
│  │            │                                          │    │  │
│  │            └──────────────────────────────────────────┘    │  │
│  │                                          [Post Response]   │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Tree

```
ResearchThreadPage (server component)
├── ThreadHeader
│   ├── <h1> thread title (text-3xl font-bold)
│   └── MetadataRow
│       ├── CategoryBadge (rounded-full bg-blue-100 px-2 py-0.5 text-xs)
│       ├── TagBadges (rounded-full bg-slate-100 px-2 py-0.5 text-xs)
│       ├── PostCount (MessageSquare icon + "12 posts")
│       └── ViewCount (Eye icon + "230 views")
│
└── <div className="rounded-lg border bg-white dark:bg-gray-800">
    ├── ResearchPost (#1 — root post)
    ├── ResearchPost (#2 — reply)
    ├── ResearchPost (#3 — reply with quote)
    ├── ... more posts ...
    └── ResearchReplyEditor
```

### Single Research Post — Detailed

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [avatar] Alice · @alice · 3 days ago                   #1   │  ← header
│                                                              │
│  This paper proposes a novel consensus mechanism based       │  ← content
│  on the concept of "Proof of Hunt"...                        │
│                                                              │
│  ## Abstract                                                 │
│                                                              │
│  The mechanism works by requiring validators to              │
│  demonstrate resource discovery capabilities...              │
│                                                              │
│  ```python                                                   │
│  def validate_hunt(proof):                                   │
│      return verify_resource(proof.target)                    │
│  ```                                                         │
│                                                              │
│                                    ♡ 8    🔗    💬 Reply     │  ← action bar
│                                                              │
├──────────────────────────────────────────────────────────────┤  ← border-b
```

#### Post Header
- Container: `mb-3 flex items-center justify-between`
- Left group: `flex items-center gap-3`
  - Avatar: circular, linked to profile (`AvatarProfileLink` component)
  - Display name: `font-medium text-gray-700` (e.g., "Alice")
  - Username: `text-sm text-gray-500` (e.g., "@alice")
  - Separator: `·` in `text-gray-400`
  - Timestamp: `text-sm text-gray-500` — relative time
- Right: Post number `#1` — `text-sm font-medium text-gray-400`

#### Post Content
- Container: `prose prose-slate max-w-none dark:prose-invert`
- Rendered by: `ContentRenderer` component (or Plate.js readOnly in new arch)
- Supports: headings, bold, italic, code blocks, images, blockquotes, links, lists

#### Quoted Text (when replying to a specific post)
When a post quotes another post, it shows as a blockquote:
```
│  > Interesting approach! How does this compare to
│  > Proof of Stake in terms of energy efficiency?
│
│  Great question. The key difference is...
```
- Blockquote styling: left border, muted background, italic text

#### Action Bar
- Container: `mt-4 flex items-center justify-end gap-1`
- All buttons: `variant="ghost" size="sm"` with `text-xs`
- **Heart button**: `♡` icon + count
  - Default: `text-gray-500 hover:text-red-500`
  - Active (user has hearted): `text-red-500 fill-current`
  - Count only shown if > 0
- **Permalink button**: `🔗` link icon
  - Copies `#post-{number}` URL to clipboard
  - Shows toast "Link copied!"
- **Reply button**: `💬` icon + "Reply" text
  - Scrolls to reply editor
  - Pre-fills editor with quoted text from this post

#### Divider
- `border-b border-slate-200 dark:border-gray-700`
- Last post: `last:border-b-0`
- Each post: `p-6`

### Reply Editor — Detailed

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [avatar]  ┌──────────────────────────────────────────────┐  │
│            │                                              │  │
│            │  [Rich text editor with toolbar]              │  │
│            │                                              │  │
│            │  > Quoted text appears here when              │  │
│            │  > user clicks Reply on a post               │  │
│            │                                              │  │
│            │  Type your response...                        │  │
│            │                                              │  │
│            └──────────────────────────────────────────────┘  │
│                                                              │
│                                          [Post Response]     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Container: `border-t border-slate-200 p-6 dark:border-gray-700`
- Layout: `flex items-start gap-3`
- Left: User's avatar (`h-10 w-10`)
- Right: `flex-1 space-y-3`
  - Editor: rich text editor (TextEditor component or Plate.js)
  - Submit button: right-aligned, gradient style, Send icon + "Post Response"
  - Disabled when empty or submitting
  - Shows "Posting..." during submission
- **Not logged in state**: replaces editor with centered message:
  "Sign in to participate in this discussion." in a muted card

### Quote-Reply Flow

```
User clicks "Reply" on post #2
  ↓
Editor scrolls into view (smooth scroll)
  ↓
Quoted text inserted at top of editor:
  > "Interesting approach! How does this compare to
  > Proof of Stake in terms of energy efficiency?"
  > — Bob
  ↓
User types their response below the quote
  ↓
Clicks "Post Response"
  ↓
New post appears as #4 with the blockquote visible
```

---

## Key Differences: Research vs Boards

| Aspect | Boards (General) | Research |
|---|---|---|
| Filter toolbar | None (category is in URL) | Category dropdown + Tag dropdown + Latest |
| Thread row line 2 | None | Colored category badge + tag badges |
| Category colors | None | Per-category color squares |
| Post numbering | "Reply #N" | "#N" (right-aligned, prominent) |
| Reactions | ▲ score ▼ (upvote/downvote) | ♡ heart (single reaction) |
| Quote-reply | Not available | Click Reply → quote inserted in editor |
| Permalink | External link icon | 🔗 copies #post-N anchor URL |
| Reply editor | Plate.js (full, standalone) | Rich text with avatar beside it |
| Thread header | Title + reply/view counts | Title + category badge + tags + counts |
| Visual tone | Standard forum | Academic/research feel |

---

## Responsive Behavior

| Element | Desktop (lg+) | Tablet (md) | Mobile (<md) |
|---|---|---|---|
| Filter toolbar | All inline | Wraps to 2 rows | Stacks vertically |
| Thread table columns | All 5 | All 5 | Topic only |
| Category badge in row | Visible | Visible | Visible |
| Post number (#N) | Right-aligned | Right-aligned | Right-aligned |
| Action bar (♡ 🔗 💬) | Right-aligned | Right-aligned | Right-aligned |
| Reply editor avatar | Visible (40x40) | Visible | Hidden |
| Quote text | Full width | Full width | Full width |
