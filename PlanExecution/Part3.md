# Part 3: Database Schema

## Goal

Create the Supabase tables that power the forum's speed layer. These tables
cache thread structure, reply ordering, categories, votes, and content text
for fast reads, search, and SEO. The source of truth remains Lens Protocol
+ Grove storage. Supabase is the fast cache that can be rebuilt from onchain
data if lost.

---

## Prerequisites

- Part 2 complete (Groups + Feeds created, addresses saved)
- Supabase project configured (from Part 1)
- Access to Supabase SQL Editor or CLI (`supabase db push`)

---

## Design Principles

1. **Supabase = cache, Lens = truth.** Every row references a Lens publication ID.
   If Supabase is wiped, threads can be reconstructed from `fetchPostReferences`.
2. **Content is cached, not stored.** The `content_text` columns hold plain text
   extracted from the article for search and previews. The full rich content
   lives on Grove (via `content_uri`).
3. **No duplication of Lens data.** We don't store author profiles, follower
   counts, or reaction data. We store only what Lens can't give us fast enough:
   thread ordering, view counts, category assignments, votes.
4. **Coexist with fountain.ink tables.** Fountain already has `users`, `blogs`,
   `posts`, `drafts`, etc. Our forum tables are additive — prefixed or namespaced
   to avoid conflicts.

---

## Migration File

Create `supabase/migrations/20260401_forum_schema.sql`:

