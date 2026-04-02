# Test Plan — All Phases

## Testing Strategy

Each phase has inline acceptance tests (T1.1, T2.1, etc.) in its spec file.
This document consolidates them and adds integration tests that span phases.

Tests are organized as:
- **Unit tests** — individual functions, hooks, utilities
- **Integration tests** — API routes, data flow, publish pipeline
- **E2E tests** — full user flows in the browser

No test code is written yet. This is the plan for WHAT to test.

---

## Phase 1: Foundation

### Manual Verification
- T1.1: App starts without errors (`bun run dev`)
- T1.2: Login flow works (wallet → Lens account → session)
- T1.3: Editor loads and accepts input
- T1.4: Publish test article → appears on Lens
- T1.5: Post shows YOUR app name on Hey.xyz
- T1.6: Auth server responds < 500ms
- T1.7: Auth endpoint rejects wrong secret

---

## Phase 2: Lens Primitives

### Script Verification
- T2.1–T2.4: Fetch each group/feed, verify metadata
- T2.5: Post without membership → rejected
- T2.6: Post after approval → succeeds
- T2.7: Constants file imports cleanly

---

## Phase 3: Database

### SQL Tests (run in Supabase SQL Editor)
- T3.1: `SELECT count(*) FROM forum_categories` → 30
- T3.2: `SELECT * FROM forum_categories WHERE section = 'general'` → 4 rows
- T3.3: Insert thread → UUID generated
- T3.4: Insert reply with FK → succeeds
- T3.5: `SELECT forum_add_thread_to_category('beginners')` → count increments
- T3.6–T3.7: Vote apply + toggle
- T3.8: Full-text search returns results
- T3.9–T3.10: RLS blocks unauthorized operations

### Unit Tests (when code is written)
```
test("getCategoryBySlug returns correct category")
test("getCategoriesByFeed filters correctly")
test("SECTIONS has 5 entries")
test("ALL_CATEGORIES has 30 entries")
```

---

## Phase 4: Forum Pages

### Component Tests
```
test("BoardSectionList renders section title")
test("BoardSectionList renders all categories in section")
test("BoardCategoryRow shows thread count and activity")
test("ThreadListView renders thread rows sorted by pinned first")
test("ThreadRow shows pin icon for pinned threads")
test("ThreadRow shows lock icon for locked threads")
test("ThreadDetailView renders root post + replies in order")
test("ForumPostCard shows author, position, timestamp")
test("ForumPostContent renders Plate.js JSON in readOnly mode")
test("Empty category shows 'No threads yet' message")
```

### Data Layer Tests
```
test("getBoardSections returns all 5 sections with categories")
test("getThreadsByCategory filters by category slug")
test("getThreadsByCategory sorts pinned first, then by last_reply_at")
test("getThreadsByCategory paginates correctly")
test("getThreadDetail returns thread + replies ordered by position")
test("getThreadDetail increments view count")
test("getThreadDetail returns null for non-existent thread")
```

### E2E Tests
```
test("Navigate /boards → click category → see thread list")
test("Navigate thread list → click thread → see stacked posts")
test("Breadcrumb navigation: Boards → Category → Thread")
test("Mobile: stats columns hidden on thread list")
```

---

## Phase 5: Composer

### Hook Tests
```
test("useComposer starts in closed state")
test("openNewThread transitions to open state")
test("openReply sets threadRef and mode=reply")
test("minimize transitions to draft state")
test("close transitions to closed state")
test("toggleFullscreen toggles between open and fullscreen")
test("setHeight persists to localStorage")
test("height restored from localStorage on mount")
```

### Component Tests
```
test("ComposerPanel not visible when closed")
test("ComposerPanel slides up when opened")
test("ComposerPanel covers viewport in fullscreen")
test("ComposerDraftBar shows draft title")
test("ComposerDraftBar click expands to open")
test("ComposerHeader shows title + category for thread mode")
test("ComposerHeader shows 'Replying to' for reply mode")
test("ComposerEditor syncs content to preview column")
test("ComposerToolbar renders formatting buttons")
test("Grippie drag changes panel height")
```

