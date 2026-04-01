# Core Concept V3: Society Protocol Forum

## What This Is

A fork of Fountain.ink that keeps the entire publishing infrastructure
intact but replaces the article-centric UX with a forum UX. Content is
still published as Lens articles. The forum structure (threads, boards,
categories) is a web2 display layer stored in Supabase.

---

## Lens Primitives Used

Fountain keeps it simple. So do we.

### What Fountain Uses
- **Lens Accounts** — user identity (wallet + username)
- **Lens Groups** — each "blog" is a Group (with a Feed attached)
- **Lens Publications** — articles, published to a Group's Feed
- **Grove Storage** — permanent content storage (contentUri)
- **App Signer** — signs operations on behalf of users

That's it. No complex primitive orchestration.

### What We Use
- **Lens Accounts** — same, unchanged
- **Lens Groups** — repurposed. Instead of personal blogs, we have:
  - 1 Commons Group (open, for general discussion boards)
  - 1 Research Group (token-gated, for research section)
  - N Language Community Groups (each self-governing)
- **Lens Publications** — same. Every post is a standalone article.
- **Grove Storage** — same, unchanged
- **App Signer** — same, unchanged

### What We Do NOT Use
- **Lens `commentOn`** — dropped. Thread structure is in Supabase only.
- **Lens native comments** — dropped. No comments on individual
  publication pages. Responses happen in threads.
- **Multiple Feeds per user** — dropped. Users don't have personal
  blogs/feeds. They post to the Commons or Research feed.

---

## Thread Model (No commentOn, No Root)

A thread is a Supabase row. It groups publications by position.

There is no "root post" in the Lens sense. There is no `commentOn`.
Every publication in a thread is an identical standalone Lens article.
The only thing that makes the first one special is that it has
`position: 1` in the `forum_thread_entries` table.

```
Thread "How does Proof of Hunt work?" (Supabase UUID: abc-123)

  Position 1: Publication 0x01  ← the opening post
  Position 2: Publication 0x02  ← a response
  Position 3: Publication 0x03  ← another response

On Lens, all three are identical standalone articles.
On your forum, they appear stacked on /thread/abc-123.
On Hey.xyz, each is a separate article with no connection to the others.
```

### Recovery via Metadata Attributes

Each publication carries hidden metadata that only your app understands:

```
Publication 0x01 (position 1, the opener):
  attributes: [
    { key: "contentJson", value: "..." },           ← Plate.js JSON
    { key: "forumThreadId", value: "abc-123" },      ← your Supabase UUID
    { key: "forumPosition", value: "1" },
    { key: "forumCategory", value: "consensus" },
    { key: "forumThreadTitle", value: "How does Proof of Hunt work?" },
  ]

Publication 0x02 (position 2, a response):
  attributes: [
    { key: "contentJson", value: "..." },
    { key: "forumThreadId", value: "abc-123" },
    { key: "forumPosition", value: "2" },
  ]
```

If Supabase disappears:
1. Fetch all publications from your feeds
2. Read `forumThreadId` attribute from each
3. Group by thread ID
4. Order by `forumPosition`
5. Position 1 has `forumThreadTitle` and `forumCategory`
6. Rebuild `forum_threads` and `forum_thread_entries` exactly

This makes your app uniquely yours — the `forumThreadId` is YOUR
Supabase UUID. No other app knows what it means. But it's stored
permanently on Grove, so you can always reconstruct your forum.

---

## Supabase: Full Content Mirror

Supabase stores everything needed to render the entire forum with
zero Lens API calls:

```
forum_threads:
  id, title, category, feed, author_address, author_username,
  entry_count, last_entry_at, views_count, is_pinned, is_locked,
  created_at

forum_thread_entries:
  id, thread_id, publication_id, position,
  content_json (FULL Plate.js JSON),
  content_text (plain text for search),
  content_markdown, title, subtitle, cover_url,
  author_address, author_username, created_at

forum_categories:
  slug, name, description, section, feed, display_order,
  thread_count, is_locked
```

Lens API is called ONLY when publishing. Reading is 100% Supabase.

---

## Forum Structure

### Boards (4 sections, list layout)
1. **GENERAL DISCUSSION** — Beginners, Key Concepts, Web3 Outpost, DAO Governance
2. **PARTNER COMMUNITIES** — General, Announcements, Network States, Badges
3. **OTHERS** — Meta, Politics, Economics, Crypto, Off-topic
4. (Future language-specific boards — each its own Lens Group)

