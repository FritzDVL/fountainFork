# Core Concept V4: Society Protocol Forum

## What This Is

A fork of Fountain.ink that keeps the publishing infrastructure intact
but replaces the article-centric UX with a forum UX. Content is published
as Lens articles. The forum structure is a web2 display layer in Supabase.

---

## Lens Primitives Used

Minimal. Same as Fountain but repurposed.

- **Lens Accounts** — user identity
- **Lens Groups** — organizational containers (Fountain calls them "blogs")
  - 1 Commons Group — open, for the main forum boards
  - 1 Research Group — token-gated, Discourse-style research area
  - N Language Groups — self-governing community boards
- **Lens Publications** — every post is a standalone article
- **Grove Storage** — permanent content
- **App Signer** — signless operations

NOT used: `commentOn`, Lens native comments, per-user feeds/blogs.

---

## Two Distinct Forum Experiences

### Commons Boards (BitcoinTalk-style)

The landing page. Traditional board layout. You click a category and
see ONLY threads for that topic. Strict separation by category.

```
Landing page (/boards):
  General Discussion
    → Beginners & Help        ← click → see only Beginners threads
    → 4 Key Concepts          ← click → see only Key Concepts threads
    → DAO Governance           ← click → see only Governance threads
  Functions (Value System)
    → Economic Game Theory     ← click → see only Game Theory threads
    → Hunting                  ← click → see only Hunting threads
  Others
    → Off-topic               ← click → see only Off-topic threads
  Partner Communities
    → Announcements            ← click → see only Announcements threads
  Language Boards
    → Español                  ← click → see only Spanish threads
```

Each category is a filtered view. When you're in "Beginners & Help",
you see ONLY threads tagged with that category. The "New Thread" button
appears inside each category view, not on the landing page.