### E2E Tests
```
test("Click 'New Thread' → composer opens with category pre-selected")
test("Type in editor → preview updates in real-time")
test("Minimize → draft bar visible → click → expands")
test("Escape key minimizes composer")
test("Cmd+Enter triggers submit")
test("Close button closes composer")
test("Mobile: composer is fullscreen")
```

---

## Phase 6: Publish Flow

### Service Tests
```
test("publishThread builds correct article metadata")
test("publishThread includes forumCategory attribute")
test("publishThread uploads to Grove and gets contentUri")
test("publishThread posts to correct feed based on category")
test("publishThread returns publicationId on success")
test("publishThread returns error for invalid category")

test("publishReply includes commentOn pointing to root")
test("publishReply includes forumThreadId attribute")
test("publishReply posts to same feed as root")
```

### API Route Tests
```
test("POST /api/forum/threads creates thread row")
test("POST /api/forum/threads increments category thread_count")
test("POST /api/forum/threads stores content_json")
test("POST /api/forum/replies creates reply row with correct position")
test("POST /api/forum/replies updates thread reply_count")
test("POST /api/forum/replies updates thread last_reply_at")
test("POST /api/forum/replies returns 404 for non-existent thread")
```

### Integration Tests
```
test("Full thread creation: editor → publish → Lens → Supabase → page renders")
test("Full reply creation: editor → publish → Lens → Supabase → appears in thread")
test("Thread appears in correct category list after creation")
test("Reply increments reply count visible on thread list")
```

---

## Phase 7: Forum Features

### Voting Tests
```
test("useForumVote returns initial score from props")
test("upvote increases score by 1")
test("upvote again toggles off (score decreases)")
test("downvote after upvote flips (score changes by 2)")
test("vote syncs to Supabase via API")
test("vote without login shows error")
```

### Moderation Tests
```
test("useIsModerator returns true for group admin")
test("useIsModerator returns false for regular user")
test("useHideReply marks reply hidden in Supabase")
test("Hidden reply not visible in thread detail")
test("Pin thread: appears first in list with icon")
test("Lock thread: reply editor hidden")
```

### Quote-Reply Tests
```
test("Click reply button opens composer in reply mode")
test("Quoted text inserted as blockquote in editor")
test("Quote attribution includes author and post number")
```

---

## Phase 8: Research

### Component Tests
```
test("ResearchFilterToolbar renders category + tag dropdowns")
test("Category dropdown shows colored squares")
test("Selecting category filters thread list")
test("Selecting tag filters thread list")
test("Combined category + tag filter works")
test("ResearchThreadRow shows category badge + tags")
test("ResearchPostCard shows #N numbering")
test("Heart reaction toggles on click")
```

---

## Phase 9: Recovery & Sync

### Recovery Tests
```
test("Recovery on empty DB: all threads reconstructed")
test("Recovery: thread count matches Lens post count")
test("Recovery: reply positions are sequential by timestamp")
test("Recovery: categories read from forumCategory attribute")
test("Recovery: content_json populated from metadata")
test("Recovery is idempotent (run twice, no duplicates)")
test("Forum pages work after recovery")
```

### Sync Tests
```
test("Sync catches post made via Hey.xyz")
test("Sync marks deleted post as hidden")
test("Sync refreshes edited post content")
test("Sync assigns default category for unknown posts")
```

---

## Phase 10: Polish & Deploy

### Production Tests
```
test("Production build succeeds")
test("All pages load without 500 errors")
test("Login works on production domain")
test("Thread creation works on production")
test("SEO: OG tags present on thread pages")
test("Sitemap returns valid XML")
test("404 page renders for invalid routes")
test("Error boundary catches runtime errors")
test("Rate limit returns 429 after threshold")
test("Health check returns 200")
test("Mobile layout: bottom nav visible")
test("ISR: page updates within revalidation window")
```

---

## Cross-Phase Integration Tests

```
test("Full lifecycle: create thread → reply → vote → view on thread list")
test("Moderator flow: pin thread → lock → hide reply")
test("Recovery flow: wipe Supabase → run recovery → forum works")
test("Sync flow: post via Hey.xyz → sync → appears in forum")
test("Auth flow: non-member blocked → join → approved → can post")
test("Content cache: publish → content_json in DB → renders without Lens API")
```
