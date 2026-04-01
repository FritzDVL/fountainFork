# Master Plan: Forum Rebuild on Fountain.ink Fork

## Overview

This document is the complete step-by-step blueprint for rebuilding the
Web3Forum as a fork of fountain.ink. Each Part will become its own detailed
specification file before implementation begins.

---

## The Thread Model — Definitive Design

### On Lens (Web3 — Source of Truth)

Every piece of content is a full Lens Publication (article type):
- Root post = standalone publication on a Feed
- Reply = standalone publication with `commentOn` pointing to root

The `commentOn` relationship is the permanent, onchain thread structure.
It's recoverable via `fetchPostReferences(rootPostId, [CommentOn])` which
returns all replies ordered by timestamp. This IS the web3 backup of thread
ordering — no additional onchain solution needed.

### On Supabase (Web2 — Speed Layer)

Supabase caches thread structure for fast reads:
- Thread metadata (title, category, reply count, last activity)
- Reply ordering (position within thread)
- View counts, voting data (things Lens doesn't track)
- Content text cache (for search, previews, SEO)

### Recovery Strategy (If App Goes Down)

If Supabase is lost, threads can be fully reconstructed from Lens:

```
1. Fetch all posts from your Feed (fetchPosts with feed filter)
2. For each post where commentOn is null → it's a root post (thread)
3. For each root post → fetchPostReferences(rootId, [CommentOn])
4. Order replies by timestamp → thread is reconstructed
5. Content is on Grove → fetch contentUri for each publication
```

The onchain data IS the permanent backup. Supabase is just a fast cache.
No additional web3 solution needed for thread ordering because `commentOn`
+ timestamps already encode it.

### UI Behavior

Thread list page:
```
/boards/commons?category=beginners
  → Query Supabase for threads WHERE category = 'beginners'
  → Show: title, author, reply_count, last_reply_at, views
```

Thread detail page:
```
/thread/[root-publication-id]
  → Fetch root publication content from Supabase cache (fast)
  → Fetch replies from Supabase ordered by position (fast)
  → Render: root article + stacked reply articles (Discourse-style)
  → Each reply shows: author avatar, timestamp, full rich content
```

Individual reply (when clicked/expanded):
```
/publication/[reply-publication-id]
  → Opens as standalone article (fountain.ink reading view)
  → No comment section (it IS a comment in a thread)
  → Shows "Part of thread: [thread title]" link back
  → Content fetched from Grove via contentUri
```

---

## Parts Breakdown

### Part 1: Foundation — Fork & Auth Setup
- Fork fountain-ink/app and fountain-ink/auth
- Configure for existing Lens App (0x637E...)
- Generate signer keys
- Deploy auth server
- Register Authorization Endpoint + App Signer via Builder script
- Verify login flow works with auth endpoint

### Part 2: Lens Primitives — Groups & Feeds
- Create Commons Group (MembershipApprovalGroupRule)
- Create Research Group (MembershipApprovalGroupRule)
- Create Commons Feed (GroupGatedFeedRule → Commons Group)
- Create Research Feed (GroupGatedFeedRule → Research Group)
- Register feeds with app
- Define category list (what was 26 feeds becomes ~20 categories)

### Part 3: Database Schema
- Design and create Supabase tables:
  - threads (root_pub_id, feed, category, title, author, reply_count, etc.)
  - thread_replies (pub_id, thread_id, position, author, content_cache, etc.)
  - categories (slug, name, description, section, display_order, feed)
  - communities (lens_group_address, name, type, etc.)
  - votes (pub_id, account, direction)
- Seed categories from current commons-config sections
- RLS policies

### Part 4: Publishing Flow — Root Posts
- Adapt fountain.ink's Plate.js editor for thread creation
- Add category selector to publish form
- Publish as full article to appropriate Feed (Commons or Research)
- Store thread metadata in Supabase
- Cache content text in Supabase for search/previews

### Part 5: Publishing Flow — Replies
- Adapt fountain.ink's editor for reply creation (same rich editor)
- Publish as full article with `commentOn: { post: rootPostId }`
- Same Feed as root post
- Track in thread_replies table with position
- Update thread's reply_count and last_reply_at
- Cache reply content in Supabase

### Part 6: Thread Display
- Board listing page (categories grouped by section)
- Thread list page (filtered by category, sorted by activity)
- Thread detail page (root + stacked replies, Discourse-style)
- Individual publication view (standalone reading, link back to thread)
- Pagination for long threads

### Part 7: Forum Features — Port from Current Codebase
- Voting/reactions system
- Moderation tools (hide reply, ban member)
- Community/Group management (join, leave, approve)
- Moderator assignment
- Notification system
- Profile pages

### Part 8: Navigation & Layout
- Homepage with board sections
- Navbar with auth state
- Category navigation
- Search (query Supabase content cache)
- Mobile responsive layout

### Part 9: Recovery & Sync
- Background job: sync Supabase with Lens data
- Recovery script: rebuild threads from onchain data
- Content cache refresh from Grove
- Handle edge cases (deleted posts, edited posts)

### Part 10: Polish & Deploy
- Performance optimization (ISR, caching)
- SEO (meta tags, OG images from thread content)
- Error handling
- Rate limiting
- Production deployment

---

## Category Map (Replacing 26 Feeds)

### Commons Feed Categories

GENERAL DISCUSSION section:
- beginners — "Beginners & Help"
- key-concepts — "4 Key Concepts"
- web3-outpost — "Web3 Outpost"
- dao-governance — "DAO Governance"

PARTNER COMMUNITIES section:
- partners-general — "General Discussion"
- announcements — "Announcements"
- network-states — "Network States Communities"
- partner-badges — "Partner Badges & SPEC"

OTHERS section:
- meta — "Meta-discussion"
- politics — "Politics & Society"
- economics — "Economics"
- crypto-web3 — "Cryptocurrencies & Web3"
- off-topic — "Off-topic"

### Research Feed Categories

FUNCTIONS section:
- game-theory — "Economic Game Theory"
- function-ideas — "Function Ideas"
- hunting — "Hunting"
- property — "Property"
- parenting — "Parenting"
- governance-func — "Governance"
- organizations — "Organizations"
- curation — "Curation"
- farming — "Farming"
- portal — "Portal"
- communication — "Communication"

TECHNICAL section:
- architecture — "General Architecture Discussion"
- state-machine — "State Machine"
- consensus — "Consensus (Proof of Hunt)"
- cryptography — "Cryptography"
- account-system — "Account System"
- security — "Security"

---

## What Comes From Where

### From fountain-ink/app (fork):
- Next.js project structure
- Plate.js editor (extensions, toolbar, slash commands)
- Grove storage integration (upload/download)
- Lens client setup
- Supabase integration patterns
- Content rendering components
- Authentication UI flow

### From fountain-ink/auth (fork):
- Express auth server
- Authorization endpoint (/authorize)
- Verification endpoint (/verify)
- OperationApprovalSigner setup
- Key generation script

### From current Web3Forum (port):
- Community/Group management logic (hooks/communities/*)
- Voting system (hooks/common/use-voting.ts)
- Moderation tools (thread-reply-moderator-actions.tsx)
- Notification system (hooks/notifications/*, components/notifications/*)
- Profile pages (components/profile/*)
- Admin session management (lib/external/lens/admin-session.ts)
- Group primitives (lib/external/lens/primitives/groups.ts)

### Built new:
- Forum board/thread UI components
- Thread tracking in Supabase
- Reply-as-publication flow
- Category navigation
- Thread recovery from Lens
- Homepage board layout

---

## Key Decisions Locked In

1. 2 Feeds: Commons + Research (not 26)
2. 2 Groups: Commons + Research (with MembershipApprovalGroupRule)
3. Categories = Supabase rows, not onchain feeds
4. Every reply = full Lens publication with commentOn
5. Thread ordering = Supabase cache, recoverable from Lens timestamps
6. Editor = Plate.js from fountain.ink
7. Auth = fountain.ink auth server pattern
8. Content cache = Supabase text column for speed + search
9. Source of truth = Lens Protocol + Grove storage
10. Recovery = fetchPostReferences + timestamps reconstructs any thread
