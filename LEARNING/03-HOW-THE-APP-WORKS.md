# How This App Works — Architecture for Beginners

Understanding what runs where and why.

---

## The App is Not One Thing

Your forum is actually 5 separate services working together:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  1. YOUR APP (Next.js)                                  │
│     Where: localhost:3000 (dev) or Vercel (prod)        │
│     What: The website users see and interact with       │
│     Code: This repo (fountainFork/)                     │
│                                                         │
│  2. AUTH SERVER (Express.js)                             │
│     Where: Railway/Render (always online)               │
│     What: Answers "should this user be allowed in?"     │
│     Code: Separate repo (fountain-ink/auth)             │
│                                                         │
│  3. SUPABASE (PostgreSQL database)                      │
│     Where: supabase.com (cloud, free tier)              │
│     What: Stores forum data (threads, replies, votes)   │
│     Code: No code — it's a managed service              │
│                                                         │
│  4. LENS PROTOCOL (blockchain)                          │
│     Where: Lens Chain (decentralized)                   │
│     What: Permanent record of all publications          │
│     Code: No code — it's shared infrastructure          │
│                                                         │
│  5. GROVE STORAGE (decentralized storage)               │
│     Where: Distributed network                          │
│     What: Stores article content, images, metadata      │
│     Code: No code — accessed via SDK                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

You only write code for #1 and #2. The rest are services you connect to.

---

## What is Next.js?

Next.js is a framework for building websites with React. The key thing
that makes it special: it can run code on BOTH the server and the browser.

```
SERVER SIDE (runs on the server, user never sees this code):
  - Fetching data from Supabase
  - Rendering the initial HTML
  - API routes (/api/forum/threads, etc.)

CLIENT SIDE (runs in the user's browser):
  - Interactive UI (clicking buttons, typing in editor)
  - Wallet connection
  - Real-time updates
```

This is why Fountain has THREE Supabase clients:
- `server.ts` — for code that runs on the server (has cookie access)
- `client.ts` — for code that runs in the browser
- `service.ts` — for scripts that bypass security rules (admin access)

Using the wrong one is a common bug. The CODEBASE-RULES.md file has
the exact mapping.

---

## What is Plate.js?

Plate.js is the rich text editor. It's what lets users write with:
- Bold, italic, underline
- Headings (H1, H2, H3)
- Code blocks with syntax highlighting
- Images
- Links
- Blockquotes
- Tables

Fountain already has Plate.js fully configured with all these features.
We reuse it exactly as-is for the forum. The editor in the composer
panel is the same editor Fountain uses for articles.

The editor stores content as JSON (not HTML, not markdown). This JSON
is what gets saved to Supabase (`content_json` column) and uploaded
to Grove storage.

---

## What is Supabase?

Supabase is a hosted PostgreSQL database with extras:
- **Database** — SQL tables, just like any database
- **Auth** — user authentication (we use Lens auth instead)
- **Storage** — file storage (we use Grove instead)
- **Realtime** — live updates (used for chat)
- **Edge Functions** — serverless functions (optional)

For the forum, we only use the **database** part. We create tables
like `forum_threads`, `forum_thread_replies`, `forum_votes`, etc.

### Why Supabase AND Lens?

Lens Protocol is the permanent, decentralized record. But it's slow
to query. You can't do things like:

- "Show me all threads in the 'beginners' category sorted by latest reply"
- "Search for threads containing 'wallet setup'"
- "Count how many views this thread has"

Supabase gives us fast SQL queries for the UI. If Supabase ever dies,
we can rebuild everything from Lens (that's what the recovery script does).

```
LENS = permanent truth (slow to query, but indestructible)
SUPABASE = fast cache (quick queries, but rebuildable)
```

---

## What is the .env File?

The `.env` file contains secrets and configuration that your app needs
but that should NEVER be committed to Git (because they're secret).

```env
# These are PUBLIC (visible in the browser)
NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id_here

# These are SECRET (only visible on the server)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
PRIVATE_KEY=0x1234567890abcdef...
```

Variables starting with `NEXT_PUBLIC_` are visible in the browser.
All others are server-only. Never put secret keys in `NEXT_PUBLIC_` vars.

---

## What is a "Migration"?

A migration is a SQL file that changes your database structure.
Instead of manually creating tables in the Supabase dashboard, you
write SQL files that describe what to create:

```sql
-- This is a migration file
CREATE TABLE forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  ...
);
```

You run `supabase db push` and it executes all migration files in order.
This way, your database structure is version-controlled in Git, and
anyone can recreate the exact same database by running the migrations.

---

## What is RLS (Row Level Security)?

RLS is Supabase's way of controlling who can read/write what data.
Without RLS, anyone with your Supabase URL could read or modify
any data. With RLS, you define rules:

```sql
-- Anyone can READ threads
CREATE POLICY "Public read" ON forum_threads
  FOR SELECT USING (true);

-- Only the author can UPDATE their own threads
CREATE POLICY "Author update" ON forum_threads
  FOR UPDATE USING (author_address = current_user_address());
```

This is like a bouncer for each table row. Even if someone gets your
Supabase URL, they can only do what the policies allow.

---

## Project Structure Quick Reference

```
fountainFork/
├── src/
│   ├── app/           ← Pages and API routes (Next.js)
│   │   ├── boards/    ← Forum landing page (we'll create this)
│   │   ├── thread/    ← Thread detail page (we'll create this)
│   │   ├── api/       ← Backend API endpoints
│   │   ├── w/[id]/    ← Fountain's editor page (we reuse this)
│   │   └── ...
│   ├── components/    ← React components
│   │   ├── editor/    ← Plate.js editor (we reuse this)
│   │   ├── forum/     ← Forum components (we'll create this)
│   │   └── ...
│   ├── lib/           ← Utility functions and services
│   │   ├── db/        ← Supabase clients (3 of them!)
│   │   ├── lens/      ← Lens SDK setup
│   │   ├── auth/      ← App authentication
│   │   ├── forum/     ← Forum services (we'll create this)
│   │   └── ...
│   └── hooks/         ← React hooks
│       └── forum/     ← Forum hooks (we'll create this)
├── supabase/
│   └── migrations/    ← Database schema files
├── BLUEPRINT/         ← Implementation plan (you know this)
├── LEARNING/          ← This folder (beginner guides)
├── PlanExecution/     ← Original specs and mockups
└── .env               ← Secrets (never commit this)
```
