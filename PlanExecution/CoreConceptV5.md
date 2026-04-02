t# Core Concept V5: Society Protocol Forum

## What This Is

A fork of Fountain.ink that keeps the publishing infrastructure intact
but replaces the article-centric UX with a forum UX. Content is published
as Lens articles. The forum structure is a web2 display layer in Supabase.

---

## Clean Terminology

To avoid confusion between Lens primitives and forum concepts:

| Term | Meaning | Example |
|---|---|---|
| **Board** | Top-level section on landing page | "General Discussion", "Functions" |
| **Child-board** | Specific topic within a board | "Beginners & Help", "DAO Governance" |
| **Thread** | A conversation (Supabase UUID) | "How do I create a Lens account?" |
| **Entry** | A single post within a thread | Reply #3 by bob |
| **Category** | Research ONLY. One per topic. Colored box. | "Consensus", "Cryptography" |
| **Tag** | Research ONLY. Multiple per topic. | #hunting, #game-theory |
| **Lens Group** | Onchain container (Lens primitive) | Commons Group, Research Group |
| **Lens Feed** | Publication stream on a Group (Lens primitive) | Commons Feed, Research Feed |

"Category" is NEVER used for Commons boards. Commons uses "board" and
"child-board". This avoids confusion with Lens Feed (which is a real
Lens primitive) and with Research categories (which are a different thing).

---

## Lens Primitives Used

- **Lens Accounts** — user identity
- **Lens Groups** — organizational containers:
  - 1 Commons Group (open) — all main forum boards
  - 1 Research Group (token-gated posting) — research section
  - N Language Groups (self-governing) — language boards
- **Lens Publications** — every post is a standalone article
- **Lens Feeds** — one per Group, where publications land
- **Grove Storage** — permanent content
- **App Signer** — signless operations

NOT used: `commentOn`, Lens native comments, per-user blogs/feeds.

---

## How Publications Map to the Forum

