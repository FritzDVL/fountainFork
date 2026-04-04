-- ============================================
-- Forum Schema for Society Protocol
-- Sits alongside Fountain.ink's existing tables
-- Uses auth.jwt() pattern (matching Fountain's RLS)
-- ============================================


-- ============================================
-- 1. CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS forum_categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  section TEXT NOT NULL,
  feed TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  thread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_categories_section ON forum_categories(section);
CREATE INDEX idx_forum_categories_feed ON forum_categories(feed);


-- ============================================
-- 2. THREADS
-- ============================================

CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_publication_id TEXT UNIQUE NOT NULL,
  content_uri TEXT,
  feed TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES forum_categories(slug),
  title TEXT NOT NULL,
  summary TEXT,
  content_text TEXT,
  content_json JSONB,
  tags TEXT[] DEFAULT '{}',
  author_address TEXT NOT NULL,
  author_username TEXT,
  reply_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_forum_threads_category ON forum_threads(category);
CREATE INDEX idx_forum_threads_feed ON forum_threads(feed);
CREATE INDEX idx_forum_threads_author ON forum_threads(author_address);
CREATE INDEX idx_forum_threads_created ON forum_threads(created_at DESC);
CREATE INDEX idx_forum_threads_last_reply ON forum_threads(last_reply_at DESC NULLS LAST);
CREATE INDEX idx_forum_threads_pinned ON forum_threads(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_forum_threads_tags ON forum_threads USING GIN (tags);
CREATE INDEX idx_forum_threads_search ON forum_threads
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, '')));


-- ============================================
-- 3. THREAD REPLIES
-- ============================================

CREATE TABLE IF NOT EXISTS forum_thread_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  publication_id TEXT UNIQUE NOT NULL,
  content_uri TEXT,
  position INTEGER NOT NULL,
  content_text TEXT,
  content_json JSONB,
  summary TEXT,
  author_address TEXT NOT NULL,
  author_username TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_forum_replies_thread ON forum_thread_replies(thread_id);
CREATE INDEX idx_forum_replies_position ON forum_thread_replies(thread_id, position);
CREATE INDEX idx_forum_replies_author ON forum_thread_replies(author_address);
CREATE INDEX idx_forum_replies_pub ON forum_thread_replies(publication_id);


-- ============================================
-- 4. VOTES
-- ============================================

CREATE TABLE IF NOT EXISTS forum_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id TEXT NOT NULL,
  account_address TEXT NOT NULL,
  direction SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_vote UNIQUE (publication_id, account_address),
  CONSTRAINT valid_direction CHECK (direction IN (-1, 1))
);

CREATE INDEX idx_forum_votes_pub ON forum_votes(publication_id);
CREATE INDEX idx_forum_votes_account ON forum_votes(account_address);


-- ============================================
-- 5. COMMUNITIES
-- ============================================

CREATE TABLE IF NOT EXISTS forum_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_group_address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  language TEXT,
  members_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION forum_add_reply(p_thread_id UUID, p_reply_time TIMESTAMPTZ DEFAULT NOW())
