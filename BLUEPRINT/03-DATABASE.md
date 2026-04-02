# Phase 3: Database — Forum Schema & Seed Data

## Goal

Create the Supabase tables that power the forum's speed layer. Seed the
30 categories. By the end, the database is ready for forum data.

## Depends On

Phase 1 (Supabase project configured)

---

## Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `forum_categories` | Board categories (static reference) | slug PK, name, section, feed, thread_count |
| `forum_threads` | Thread metadata + content cache | root_publication_id UNIQUE, category FK, content_json, content_text |
| `forum_thread_replies` | Reply metadata + content cache | publication_id UNIQUE, thread_id FK, position, content_json |
| `forum_votes` | Upvotes/downvotes per publication | publication_id + account_address UNIQUE |
| `forum_communities` | Language/topic community groups | lens_group_address UNIQUE |

## Steps

### 3.1 Create Migration

`supabase/migrations/YYYYMMDD_forum_schema.sql`

Key design decisions:
- `content_json JSONB` on threads AND replies from day one (not deferred)
- `content_text TEXT` for full-text search (GIN index)
- `forum_` prefix on all tables to avoid conflicts with Fountain's tables
- `root_publication_id` is the Lens post ID (string, not UUID)

### 3.2 Create Seed Migration

`supabase/migrations/YYYYMMDD_seed_categories.sql`

Insert 30 categories matching `src/lib/forum/categories.ts`:
- 4 General Discussion (commons)
- 4 Partner Communities (commons)
- 11 Functions (research)
- 6 Technical (research)
- 5 Others (commons)

### 3.3 Create Helper Functions

SQL functions called via `db.rpc()`:
- `forum_add_reply(thread_id, reply_time)` — increment reply_count + update last_reply_at
- `forum_add_thread_to_category(slug)` — increment thread_count
- `forum_increment_views(thread_id)` — increment views_count
- `forum_apply_vote(publication_id, account, direction)` — upsert vote + update counters
- `forum_search_threads(query, limit)` — full-text search via GIN index

### 3.4 Create RLS Policies

Tightened policies (not `USING (true)` for everything):
- Categories: public read, admin-only write
- Threads: public read, authenticated insert, author-or-admin update
- Replies: public read, authenticated insert, author-or-admin update
- Votes: public read, own-votes-only for write
- Communities: public read, admin-only write

**Important:** Verify JWT claim path against Fountain's actual token
structure before deploying. Expected path:
`(current_setting('request.jwt.claims')::json->>'metadata')::json->>'address'`

### 3.5 Apply Migrations

```bash
cd supabase && supabase db push
```

Or paste SQL into Supabase SQL Editor.

---

## Indexes

```sql
-- Threads
idx_forum_threads_category       (category)
idx_forum_threads_feed           (feed)
idx_forum_threads_created        (created_at DESC)
idx_forum_threads_last_reply     (last_reply_at DESC NULLS LAST)
idx_forum_threads_pinned         (is_pinned) WHERE is_pinned = TRUE
idx_forum_threads_search         GIN (to_tsvector on title + content_text)

-- Replies
idx_forum_replies_thread         (thread_id)
idx_forum_replies_position       (thread_id, position)

-- Votes
idx_forum_votes_pub              (publication_id)
```

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T3.1 | Query `forum_categories` | Returns 30 rows |
| T3.2 | Filter categories by section='general' | Returns 4 rows |
| T3.3 | Insert test thread row | Succeeds, UUID generated |
| T3.4 | Insert test reply row | Succeeds, FK to thread valid |
| T3.5 | Call `forum_add_thread_to_category('beginners')` | thread_count increments |
| T3.6 | Call `forum_apply_vote(pubId, account, 1)` | Vote row created, upvotes incremented |
| T3.7 | Call `forum_apply_vote` again with same direction | Vote removed (toggle off) |
| T3.8 | Call `forum_search_threads('lens account')` | Returns matching threads |
| T3.9 | Unauthenticated user tries to INSERT thread | Blocked by RLS |
| T3.10 | Non-author tries to UPDATE thread | Blocked by RLS |

## Files Created

```
supabase/migrations/YYYYMMDD_forum_schema.sql      — tables + indexes + RLS
supabase/migrations/YYYYMMDD_seed_categories.sql    — 30 category rows
```

## Schema Diagram

```
forum_categories (slug PK)
    ↑
forum_threads (id UUID PK, category FK)
    ↑
forum_thread_replies (id UUID PK, thread_id FK)

forum_votes (id UUID PK, publication_id + account_address UNIQUE)

forum_communities (id UUID PK, lens_group_address UNIQUE)
```
