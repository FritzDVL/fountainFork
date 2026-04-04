# Phase 3: Database — Forum Schema & Seed Data (UPDATED)

## Goal

Create the Supabase tables that power the forum's speed layer. Seed the
30 categories. By the end, the database is ready for forum data.

## Depends On

Phase 1 ✅ (Supabase self-hosted on VPS, migrations run via docker exec)

---

## Execution Method

All SQL runs on the VPS via:
```bash
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/file.sql
```

We create the SQL files locally, then copy them to VPS and execute.

---

## Step 3.1: Create the Forum Schema Migration

**File:** `supabase/migrations/20260405_forum_schema.sql`

Creates 5 tables + indexes + helper functions + RLS policies.

### Tables

| Table | Purpose |
|---|---|
| `forum_categories` | Board categories (slug PK, static reference) |
| `forum_threads` | Thread metadata + content cache |
| `forum_thread_replies` | Reply metadata + content cache |
| `forum_votes` | Upvotes/downvotes per publication |
| `forum_communities` | Language/topic community groups |

### Key Design Decisions
- `content_json JSONB` on threads AND replies from day one
- `content_text TEXT` for full-text search (GIN index)
- `tags TEXT[]` on threads from day one (not deferred to Phase 8)
- `forum_` prefix on all tables
- RLS uses `auth.jwt() ->> 'sub'` (Fountain's pattern)
- Reuses existing `is_admin()` function

---

## Step 3.2: Create the Seed Migration

**File:** `supabase/migrations/20260405_seed_categories.sql`

Inserts 30 categories matching `src/lib/forum/categories.ts`:
- 4 General Discussion (commons)
- 11 Functions (research)
- 6 Technical (research)
- 4 Partner Communities (commons)
- 5 Others (commons)

---

## Step 3.3: Copy Files to VPS and Execute

```bash
# From Mac: copy migration files to VPS
scp supabase/migrations/20260405_forum_schema.sql root@72.61.119.100:/tmp/
scp supabase/migrations/20260405_seed_categories.sql root@72.61.119.100:/tmp/

# On VPS: run them
docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260405_forum_schema.sql
docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260405_seed_categories.sql
```

If SCP fails (password issue), alternative: paste SQL directly on VPS:
```bash
# On VPS:
cat > /tmp/20260405_forum_schema.sql << 'SQLEOF'
... paste SQL here ...
SQLEOF
docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260405_forum_schema.sql
```

---

## Step 3.4: Verify

Run these on VPS to confirm everything worked:

```bash
# Count categories
docker exec supabase-db psql -U postgres -d postgres -c "SELECT count(*) FROM forum_categories;"
# Expected: 30

# Check sections
docker exec supabase-db psql -U postgres -d postgres -c "SELECT section, count(*) FROM forum_categories GROUP BY section ORDER BY section;"
# Expected: functions=11, general=4, others=5, partners=4, technical=6

# Test thread insert
docker exec supabase-db psql -U postgres -d postgres -c "
INSERT INTO forum_threads (root_publication_id, feed, category, title, author_address, author_username)
VALUES ('test-pub-1', 'commons', 'beginners', 'Test thread', '0xtest', 'testuser')
RETURNING id, title;
"

# Test reply insert
docker exec supabase-db psql -U postgres -d postgres -c "
INSERT INTO forum_thread_replies (thread_id, publication_id, position, author_address, author_username)
VALUES ((SELECT id FROM forum_threads WHERE root_publication_id = 'test-pub-1'), 'test-reply-1', 1, '0xtest', 'testuser')
RETURNING id, position;
"

# Test helper function
docker exec supabase-db psql -U postgres -d postgres -c "SELECT forum_add_thread_to_category('beginners');"
docker exec supabase-db psql -U postgres -d postgres -c "SELECT slug, thread_count FROM forum_categories WHERE slug = 'beginners';"
# Expected: thread_count = 1

# Test search
docker exec supabase-db psql -U postgres -d postgres -c "SELECT * FROM forum_search_threads('test', 10);"

# Clean up test data
docker exec supabase-db psql -U postgres -d postgres -c "
DELETE FROM forum_thread_replies WHERE publication_id = 'test-reply-1';
DELETE FROM forum_threads WHERE root_publication_id = 'test-pub-1';
UPDATE forum_categories SET thread_count = 0 WHERE slug = 'beginners';
"
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
| T3.6 | Call `forum_search_threads('test', 10)` | Returns matching threads |
| T3.7 | Tables have correct indexes | All indexes created |
| T3.8 | RLS enabled on all tables | Confirmed via `\dt+` |

---

## Files Created

```
supabase/migrations/20260405_forum_schema.sql      — tables + indexes + functions + RLS
supabase/migrations/20260405_seed_categories.sql    — 30 category rows
```