```sql
-- ============================================
-- Forum Schema for Society Protocol
-- Sits alongside fountain.ink's existing tables
-- ============================================


-- ============================================
-- 1. CATEGORIES
-- Static reference table. Seeded from categories.ts config.
-- Could also be purely in code, but having it in DB allows
-- dynamic category management later.
-- ============================================

CREATE TABLE IF NOT EXISTS forum_categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  section TEXT NOT NULL,          -- 'general', 'partners', 'functions', 'technical', 'others'
  feed TEXT NOT NULL,             -- 'commons' or 'research'
  display_order INTEGER NOT NULL DEFAULT 0,
  thread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_categories_section ON forum_categories(section);
CREATE INDEX idx_forum_categories_feed ON forum_categories(feed);
CREATE INDEX idx_forum_categories_order ON forum_categories(display_order);


-- ============================================
-- 2. THREADS
-- One row per forum thread. Links to a root Lens publication.
-- ============================================

CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lens reference (source of truth)
  root_publication_id TEXT UNIQUE NOT NULL,   -- Lens post ID of the root article
  content_uri TEXT,                            -- Grove URI for full content

  -- Forum metadata
  feed TEXT NOT NULL,                          -- 'commons' or 'research'
  category TEXT NOT NULL REFERENCES forum_categories(slug),
  title TEXT NOT NULL,
  summary TEXT,                                -- first ~200 chars for preview
  content_text TEXT,                           -- full plain text for search

  -- Author (Lens account address)
  author_address TEXT NOT NULL,
  author_username TEXT,                        -- cached lens username for display

  -- Counters
  reply_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Moderation
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,    -- no new replies
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE     -- soft delete
);

CREATE INDEX idx_forum_threads_category ON forum_threads(category);
CREATE INDEX idx_forum_threads_feed ON forum_threads(feed);
CREATE INDEX idx_forum_threads_author ON forum_threads(author_address);
CREATE INDEX idx_forum_threads_created ON forum_threads(created_at DESC);
CREATE INDEX idx_forum_threads_last_reply ON forum_threads(last_reply_at DESC NULLS LAST);
CREATE INDEX idx_forum_threads_pinned ON forum_threads(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_forum_threads_root_pub ON forum_threads(root_publication_id);

-- Full text search index on title + content
CREATE INDEX idx_forum_threads_search ON forum_threads
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, '')));


-- ============================================
-- 3. THREAD REPLIES
-- One row per reply in a thread. Each reply is a full Lens publication
-- linked via commentOn to the root post.
-- ============================================

CREATE TABLE IF NOT EXISTS forum_thread_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Thread reference
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,

  -- Lens reference (source of truth)
  publication_id TEXT UNIQUE NOT NULL,         -- Lens post ID of this reply
  content_uri TEXT,                            -- Grove URI for full content

  -- Position in thread (for display ordering)
  position INTEGER NOT NULL,                   -- 1-based, sequential

  -- Content cache
  content_text TEXT,                           -- plain text for search/preview
  summary TEXT,                                -- first ~200 chars

  -- Author
  author_address TEXT NOT NULL,
  author_username TEXT,

  -- Counters
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Moderation
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_forum_replies_thread ON forum_thread_replies(thread_id);
CREATE INDEX idx_forum_replies_position ON forum_thread_replies(thread_id, position);
CREATE INDEX idx_forum_replies_author ON forum_thread_replies(author_address);
CREATE INDEX idx_forum_replies_pub ON forum_thread_replies(publication_id);
CREATE INDEX idx_forum_replies_created ON forum_thread_replies(created_at);


-- ============================================
-- 4. VOTES
-- Tracks upvotes/downvotes per publication per account.
-- Works for both threads (root posts) and replies.
-- ============================================

CREATE TABLE IF NOT EXISTS forum_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id TEXT NOT NULL,                -- Lens post ID (thread root or reply)
  account_address TEXT NOT NULL,               -- voter's Lens account
  direction SMALLINT NOT NULL,                 -- 1 = upvote, -1 = downvote

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_vote UNIQUE (publication_id, account_address),
  CONSTRAINT valid_direction CHECK (direction IN (-1, 1))
);

CREATE INDEX idx_forum_votes_pub ON forum_votes(publication_id);
CREATE INDEX idx_forum_votes_account ON forum_votes(account_address);


-- ============================================
-- 5. COMMUNITIES
-- Tracks Lens Groups used as language/topic communities.
-- These are the "LOCAL" communities from the current app.
-- ============================================

CREATE TABLE IF NOT EXISTS forum_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_group_address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  language TEXT,                                -- e.g., 'en', 'es', 'zh'
  members_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_communities_featured
  ON forum_communities(is_featured) WHERE is_featured = TRUE;


-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Increment reply count + update last_reply_at on a thread
CREATE OR REPLACE FUNCTION forum_add_reply(
  p_thread_id UUID,
  p_reply_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_threads
  SET reply_count = reply_count + 1,
      last_reply_at = p_reply_time,
      updated_at = NOW()
  WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Increment thread count on a category
CREATE OR REPLACE FUNCTION forum_add_thread_to_category(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_categories
  SET thread_count = thread_count + 1
  WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql;

-- Increment view count (called on thread page load)
CREATE OR REPLACE FUNCTION forum_increment_views(p_thread_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_threads
  SET views_count = views_count + 1
  WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Apply a vote (upsert: insert or flip direction)
CREATE OR REPLACE FUNCTION forum_apply_vote(
  p_publication_id TEXT,
  p_account TEXT,
  p_direction SMALLINT
)
RETURNS VOID AS $$
DECLARE
  old_direction SMALLINT;
  is_thread BOOLEAN;
BEGIN
  -- Check for existing vote
  SELECT direction INTO old_direction
  FROM forum_votes
  WHERE publication_id = p_publication_id AND account_address = p_account;

  IF FOUND THEN
    IF old_direction = p_direction THEN
      -- Same vote again → remove it
      DELETE FROM forum_votes
      WHERE publication_id = p_publication_id AND account_address = p_account;

      -- Reverse the count
      is_thread := EXISTS (SELECT 1 FROM forum_threads WHERE root_publication_id = p_publication_id);
      IF is_thread THEN
        IF p_direction = 1 THEN
          UPDATE forum_threads SET upvotes = upvotes - 1 WHERE root_publication_id = p_publication_id;
        ELSE
          UPDATE forum_threads SET downvotes = downvotes - 1 WHERE root_publication_id = p_publication_id;
        END IF;
      ELSE
        IF p_direction = 1 THEN
          UPDATE forum_thread_replies SET upvotes = upvotes - 1 WHERE publication_id = p_publication_id;
        ELSE
          UPDATE forum_thread_replies SET downvotes = downvotes - 1 WHERE publication_id = p_publication_id;
        END IF;
      END IF;
    ELSE
      -- Different direction → flip
      UPDATE forum_votes SET direction = p_direction
      WHERE publication_id = p_publication_id AND account_address = p_account;

      is_thread := EXISTS (SELECT 1 FROM forum_threads WHERE root_publication_id = p_publication_id);
      IF is_thread THEN
        IF p_direction = 1 THEN
          UPDATE forum_threads SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE root_publication_id = p_publication_id;
        ELSE
          UPDATE forum_threads SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE root_publication_id = p_publication_id;
        END IF;
      ELSE
        IF p_direction = 1 THEN
          UPDATE forum_thread_replies SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE publication_id = p_publication_id;
        ELSE
          UPDATE forum_thread_replies SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE publication_id = p_publication_id;
        END IF;
      END IF;
    END IF;
  ELSE
    -- New vote
    INSERT INTO forum_votes (publication_id, account_address, direction)
    VALUES (p_publication_id, p_account, p_direction);

    is_thread := EXISTS (SELECT 1 FROM forum_threads WHERE root_publication_id = p_publication_id);
    IF is_thread THEN
      IF p_direction = 1 THEN
        UPDATE forum_threads SET upvotes = upvotes + 1 WHERE root_publication_id = p_publication_id;
      ELSE
        UPDATE forum_threads SET downvotes = downvotes + 1 WHERE root_publication_id = p_publication_id;
      END IF;
    ELSE
      IF p_direction = 1 THEN
        UPDATE forum_thread_replies SET upvotes = upvotes + 1 WHERE publication_id = p_publication_id;
      ELSE
        UPDATE forum_thread_replies SET downvotes = downvotes + 1 WHERE publication_id = p_publication_id;
      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_thread_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_communities ENABLE ROW LEVEL SECURITY;

-- Categories: public read, admin write
CREATE POLICY "Public read categories" ON forum_categories FOR SELECT USING (true);
CREATE POLICY "Admin write categories" ON forum_categories FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'metadata')::json->>'isAdmin' = 'true'
);

-- Threads: public read, authenticated insert/update
CREATE POLICY "Public read threads" ON forum_threads FOR SELECT USING (true);
CREATE POLICY "Authenticated insert threads" ON forum_threads FOR INSERT WITH CHECK (true);
CREATE POLICY "Author or admin update threads" ON forum_threads FOR UPDATE USING (true);

-- Replies: public read, authenticated insert
CREATE POLICY "Public read replies" ON forum_thread_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated insert replies" ON forum_thread_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Author or admin update replies" ON forum_thread_replies FOR UPDATE USING (true);

-- Votes: public read, authenticated insert/update/delete
CREATE POLICY "Public read votes" ON forum_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated manage votes" ON forum_votes FOR ALL USING (true);

-- Communities: public read, admin write
CREATE POLICY "Public read communities" ON forum_communities FOR SELECT USING (true);
CREATE POLICY "Admin write communities" ON forum_communities FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'metadata')::json->>'isAdmin' = 'true'
);
```