All Commons child-boards publish to the SAME Lens Feed (the Commons
Group's Feed). The child-board separation ("Beginners" vs "DAO
Governance") is a Supabase-level filter, not a Lens-level separation.

On Lens, a post in "Beginners & Help" and a post in "DAO Governance"
look identical — both are articles in the Commons Feed. Only your
Supabase knows which child-board they belong to.

Same for Research: all research posts go to the Research Feed. The
category (Consensus, Cryptography, etc.) is stored in Supabase and
in the publication's metadata attributes for recovery.

---

## Commons Boards (BitcoinTalk-style)

### Landing Page Structure

```
/boards (homepage)

  Board: GENERAL DISCUSSION
    ├── Child-board: Beginners & Help
    ├── Child-board: 4 Key Concepts
    ├── Child-board: Web3 Outpost
    └── Child-board: DAO Governance

  Board: FUNCTIONS (VALUE SYSTEM)  [grid layout]
    ├── Child-board: Economic Game Theory
    ├── Child-board: Function Ideas
    ├── Child-board: Hunting
    ├── ... (11 total)
    └── Child-board: Communication

  Board: OTHERS
    ├── Child-board: Meta-discussion
    ├── Child-board: Politics & Society
    ├── Child-board: Economics
    ├── Child-board: Cryptocurrencies & Web3
    └── Child-board: Off-topic

  Board: PARTNER COMMUNITIES
    ├── Child-board: General Discussion
    ├── Child-board: Announcements
    ├── Child-board: Network States
    └── Child-board: Partner Badges & SPEC

  LANGUAGE BOARDS [community cards]
    ├── Español (own Lens Group)
    ├── Português (own Lens Group)
    └── 中文 (own Lens Group)
```

### Child-board Page

Click a child-board → see ONLY threads for that topic.
"+ New Thread" button appears here (not on landing page).
Thread list: Topic | Started by | Replies | Views | Activity.

### Thread Page

Stacked entries. Each entry rendered via `<Editor readOnly />`.
Each entry has a reply button (💬) that opens the composer with
a quote from that specific entry.

---

## Research Section (Discourse-style)

Separate area behind "🔒 Research" header button. Its own Lens Group.

### Key Differences from Commons

- **Single stream** — all topics visible at once (default)
- **Categories** — ONE per thread, colored box (Consensus, Cryptography,
  Architecture, State Machine, Account System, Security, Game Theory)
- **Tags** — multiple per thread, gray pills (#hunting, #zk, #economics)
- **Cross-pollination** — a thread tagged #cryptography + #consensus
  shows up in both filter views
- **Token-gated posting** — anyone reads, only token holders post

### Token Gating

Option A (recommended, start here): `TokenGatedFeedRule` on the
Research Feed. Anyone joins the Group (can read), only token holders
can publish to the Feed.

Option B (stricter): `TokenGatedGroupRule` on the Research Group
itself. Only token holders can even join.

Switching from A to B is one line in the setup script — just add
or change the rule. Both use the same Lens SDK pattern:

```ts
tokenGatedRule: {
  token: {
    currency: evmAddress("0xYourToken"),
    standard: TokenStandard.Erc20,
    value: bigDecimal("100"),
  },
}
```

Fountain has no token-gating code. This is new code, but it's just
a rule parameter when creating the Group or Feed — not a complex
feature to build.

---

## Composer (Discourse-Style Editor)

Full spec in `ComposerSpec.md`. Summary:

### Instead of Fountain's full-page editor:
- Bottom panel slides up (no page navigation)
- Dual-column: editor (left) + live preview (right)
- Title + child-board selector (Commons) or category + tags (Research)
- Compact toolbar at bottom
- Three states: minimized, half-screen, full-screen
- User can browse the forum while composing

### Quote-Reply:
- Each entry in a thread has a 💬 reply button
- Clicking it opens the composer with quoted text pre-inserted
- Future: select text in a post → floating "Quote" button appears

### MVP Composer:
- Bottom panel with Plate.js editor (no preview column yet)
- Title + child-board/category selector
- Quote-reply via reply button on each entry
- Add preview column and text-selection quoting later

### Porting from Discourse:
Clone `github.com/discourse/discourse` and ask Kiro to analyze:
- `components/composer-editor.gjs` — main composer
- `components/composer-body.gjs` — split-pane layout
- `components/quote-button.gjs` — quote-reply feature
- `models/composer.js` — state management

Use the spec to rebuild in React + Plate.js.

---

## Thread Model (Unchanged)

No `commentOn`. No Lens-level linking. Thread structure is pure Supabase.

Every publication is a standalone Lens article. The thread exists only
in `forum_threads` + `forum_thread_entries`. Recovery via metadata
attributes (`forumThreadId`, `forumPosition`, `forumChildBoard` or
`forumCategory`, `forumThreadTitle`).

---

## Fountain Feature Mapping

### Publish Dialog → Composer Panel
Fountain's 3-tab dialog (Article Details, Monetization, Distribution)
is replaced by the composer panel for forum posts. The Monetization
tab can be accessible via a settings icon in the composer for users
who want to enable collecting on their post.

### Article Page (`/p/[user]/[post]`)
Remove `CommentPreview`. Add link to thread if publication is part
of one. Clean standalone article.

### Header
- Logo → `/boards`
- Search stays
- "🔒 Research" button (links to `/research`)
- No "New Thread" on landing — appears inside child-board/research views
- DraftCreateButton: keep for standalone articles
- Notifications, UserMenu: keep

### Draft System — KEEP
Useful for thread openers (autosave while writing in composer).
Not used for replies.

### Blog Features — DORMANT
Not linked from forum nav. Code stays. Could repurpose blog pages
for Language Board community pages later.

### User Profile — ADD Forum Activity Tab
Query `forum_thread_entries` by author. Show threads started and
responses posted.

### Newsletter / Listmonk — REPURPOSE LATER
Thread watch notifications. Infrastructure stays, unused initially.

### Signless Experience — KEEP, ENCOURAGE
Essential for forum UX. Frequent posting without wallet popups.

---

## Routes

### New
```
/boards                              → Landing page
/boards/commons?board=[slug]         → Thread list for a child-board
/thread/[thread-id]                  → Thread page (stacked entries)
/research                            → Research section (single stream)
/research?category=[cat]&tag=[tag]   → Research filtered
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
/w/[id]                              → Editor (for standalone articles)
/settings/*                          → All settings pages
```

### Dormant
```
/b/[blog]/*                          → Blog pages (not linked)
/featured, /home                     → Redirect to /boards
```

---

## Supabase Tables

```
forum_threads:
  id, title, child_board (for commons) OR category (for research),
  feed ('commons' or 'research'), tags[],
  author_address, author_username, entry_count, last_entry_at,
  views_count, is_pinned, is_locked, created_at

forum_thread_entries:
  id, thread_id, publication_id, position,
  content_json, content_text, content_markdown,
  title, subtitle, cover_url,
  author_address, author_username,
  quoted_entry_id (nullable — links to the entry being replied to),
  created_at

forum_child_boards:
  slug, name, description, board, feed, display_order,
  thread_count, layout ('list' or 'grid')

forum_research_categories:
  slug, name, color, thread_count
```

Note: `forum_child_boards` replaces the old `forum_categories` table.
Research categories are a separate table because they serve a different
purpose (colored badges, one-per-thread) than child-boards (strict
topic separation).

---

## Implementation Priority

1. Supabase tables + seed data
2. Landing page (`/boards`)
3. Child-board thread list (`/boards/commons?board=beginners`)
4. Thread page (`/thread/[id]`) with stacked entries
5. Composer panel (MVP: bottom panel, no preview column)
6. Publish hook (after Lens publish → write to forum tables)
7. Reply flow with quote-reply
8. Remove CommentPreview from article pages
9. Research page (`/research`) with category + tag filters
10. Token gating for Research Feed
11. Composer preview column (dual-pane)
12. Recovery scripts