All boards post to the **Commons Feed** (Commons Group).

### Functions Section (1 section, grid layout)
- 11 categories: Game Theory, Function Ideas, Hunting, Property, etc.
- Posts to the **Research Feed** (Research Group)

### Technical Section (1 section, list layout, LOCKED)
- 6 categories: Architecture, State Machine, Consensus, Crypto, Accounts, Security
- Posts to the **Research Feed** (Research Group)
- **Token-gated**: requires Research Group membership
- Visual: dark navy background, yellow accent, lock icon

### Local Communities (card grid)
- Language-specific communities
- Each is its own Lens Group (self-governing)
- Displayed as cards with avatar, name, member count

---

## Landing Page

The landing page replaces Fountain's marketing/article page with the
forum board view. Full specification is in `LandingPageExample.md`.

Key points:
- `/` redirects to `/boards`
- Two-column layout: main content (sections) + sidebar (info, links, stats)
- Sections rendered top to bottom: General → Functions (grid) → Technical (locked) → Partners → Others → Local
- Each section is a bordered card with header bar and category rows
- Category rows show: name, description, thread count, views, last activity
- Locked section has distinct dark navy/yellow theme with lock icon
- Mobile: single column, sidebar hidden, bottom nav bar

---

## What Happens to Fountain Features

### Publish Dialog (`publish-dialog.tsx`)

Current 3 tabs:
- **Article Details** — title, subtitle, cover, slug, tags
- **Monetization** — collecting settings (price, editions, etc.)
- **Distribution** — blog selector, newsletter, Lens display options

What changes:
- **Article Details** — KEEP. Title is the thread title for openers.
  Subtitle, cover, slug, tags all still useful. This tab appears when
  you click Publish in the editor (`/w/[id]`).
- **Monetization** — KEEP as-is. Each post is a Lens publication that
  can be collected. Good feature for a forum.
- **Distribution** — MODIFY. Replace `BlogSelectMenu` (blog selector
  dropdown) with a **category selector** grouped by section. Replace
  newsletter checkbox with thread-related options. Keep Lens display
  options (controls how article appears on Hey.xyz).

The `BlogSelectMenu` is the dropdown in the Distribution tab that says
"Publish in [My Blog]". In the forum, this becomes "Post in [Consensus]"
or "Post in [Beginners & Help]". Same UI pattern (dropdown), different
content (categories instead of blogs).

### Article Page (`/p/[user]/[post]/page.tsx`)

Current: full article + author + reactions + CommentPreview at bottom.

What changes:
- **REMOVE** `CommentPreview` component. No comments on individual pages.
- **ADD** a link to the thread if this publication is part of one:
  "This post is part of a discussion → [Thread Title]"
- Everything else stays: article content, author view, reactions,
  read time, tags, metadata, read more section.

### Header (`header.tsx`)

Current elements (right side):
- FeedbackForm button
- BlogEmailSubscribe (on blog pages)
- PublishMenu (on write pages)
- EditorOptionsDropdown (on write pages)
- DraftCreateButton (on non-write pages)
- NotificationButton
- UserMenu

What changes:
- **KEEP** all existing elements in their current contexts
- **ADD** a "Research 🔒" button in the left nav area (next to search).
  This links to the Research section. The lock icon indicates it's
  token-gated. Clicking it either shows the Research boards (if member)
  or a "Join Research Group" prompt (if not).
- **MODIFY** the logo link: currently goes to `/featured` when logged in.
  Change to `/boards` (the forum homepage).
- **MODIFY** `DraftCreateButton`: currently says "New Post" or shows a
  pen icon. Could relabel to "New Thread" or keep as-is since creating
  a new draft IS how you start a new thread.
- **BlogEmailSubscribe**: hidden on forum pages (no blog context).
  Could repurpose later for thread subscription notifications.

### Draft System

KEEP entirely. Here's why it's useful:

When someone wants to start a new thread, they click "New Thread"
(or the draft create button). This creates a new draft in Supabase
and opens the editor at `/w/[documentId]`. They write their opening
post with full autosave. When they click Publish, the draft becomes
a Lens publication AND the first entry in a new thread.

The draft system gives you:
- Autosave while writing (no lost work)
- Draft list (see your unpublished threads)
- Resume editing later

For replies (written in the compact editor at the bottom of a thread
page), drafts are NOT used. The reply content lives in React state
until published. This is fine because replies are typically shorter
and written in one sitting.

### User Profile (`/u/[user]`)

Current: shows user's articles, followers, following.