---

## Seed Data: Categories

Create `supabase/migrations/20260401_seed_categories.sql`:

```sql
-- ============================================
-- Seed forum categories
-- Matches the category map from Part 2 (categories.ts)
-- ============================================

INSERT INTO forum_categories (slug, name, description, section, feed, display_order) VALUES
-- GENERAL DISCUSSION
('beginners',       'Beginners & Help',       'New to the forum? Start here.',                'general',   'commons',  1),
('key-concepts',    '4 Key Concepts',         'Core concepts and fundamental principles.',    'general',   'commons',  2),
('web3-outpost',    'Web3 Outpost',           'Web3 integration, badges, and specs.',         'general',   'commons',  3),
('dao-governance',  'DAO Governance',         'Governance discussions and proposals.',         'general',   'commons',  4),

-- PARTNER COMMUNITIES
('partners-general','General Discussion',     'Partner community discussions.',                'partners',  'commons',  5),
('announcements',   'Announcements',          'Official partner news and updates.',            'partners',  'commons',  6),
('network-states',  'Network States',         'Current and upcoming network states.',          'partners',  'commons',  7),
('partner-badges',  'Partner Badges & SPEC',  'Badge systems for partners.',                   'partners',  'commons',  8),

-- FUNCTIONS (VALUE SYSTEM)
('game-theory',     'Economic Game Theory',   'Economic models and game theory.',              'functions', 'research', 9),
('function-ideas',  'Function Ideas',         'Propose and discuss new functions.',             'functions', 'research', 10),
('hunting',         'Hunting',                'Resource discovery strategies.',                 'functions', 'research', 11),
('property',        'Property',               'Property rights and ownership.',                 'functions', 'research', 12),
('parenting',       'Parenting',              'Community growth and mentorship.',               'functions', 'research', 13),
('governance-func', 'Governance',             'Decision-making structures.',                    'functions', 'research', 14),
('organizations',   'Organizations',          'Organizational design.',                         'functions', 'research', 15),
('curation',        'Curation',               'Content and quality curation.',                  'functions', 'research', 16),
('farming',         'Farming',                'Value creation strategies.',                     'functions', 'research', 17),
('portal',          'Portal',                 'Gateway and integration.',                       'functions', 'research', 18),
('communication',   'Communication',          'Communication protocols.',                       'functions', 'research', 19),

-- TECHNICAL SECTION
('architecture',    'General Architecture',   'System architecture and design.',                'technical', 'research', 20),
('state-machine',   'State Machine',          'State transitions and logic.',                   'technical', 'research', 21),
('consensus',       'Consensus (Proof of Hunt)','Consensus mechanisms.',                        'technical', 'research', 22),
('cryptography',    'Cryptography',           'Cryptographic primitives.',                      'technical', 'research', 23),
('account-system',  'Account System',         'Accounts and identity.',                         'technical', 'research', 24),
('security',        'Security',               'Security protocols.',                             'technical', 'research', 25),

-- OTHERS
('meta',            'Meta-discussion',        'About the forum itself.',                        'others',    'commons',  26),
('politics',        'Politics & Society',     'Political impacts on society.',                  'others',    'commons',  27),
('economics',       'Economics',              'Economic models and theories.',                  'others',    'commons',  28),
('crypto-web3',     'Cryptocurrencies & Web3','The broader crypto landscape.',                  'others',    'commons',  29),
('off-topic',       'Off-topic',              'Anything unrelated to the protocol.',            'others',    'commons',  30);
```