All Commons boards post to the same Lens Feed (Commons Group's Feed).
The category is a Supabase-level filter, not a Lens-level separation.

### Research Section (Discourse-style)

A separate area behind the "🔒 Research" button in the header. This
is its own Lens Group with token-gating.

Unlike the Commons boards, Research is a single stream where ALL
topics mix together. Categories and tags exist for filtering, but
the default view shows everything — like ethresear.ch or any
Discourse instance. This encourages cross-pollination between
Architecture, Cryptography, Game Theory, etc.

```
Research page (/research):
  All threads in one stream, newest activity first
  Filter by tag: [Architecture] [Consensus] [Cryptography] [All]

  Thread: "ZK proof optimization for state transitions"
    tags: cryptography, state-machine
  Thread: "Proof of Hunt consensus analysis"
    tags: consensus, game-theory
  Thread: "Account abstraction proposal"
    tags: account-system, security
```

Token-gating: you can READ everything, but to POST you need to hold
a specific token (configured via `TokenGatedFeedRule` on the Research
Group's Feed).

---

## Token Gating (Research Group)

Fountain has zero token-gating code. We add it for the Research Group.

From the Lens Protocol docs, there are two approaches:

### Option A: Token-Gated Feed Rule (recommended)
Gate the Feed, not the Group. Anyone can join the Research Group
(to follow discussions), but only token holders can post.

```ts
// When creating the Research Feed:
const result = await createFeed(sessionClient, {
  metadataUri: uri(feedMetaUri),
  admins: [evmAddress(ADMIN)],
  rules: {
    required: [
      {
        tokenGatedRule: {
          token: {
            currency: evmAddress("0xYourToken..."),
            standard: TokenStandard.Erc20,  // or Erc721
            value: bigDecimal("100"),        // minimum balance
          },
        },
      },
    ],
  },
});
```

### Option B: Token-Gated Group Rule
Gate the Group itself. Only token holders can join, and only members
can post (via GroupGatedFeedRule on the Feed).

```ts
// When creating the Research Group:
const result = await createGroup(sessionClient, {
  metadataUri: uri(groupMetaUri),
  rules: {
    required: [
      {
        tokenGatedRule: {
          token: {
            currency: evmAddress("0xYourToken..."),
            standard: TokenStandard.Erc20,
            value: bigDecimal("100"),
          },
        },
      },
    ],
  },
});
```

Option A is better for your case — let everyone read, restrict posting.

### UI Handling
When a non-token-holder tries to post in Research, the Lens SDK returns
an error from the Feed rule check. The UI catches this and shows:
"You need to hold X tokens to post in the Research section."

---

## Landing Page Structure

See `landing-mockup-v2.html` for the visual.

**Header:** Logo → Search → "🔒 Research" button → Notifications → Avatar
(No "New Thread" on landing — that appears inside each category)

**Boards (top to bottom):**
1. General Discussion (list — 4 categories)
2. Functions / Value System (grid — 11 category cards)
3. Others (list — 5 categories)
4. Partner Communities (list — 4 categories)
5. Language Boards (community cards — each its own Lens Group)

**No sidebar.** Clean single-column layout, max-width 960px.

**No Technical/Research section on this page.** Research is a separate
area accessed via the header button.

---

## How Boards Work (Category → Thread List → Thread)

### Click a category on the landing page:

```
/boards/commons?category=beginners

┌─────────────────────────────────────────────┐
│ ← Boards / Beginners & Help    [+ New Thread]│
├─────────────────────────────────────────────┤
│                                              │
│ 📌 Welcome! Read this first                  │
│    by admin · 12 replies · 2d ago            │
│                                              │
│ How do I set up my first wallet?             │
│    by alice · 5 replies · 3h ago             │
│                                              │
│ What's the difference between L1 and L2?     │
│    by bob · 8 replies · 1d ago               │
│                                              │
│ Confused about gas fees                      │
│    by carol · 2 replies · 4h ago             │
│                                              │
└─────────────────────────────────────────────┘
```

This shows ONLY threads in the "beginners" category. The "New Thread"
button is here, not on the landing page. Clicking it opens the editor.

### Click a thread:

```
/thread/abc-123

┌─────────────────────────────────────────────┐
│ ← Beginners & Help                          │
│                                              │
│ How do I set up my first wallet?             │
│ by alice · 3h ago                            │
├─────────────────────────────────────────────┤
│                                              │
│ [Full rich article content rendered via       │
│  Plate.js editor in readOnly mode.            │
│  Images, code blocks, headings, etc.]         │
│                                              │
├─────────────────────────────────────────────┤
│ Reply #1 by bob · 2h ago                     │
│                                              │
│ [Another full rich article, stacked below]    │
│                                              │
├─────────────────────────────────────────────┤
│ Reply #2 by carol · 1h ago                   │
│                                              │
│ [Another full rich article]                   │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│ [Reply Editor — Plate.js, compact mode]       │
│ [                                    Post]    │
│                                              │
└─────────────────────────────────────────────┘
```

Each entry is a full Lens publication's contentJson rendered via
`<Editor readOnly value={contentJson} />`. All content comes from
Supabase. Zero Lens API calls.

---

## How Research Works (Discourse-style)

### Click "🔒 Research" in header:

```
/research

┌─────────────────────────────────────────────┐
│ 🔒 Research                    [+ New Thread]│
│                                              │
│ [All] [Architecture] [Consensus] [Crypto]    │
│ [Game Theory] [Security] [Account System]    │
├─────────────────────────────────────────────┤
│                                              │
│ ZK proof optimization for state transitions  │
│    by researcher1 · tags: cryptography,      │
│    state-machine · 4 replies · 1h ago        │
│                                              │
│ Proof of Hunt consensus analysis             │
│    by researcher2 · tags: consensus,         │
│    game-theory · 12 replies · 3h ago         │
│                                              │
│ Account abstraction proposal                 │
│    by researcher3 · tags: account-system,    │
│    security · 7 replies · 6h ago             │
│                                              │
└─────────────────────────────────────────────┘
```

Key differences from Commons boards:
- **Single stream** — all topics visible at once (default view)
- **Tag filters** — click a tag to filter, but default is "All"
- **Cross-pollination** — a thread can have multiple tags spanning
  different disciplines
- **Token-gated posting** — anyone can read, only token holders post
- **Thread pages** — identical to Commons threads (stacked entries)

This is the ethresear.ch / Discourse model.

---

## Thread Model (Unchanged from V3)

No `commentOn`. No Lens-level linking. Thread structure is pure Supabase.

Every publication is a standalone Lens article. The thread exists only
in `forum_threads` + `forum_thread_entries`. Recovery via metadata
attributes (`forumThreadId`, `forumPosition`, `forumCategory`,
`forumThreadTitle`).

---

## Fountain Feature Mapping

### Publish Dialog

The 3-tab dialog that opens when you click Publish in the editor:

- **Tab 1: Article Details** — title, subtitle, cover, slug, tags.
  KEEP. Title becomes thread title for openers.
- **Tab 2: Monetization** — collecting settings. KEEP as-is.
- **Tab 3: Distribution** — currently has BlogSelectMenu (dropdown
  to pick which blog to publish to) + newsletter + Lens display.
  MODIFY: replace BlogSelectMenu with category selector for Commons
  boards, or tag selector for Research. Hide newsletter checkbox
  (repurpose later for thread notifications).

### Article Page (`/p/[user]/[post]`)

REMOVE `CommentPreview`. ADD link to thread if publication is part
of one. Everything else stays.

### Header

- Logo links to `/boards`
- Search stays
- ADD "🔒 Research" button (links to `/research`)
- "New Thread" button NOT on landing page — appears inside category
  views and research view
- DraftCreateButton: keep for creating drafts from anywhere
- Notifications, UserMenu: keep

### Draft System — KEEP

Useful for writing thread openers. Autosave, resume later, draft list.
Not used for replies (those are local state).

### Blog Features — DORMANT

Blog pages (`/b/[blog]`), blog creation, blog settings, blog themes:
not linked from forum navigation but not deleted. The code stays.
Could repurpose blog pages for Language Board community pages later.

### User Profile — ADD Forum Activity Tab

Query `forum_thread_entries` by author. Show threads started and
responses posted. Links to thread pages.

### Newsletter / Listmonk — REPURPOSE LATER

Thread watch notifications: "email me when someone responds."
Infrastructure stays, unused initially.

### Feed Pages — REDIRECT

`/featured` and `/home` redirect to `/boards`.

### Signless Experience — KEEP, ENCOURAGE

Essential for forum UX. Users post frequently. Signing every action
with wallet would be terrible. Signless mode = sign once, then
everything is seamless.

---

## Routes

### New
```
/boards                              → Landing page (board sections)
/boards/commons?category=[slug]      → Thread list for a category
/thread/[thread-id]                  → Thread page (stacked entries)
/research                            → Research section (Discourse-style)
/research?tag=[tag]                  → Research filtered by tag
```

### Modified
```
/                                    → Redirect to /boards
/p/[user]/[post]                     → Article page (no comments)
/u/[user]                            → Profile (add forum activity)
/search                              → Add thread search
```

### Kept
```
/w/[id]                              → Editor
/settings/*                          → All settings pages
```

### Dormant
```
/b/[blog]/*                          → Blog pages (not linked)
/featured, /home                     → Redirect to /boards
```

---

## Lens Groups Summary

| Group | Purpose | Gating | Feed Rule |
|---|---|---|---|
| Commons | Main forum boards (General, Functions, Others, Partners) | Open (membershipApproval or open join) | GroupGatedFeedRule → Commons Group |
| Research | Research section (Discourse-style) | Open to join (read) | TokenGatedFeedRule (post requires token) |
| Language N | Per-language community board | Managed by community moderators | GroupGatedFeedRule → that Language Group |

---

## Supabase Tables

```
forum_threads:
  id, title, category, feed, section ('commons' or 'research'),
  author_address, author_username, entry_count, last_entry_at,
  views_count, is_pinned, is_locked, tags[], created_at

forum_thread_entries:
  id, thread_id, publication_id, position,
  content_json, content_text, content_markdown,
  title, subtitle, cover_url,
  author_address, author_username, created_at

forum_categories:
  slug, name, description, section, feed, display_order,
  thread_count, layout ('list' or 'grid')
```

Research threads use `tags[]` on `forum_threads` for filtering.
Commons threads use `category` for strict board separation.

---

## Implementation Priority

Minimum viable forum:
1. Supabase tables + category seed data
2. Landing page (`/boards`) — sections, categories, stats
3. Category thread list (`/boards/commons?category=X`)
4. Thread page (`/thread/[id]`) — stacked entries from Supabase
5. Publish hook — after Lens publish, write to forum tables
6. Reply flow — compact editor at bottom of thread page
7. Remove CommentPreview from article pages
8. Research page (`/research`) — single stream with tag filters
9. Token gating for Research Group/Feed
10. Recovery scripts (rebuild from Lens metadata attributes)