What changes:
- **ADD** a "Forum Activity" tab. This queries `forum_thread_entries`
  by `author_address` and shows:
  - Threads started (entries with position 1)
  - Responses posted (entries with position > 1)
  - Each links to the thread page
- This is a Supabase query, not a Lens query. Simple to build.
- The existing profile tabs (posts, about, bookmarks) stay.

### Newsletter / Listmonk

Current: blog owners can send newsletters to subscribers.

Repurpose for thread notifications:
- "Watch this thread" → get email when someone responds
- Uses the same Listmonk infrastructure
- Instead of "blog subscriber list", it's "thread watcher list"
- This is a later feature. The infrastructure stays, just unused
  initially.

### Feed Pages (`/featured`, `/home`)

Current: shows curated articles, latest articles from followed users.

What changes:
- `/featured` → redirect to `/boards` (forum homepage)
- `/home` → could keep as a "latest activity" feed showing recent
  thread entries across all boards. Or redirect to `/boards`.
- The feed components (`feed-articles.tsx`, `feed-latest.tsx`) stay
  in the codebase. They might be useful for a "Recent Activity"
  view later.

### Blog Pages (`/b/[blog]`)

Current: shows a blog's articles with custom theme.

What changes:
- These routes stay but are not linked from the forum navigation.
- If someone navigates to `/b/[group-address]` directly, it still
  works — shows publications in that group's feed.
- Could repurpose later for community pages (`/b/[community-group]`
  showing that community's threads).

### Search (`/search`)

Current: searches articles.

What changes:
- **ADD** thread search. Query `forum_thread_entries.content_text`
  using Postgres full-text search.
- Show results as thread links (not individual article links).
- The existing search infrastructure stays.

### Settings (`/settings`)

Current: app settings, profile settings, blog settings, newsletter.

What changes:
- **App settings** — KEEP (smooth scrolling, blur, signless, email)
- **Profile settings** — KEEP (name, bio, avatar)
- **Blog settings** — HIDE from nav or repurpose for "Board Admin"
  settings if user is a group admin
- **Newsletter settings** — KEEP for later repurpose as thread
  notification settings

---

## Signless Experience (Your Question)

"Enable signless experience — Adds an account manager to enable a
signature-free experience"

This is a Lens Protocol feature. Normally, every action (publish,
react, follow) requires a wallet signature popup. With signless
enabled, the app's Account Manager can sign on behalf of the user
without prompting their wallet each time.

In Fountain's settings (`settings-app.tsx`), the toggle calls
`enableSignless()` from the Lens SDK. This registers the app as
an Account Manager for that user's Lens account.

For a forum, this is VERY useful. Forum users post frequently —
opening threads, writing responses, upvoting. Having to sign each
action with their wallet would be terrible UX. Signless mode means
they sign once (when enabling it) and then everything is seamless.

KEEP this feature. Encourage users to enable it.

---

## Routes Summary

### New Routes
```
/boards                              → Forum homepage (board sections)
/boards/[feed]?category=[slug]       → Thread list for a category
/thread/[thread-id]                  → Thread page (stacked entries)
```

### Modified Routes
```
/                                    → Redirect to /boards (was marketing page)
/p/[user]/[post]                     → Article page (remove CommentPreview)
/u/[user]                            → Profile (add Forum Activity tab)
/search                              → Add thread search results
```

### Kept As-Is
```
/w/[id]                              → Editor (unchanged)
/settings                            → Settings (unchanged)
/settings/profile                    → Profile settings (unchanged)
/settings/app                        → App settings (unchanged)
```

### Dormant (Not Linked, Not Deleted)
```
/b/[blog]                            → Blog page (still works if accessed)
/b/[blog]/[slug]                     → Blog article (still works)
/featured                            → Redirect to /boards
/home                                → Redirect to /boards or keep as activity feed
/settings/blogs                      → Blog settings (hide from nav)
/settings/newsletter                 → Newsletter settings (keep for later)
```

---

## Implementation Priority

The minimum viable forum needs:

1. **Supabase tables** — `forum_threads`, `forum_thread_entries`, `forum_categories`
2. **Landing page** — `/boards` with sections, categories, stats
3. **Thread page** — `/thread/[id]` rendering stacked entries from Supabase
4. **Publish hook** — after publishing to Lens, also write to forum tables
5. **Reply flow** — compact editor at bottom of thread page
6. **Remove CommentPreview** — from article pages

Everything else (voting, moderation, search, recovery, notifications,
profile tab, Research lock) is built on top of this foundation.