RETURNS VOID AS $$
BEGIN
  UPDATE forum_threads
  SET reply_count = reply_count + 1, last_reply_at = p_reply_time, updated_at = NOW()
  WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION forum_add_thread_to_category(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_categories SET thread_count = thread_count + 1 WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION forum_increment_views(p_thread_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_threads SET views_count = views_count + 1 WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION forum_apply_vote(p_publication_id TEXT, p_account TEXT, p_direction SMALLINT)
RETURNS VOID AS $$
DECLARE
  old_direction SMALLINT;
  is_thread BOOLEAN;
BEGIN
  SELECT direction INTO old_direction
  FROM forum_votes
  WHERE publication_id = p_publication_id AND account_address = p_account;

  IF FOUND THEN
    IF old_direction = p_direction THEN
      -- Same vote again → remove it
      DELETE FROM forum_votes WHERE publication_id = p_publication_id AND account_address = p_account;
      is_thread := EXISTS (SELECT 1 FROM forum_threads WHERE root_publication_id = p_publication_id);
      IF is_thread THEN
        IF p_direction = 1 THEN UPDATE forum_threads SET upvotes = upvotes - 1 WHERE root_publication_id = p_publication_id;
        ELSE UPDATE forum_threads SET downvotes = downvotes - 1 WHERE root_publication_id = p_publication_id; END IF;
      ELSE
        IF p_direction = 1 THEN UPDATE forum_thread_replies SET upvotes = upvotes - 1 WHERE publication_id = p_publication_id;
        ELSE UPDATE forum_thread_replies SET downvotes = downvotes - 1 WHERE publication_id = p_publication_id; END IF;
      END IF;
    ELSE
      -- Different direction → flip
      UPDATE forum_votes SET direction = p_direction WHERE publication_id = p_publication_id AND account_address = p_account;
      is_thread := EXISTS (SELECT 1 FROM forum_threads WHERE root_publication_id = p_publication_id);
      IF is_thread THEN
        IF p_direction = 1 THEN UPDATE forum_threads SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE root_publication_id = p_publication_id;
        ELSE UPDATE forum_threads SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE root_publication_id = p_publication_id; END IF;
      ELSE
        IF p_direction = 1 THEN UPDATE forum_thread_replies SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE publication_id = p_publication_id;
        ELSE UPDATE forum_thread_replies SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE publication_id = p_publication_id; END IF;
      END IF;
    END IF;
  ELSE
    -- New vote
    INSERT INTO forum_votes (publication_id, account_address, direction) VALUES (p_publication_id, p_account, p_direction);
    is_thread := EXISTS (SELECT 1 FROM forum_threads WHERE root_publication_id = p_publication_id);
    IF is_thread THEN
      IF p_direction = 1 THEN UPDATE forum_threads SET upvotes = upvotes + 1 WHERE root_publication_id = p_publication_id;
      ELSE UPDATE forum_threads SET downvotes = downvotes + 1 WHERE root_publication_id = p_publication_id; END IF;
    ELSE
      IF p_direction = 1 THEN UPDATE forum_thread_replies SET upvotes = upvotes + 1 WHERE publication_id = p_publication_id;
      ELSE UPDATE forum_thread_replies SET downvotes = downvotes + 1 WHERE publication_id = p_publication_id; END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION forum_search_threads(search_query TEXT, result_limit INT DEFAULT 30)
RETURNS SETOF forum_threads AS $$
  SELECT * FROM forum_threads
  WHERE is_hidden = FALSE
    AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_text,''))
        @@ websearch_to_tsquery('english', search_query)
  ORDER BY created_at DESC
  LIMIT result_limit;
$$ LANGUAGE sql STABLE;


-- ============================================
-- 7. ROW LEVEL SECURITY
-- Uses auth.jwt() pattern matching Fountain's existing RLS
-- Reuses existing is_admin() function from Fountain migrations
-- ============================================

ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_thread_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_communities ENABLE ROW LEVEL SECURITY;

-- Categories: public read, admin write
CREATE POLICY "forum_categories_select" ON forum_categories FOR SELECT USING (true);
CREATE POLICY "forum_categories_admin" ON forum_categories FOR ALL USING (is_admin());

-- Threads: public read, authenticated insert, author-or-admin update
CREATE POLICY "forum_threads_select" ON forum_threads FOR SELECT USING (true);
CREATE POLICY "forum_threads_insert" ON forum_threads FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'sub') IS NOT NULL
);
CREATE POLICY "forum_threads_update" ON forum_threads FOR UPDATE USING (
  author_address = (auth.jwt() ->> 'sub') OR is_admin()
);

-- Replies: public read, authenticated insert, author-or-admin update
CREATE POLICY "forum_replies_select" ON forum_thread_replies FOR SELECT USING (true);
CREATE POLICY "forum_replies_insert" ON forum_thread_replies FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'sub') IS NOT NULL
);
CREATE POLICY "forum_replies_update" ON forum_thread_replies FOR UPDATE USING (
  author_address = (auth.jwt() ->> 'sub') OR is_admin()
);

-- Votes: public read, own votes only for write
CREATE POLICY "forum_votes_select" ON forum_votes FOR SELECT USING (true);
CREATE POLICY "forum_votes_insert" ON forum_votes FOR INSERT WITH CHECK (
  account_address = (auth.jwt() ->> 'sub')
);
CREATE POLICY "forum_votes_delete" ON forum_votes FOR DELETE USING (
  account_address = (auth.jwt() ->> 'sub')
);

-- Communities: public read, admin write
CREATE POLICY "forum_communities_select" ON forum_communities FOR SELECT USING (true);
CREATE POLICY "forum_communities_admin" ON forum_communities FOR ALL USING (is_admin());


-- ============================================
-- 8. GRANTS (allow Supabase API access)
-- ============================================

GRANT ALL ON forum_categories TO postgres, anon, authenticated, service_role;
GRANT ALL ON forum_threads TO postgres, anon, authenticated, service_role;
GRANT ALL ON forum_thread_replies TO postgres, anon, authenticated, service_role;
GRANT ALL ON forum_votes TO postgres, anon, authenticated, service_role;
GRANT ALL ON forum_communities TO postgres, anon, authenticated, service_role;
