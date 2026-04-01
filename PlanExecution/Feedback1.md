## Yes, you'd be running your own instance of Fountain.ink

When you bun install && bun run dev, you get a fully functional local copy of the Fountain.ink application. But it's not standalone — it connects to 
external services:

Your local Next.js app (localhost:3000)
    │
    ├── Supabase (cloud) ← you need YOUR OWN project
    │     └── stores: users, drafts, blogs, posts, curated, feedback
    │
    ├── Lens Protocol (cloud) ← shared public infrastructure
    │     └── YOUR Lens App address (0x637E...)
    │     └── login, publish, reactions, social graph
    │
    ├── Grove / Lens Storage (cloud) ← shared public infrastructure
    │     └── article content, images, metadata
    │
    ├── WalletConnect (cloud) ← you need YOUR OWN project ID
    │     └── wallet connection UI
    │
    ├── Listmonk (optional, self-hosted) ← newsletter system
    │
    └── Iframely (optional) ← embed previews


So you'd have your own Fountain.ink instance that:
- Has its own Supabase database (your users, your drafts, your curated posts)
- Publishes to Lens under YOUR app identity (not Fountain's)
- Shares the same Lens social graph (posts are visible on Hey.xyz, other Lens apps)
- Has the same editor, same UI, same everything

The key thing: Lens Protocol is shared infrastructure. A post published through your fork is a real Lens publication. It shows up everywhere. The 
difference is the app field says your app name instead of "Fountain."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## Why the 10 errors exist — and yes, your intuition is right

The errors exist precisely BECAUSE the plan is doing what you described: taking Fountain.ink's polished codebase and grafting forum functionality 
onto it. The friction comes from the fact that Fountain was built as a blogging platform and you're turning it into a forum platform. The two have 
different data models:

| Concept | Fountain (Blog) | Your Fork (Forum) |
|---|---|---|
| Content unit | Article (standalone) | Thread (root + replies) |
| Organization | Blogs (per-user) | Boards → Categories → Threads |
| Publishing target | User's blog feed | Commons or Research feed |
| Replies | Lens comments (lightweight) | Full articles with commentOn (heavyweight) |
| Draft system | Supabase drafts table + collab editing | Reuse for root posts, skip for replies |
| Content display | Single article page | Stacked thread view (Discourse-style) |

The 10 errors were all symptoms of the plan not fully accounting for how tightly Fountain's code is wired to the blog model. Specifically:

- **Draft type** (error 2) — Fountain's Draft is a database row. Forum replies don't need a database row.
- **Supabase clients** (error 3) — Fountain has 3 clients for different contexts. The plan used the wrong one everywhere.
- **Route structure** (errors 5, 6) — Fountain's routes are blog-centric (/b/[blog], /p/[user]/[post], /w/[id]). Forum routes (/boards, /thread) are 
new additions that must coexist.
- **usePublishDraft** (error 10) — Fountain's publish flow assumes a draft exists in Supabase. Forum replies bypass that.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## How the finished product actually works

Here's the complete picture of what you'll have after all 10 parts:

┌─────────────────────────────────────────────────────────────────┐
│                    YOUR DEPLOYED APP                             │
│              (fork of fountain.ink + forum layer)                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  WHAT THE USER SEES                                      │    │
│  │                                                          │    │
│  │  /boards                                                 │    │
│  │    → Board homepage with 5 sections, 30 categories       │    │
│  │    → Thread counts, latest activity per category         │    │
│  │    → Sidebar with community info                         │    │
│  │                                                          │    │
│  │  /boards/commons?category=beginners                      │    │
│  │    → Thread list: title, author, replies, views, votes   │    │
│  │    → Pinned threads first, then by latest activity       │    │
│  │    → "New Thread" button (requires login + group member) │    │
│  │                                                          │    │
│  │  /thread/0x01-0x42                                       │    │
│  │    → Root post rendered as full rich article              │    │
│  │    → Reply #1, #2, #3... stacked below (Discourse-style) │    │
│  │    → Each reply is full rich content (images, code, etc) │    │
│  │    → Vote buttons on every post                          │    │
│  │    → Reply editor at bottom (same Plate.js editor)       │    │
│  │                                                          │    │
│  │  /w/[id]?mode=forum                                      │    │
│  │    → Full Plate.js editor (same as Fountain's)           │    │
│  │    → Bold, italic, headings, code blocks, images, embeds │    │
│  │    → Auto-saves to drafts table                          │    │
│  │    → "Create Thread" → pick category → publish           │    │
│  │                                                          │    │
│  │  ALSO STILL WORKS (inherited from Fountain):             │    │
│  │    → /settings (profile, app settings)                   │    │
│  │    → /search (now searches forum threads too)            │    │
│  │    → /notifications (filtered to forum feeds)            │    │
│  │    → /u/[user] (profile + forum activity tab)            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  WHAT HAPPENS WHEN SOMEONE CREATES A THREAD              │    │
│  │                                                          │    │
│  │  1. User writes in Plate.js editor                       │    │
│  │  2. Clicks "Create Thread", picks category               │    │
│  │  3. App builds Lens article metadata:                    │    │
│  │     - title, markdown content, Plate.js JSON             │    │
│  │     - forumCategory attribute = "beginners"              │    │
│  │     - tags = ["beginners", ...]                          │    │
│  │  4. Uploads metadata to Grove → gets contentUri          │    │
│  │  5. Publishes to Lens: post(contentUri, feed=COMMONS)    │    │
│  │     - Wallet signs the transaction                       │    │
│  │     - Auth server verifies via App Signer                │    │
│  │  6. Writes to Supabase forum_threads:                    │    │
│  │     - root_publication_id, title, category               │    │
│  │     - content_text (for search), content_json (for render)│   │
│  │     - author_address, author_username                    │    │
│  │  7. Redirects to /thread/[new-publication-id]            │    │
│  │                                                          │    │
│  │  RESULT:                                                 │    │
│  │  - Thread visible on YOUR forum instantly                │    │
│  │  - Thread visible on Hey.xyz as a standalone article     │    │
│  │  - Thread visible on ANY Lens app that reads your feed   │    │
│  │  - Content permanently stored on Grove (decentralized)   │    │
│  │  - If Supabase dies, recoverable from Lens               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  WHAT HAPPENS WHEN SOMEONE REPLIES                       │    │
│  │                                                          │    │
│  │  Same as above, except:                                  │    │
│  │  - Published with commentOn: { post: rootPublicationId } │    │
│  │  - Goes to same feed as root post                        │    │
│  │  - Tracked in forum_thread_replies (not forum_threads)   │    │
│  │  - Thread's reply_count and last_reply_at updated        │    │
│  │  - No draft system — editor state is local only          │    │
│  │                                                          │    │
│  │  On Lens, the reply IS a comment on the root post.       │    │
│  │  On your forum, it's displayed as Reply #N in the thread.│    │
│  │  On Hey.xyz, it appears as a standalone article that     │    │
│  │  happens to be a comment.                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ACCESS CONTROL                                          │    │
│  │                                                          │    │
│  │  READING: Anyone can browse boards and read threads.     │    │
│  │  No login required.                                      │    │
│  │                                                          │    │
│  │  WRITING: Requires:                                      │    │
│  │  1. Lens account (connect wallet)                        │    │
│  │  2. Membership in Commons Group OR Research Group        │    │
│  │     (approval-gated — admin must approve)                │    │
│  │  3. Auth server says "allowed: true"                     │    │
│  │                                                          │    │
│  │  MODERATING: Requires group admin status                 │    │
│  │  - Hide replies, ban members, pin/lock threads           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

EXTERNAL SERVICES:

┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│  Auth Server  │  │   Supabase   │  │     Lens Protocol        │
│  (Express)    │  │   (Postgres) │  │     (Onchain)            │
│               │  │              │  │                          │
│  /authorize   │  │ forum_threads│  │  Your App (0x637E...)    │
│  /verify      │  │ forum_replies│  │  Commons Group + Feed    │
│               │  │ forum_votes  │  │  Research Group + Feed   │
│  Controls who │  │ forum_cats   │  │  All publications        │
│  can log in   │  │ users,drafts │  │  All reactions           │
│  Signs every  │  │ (fountain's) │  │  All social graph data   │
│  operation    │  │              │  │                          │
│  Deployed on  │  │  Speed layer │  │  Source of truth         │
│  Railway/Fly  │  │  + search    │  │  Permanent + recoverable │
└──────────────┘  └──────────────┘  └──────────────────────────┘

                  ┌──────────────┐
                  │    Grove     │
                  │  (Storage)   │
                  │              │
                  │  Article     │
                  │  content,    │
                  │  images,     │
                  │  metadata    │
                  │              │
                  │  Decentralized│
                  │  permanent   │
                  └──────────────┘

SYNC & RECOVERY:

  Every 5 minutes, a cron job:
  - Scans Lens feeds for posts not in Supabase
  - Adds missing threads/replies
  - Catches posts made via Hey.xyz or other Lens apps
  - Handles deleted/edited posts

  If Supabase is wiped:
  - Run recovery script
  - Reads ALL posts from both feeds via Lens API
  - Reconstructs threads via commentOn relationships
  - Rebuilds content_json cache from metadata attributes
  - Forum is back online with full history


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## What you keep from Fountain vs. what you add

Think of it as layers:

Layer 3 (NEW):     Forum UI — boards, threads, replies, voting, moderation
Layer 2 (NEW):     Forum data — forum_* tables, publish services, API routes
Layer 1 (KEPT):    Fountain core — editor, auth, Lens client, Supabase, UI kit
Layer 0 (KEPT):    Next.js + Plate.js + Tailwind + Radix UI


You're not replacing Fountain. You're building on top of it. The editor that makes Fountain feel professional? That's your thread editor. The auth 
flow? That's your login. The component library (all those Radix UI primitives, the toast system, the dialogs)? That's your forum UI foundation.

The forum-specific code (boards, threads, categories, voting, recovery) is a new layer that plugs into Fountain's existing infrastructure. Fountain's
blog features (/b/, /p/, blog settings, newsletter) can be gradually removed or left dormant — they don't interfere with the forum routes.

That's exactly why the plan works: you're not fighting the codebase, you're extending it.