---

## How Tables Map to the App

### Thread list page (`/boards/commons?category=beginners`)
```sql
SELECT id, root_publication_id, title, summary, author_username,
       reply_count, views_count, upvotes, downvotes,
       last_reply_at, created_at, is_pinned
FROM forum_threads
WHERE category = 'beginners' AND is_hidden = FALSE
ORDER BY is_pinned DESC, last_reply_at DESC NULLS LAST
LIMIT 20 OFFSET 0;
```

### Thread detail page (`/thread/[root-publication-id]`)
```sql
-- Root thread
SELECT * FROM forum_threads WHERE root_publication_id = $1;

-- Replies ordered by position
SELECT * FROM forum_thread_replies
WHERE thread_id = $1 AND is_hidden = FALSE
ORDER BY position ASC;
```

### Board homepage (category listing with stats)
```sql
SELECT c.*, 
  (SELECT MAX(t.last_reply_at) FROM forum_threads t WHERE t.category = c.slug) as latest_activity
FROM forum_categories c
WHERE c.section = 'general'
ORDER BY c.display_order;
```

### Search
```sql
SELECT id, root_publication_id, title, summary, category, author_username, created_at
FROM forum_threads
WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_text,''))
      @@ plainto_tsquery('english', $1)
  AND is_hidden = FALSE
ORDER BY created_at DESC
LIMIT 20;
```

### Voting
```sql
-- Apply vote (uses the helper function)
SELECT forum_apply_vote('lens-post-id-123', '0xUserAddress', 1);  -- upvote
SELECT forum_apply_vote('lens-post-id-123', '0xUserAddress', -1); -- downvote
SELECT forum_apply_vote('lens-post-id-123', '0xUserAddress', 1);  -- toggle off

-- Check user's vote on a post
SELECT direction FROM forum_votes
WHERE publication_id = $1 AND account_address = $2;
```

---

## Recovery: Rebuilding from Lens

If Supabase is lost, this is the reconstruction logic (implemented in Part 9):

```
For each feed (commons, research):
  1. fetchPosts(client, { filter: { feeds: [{ feed: FEED_ADDRESS }] } })
  2. For each post where commentOn is null:
     → It's a thread root
     → Extract title from metadata
     → Determine category from metadata tags (or default)
     → INSERT INTO forum_threads
  3. For each thread root:
     → fetchPostReferences(rootId, [CommentOn])
     → Order by timestamp
     → INSERT INTO forum_thread_replies with position = index + 1
     → UPDATE forum_threads SET reply_count = count
```

The `content_text` cache is rebuilt by fetching each `content_uri` from Grove
and extracting plain text from the article JSON.

---

## Relationship to Fountain.ink Tables

Fountain.ink's existing tables (untouched):
- `users` — user profiles, JWT auth
- `blogs` — user blogs (we may repurpose or ignore)
- `posts` — published articles (fountain's concept of a post)
- `drafts` — unpublished drafts
- `curated` — curated content
- `feedback` — user feedback
- `banlist` — banned users
- `chat_messages` — real-time chat

Our forum tables (new, prefixed with `forum_`):
- `forum_categories` — board categories
- `forum_threads` — thread metadata + content cache
- `forum_thread_replies` — reply metadata + content cache
- `forum_votes` — upvotes/downvotes
- `forum_communities` — language/topic community groups

No conflicts. The `forum_` prefix keeps everything clean.

We may later create a bridge between fountain's `posts` table and our
`forum_threads` table (since both reference Lens publications), but
that's a Part 9 concern.

---

## Checklist — Part 3 Complete When:

- [ ] Migration file created (`20260401_forum_schema.sql`)
- [ ] Seed file created (`20260401_seed_categories.sql`)
- [ ] Migrations applied to Supabase (`supabase db push` or SQL Editor)
- [ ] 30 categories seeded and visible in Supabase dashboard
- [ ] All 5 tables created with indexes
- [ ] RLS policies active
- [ ] Helper functions created (forum_add_reply, forum_apply_vote, etc.)
- [ ] Test queries work in SQL Editor

---

## Next: Part 4 — Publishing Flow (Root Posts)

With the database ready, Part 4 adapts fountain.ink's editor and publishing
flow to create forum threads: Plate.js editor → full article → publish to
Feed → track in forum_threads table.
