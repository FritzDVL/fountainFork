# File Inventory — Complete List of Files to Create

## Overview

Every file created across all 10 phases. No existing Fountain files are
replaced — all forum code is additive. The only existing files modified
are noted at the bottom.

---

## Phase 1: Foundation

```
society-forum-auth/.env                          — auth server config
society-forum/.env                               — app config
scripts/register-auth-endpoint.ts                — one-time Lens registration
```

## Phase 2: Lens Primitives

```
scripts/setup-lens-primitives.ts                 — one-time group/feed creation
src/lib/forum/constants.ts                       — 4 onchain addresses + FEED_MAP
src/lib/forum/categories.ts                      — 30 categories, LANDING_SECTIONS (4) + RESEARCH_SECTIONS (1)
```

## Phase 3: Database

```
supabase/migrations/YYYYMMDD_forum_schema.sql    — tables + indexes + functions + RLS
supabase/migrations/YYYYMMDD_seed_categories.sql — 30 category seed rows
```

## Phase 4: Forum Pages

```
# Pages
src/app/boards/page.tsx                          — landing page
src/app/boards/[feed]/page.tsx                   — thread list by category
src/app/thread/[rootPublicationId]/page.tsx      — thread detail

# Data layer
src/lib/forum/get-board-sections.ts              — landing page data
src/lib/forum/get-threads.ts                     — thread list + pagination
src/lib/forum/get-thread-detail.ts               — thread + replies

# Components
src/components/forum/board-section-list.tsx       — section card (list layout)
src/components/forum/board-section-grid.tsx       — section card (grid layout)
src/components/forum/board-category-row.tsx       — single category row
src/components/forum/board-grid-card.tsx          — single grid card
src/components/forum/community-card.tsx           — language community card
src/components/forum/forum-sidebar.tsx            — desktop sidebar
src/components/forum/thread-list-view.tsx         — thread table
src/components/forum/thread-row.tsx               — single thread row
src/components/forum/thread-detail-view.tsx       — stacked posts orchestrator
src/components/forum/forum-post-card.tsx          — single post (root or reply)
src/components/forum/forum-post-content.tsx       — Plate.js readOnly renderer
```

## Phase 5: Composer

```
# Hook
src/hooks/forum/use-composer.ts                  — state machine + actions

# Components
src/components/forum/composer-provider.tsx        — context provider
src/components/forum/composer-panel.tsx           — main panel (fixed bottom)
src/components/forum/composer-header.tsx          — title + board/category/tags
src/components/forum/composer-editor.tsx          — dual-column Plate.js
src/components/forum/composer-toolbar.tsx         — compact bottom toolbar
src/components/forum/composer-draft-bar.tsx       — minimized state bar
src/components/forum/composer-grippie.tsx         — resize drag handle
```

## Phase 6: Publish Flow

```
# Types
src/lib/forum/types.ts                           — ForumDraft interface

# Services
src/lib/forum/publish-thread.ts                  — thread publish pipeline
src/lib/forum/publish-reply.ts                   — reply publish pipeline

# API routes
src/app/api/forum/threads/route.ts               — thread tracking
src/app/api/forum/replies/route.ts               — reply tracking
```

## Phase 7: Forum Features

```
# Hooks
src/hooks/forum/use-forum-vote.ts                — voting (Lens + Supabase)
src/hooks/forum/use-is-moderator.ts              — admin check
src/hooks/forum/use-hide-reply.ts                — hide reply
src/hooks/forum/use-thread-moderation.ts         — pin/lock threads
src/hooks/forum/use-join-group.ts                — group membership
src/hooks/forum/use-membership-management.ts     — approve/deny/ban
src/hooks/forum/use-notifications.ts             — forum-filtered notifications

# Data layer
src/lib/forum/get-user-forum-activity.ts         — profile forum activity

# API routes
src/app/api/forum/votes/route.ts                 — vote tracking
src/app/api/forum/replies/[publicationId]/hide/route.ts — hide reply
src/app/api/forum/threads/[id]/moderate/route.ts — pin/lock
```

## Phase 8: Research

```
# Pages
src/app/research/page.tsx                        — research thread list
src/app/research/thread/[rootPublicationId]/page.tsx — research thread detail

# Data layer
src/lib/forum/get-research-threads.ts            — filtered research queries
src/lib/forum/research-categories.ts             — category colors

# Components
src/components/forum/research-filter-toolbar.tsx  — category + tag dropdowns
src/components/forum/research-thread-row.tsx      — row with badges + tags
src/components/forum/research-post-card.tsx       — #N numbering + hearts

# Hooks
src/hooks/forum/use-heart-reaction.ts            — heart reaction
```

## Phase 9: Recovery & Sync

```
scripts/recover-forum.ts                         — full recovery from Lens
scripts/sync-forum.ts                            — incremental sync
scripts/cache-content.ts                         — backfill content_json
src/app/api/forum/sync/route.ts                  — cron endpoint
```

## Phase 10: Polish & Deploy

```
# Pages
src/app/error.tsx                                — global error boundary
src/app/not-found.tsx                            — 404 page
src/app/sitemap.ts                               — dynamic sitemap
src/app/robots.ts                                — robots.txt

# API
src/app/api/health/route.ts                      — health check

# Utilities
src/lib/forum/rate-limit.ts                      — in-memory rate limiter
src/lib/forum/revalidate.ts                      — ISR revalidation helpers

# Navigation
src/components/forum/forum-header.tsx             — forum header
src/components/forum/forum-mobile-nav.tsx         — mobile bottom nav

# Config
vercel.json                                      — cron config
```

---

## Existing Files Modified (Minimal)

| File | Change | Phase |
|---|---|---|
| `src/middleware.ts` | Add forum domain to `allowedOrigins` | 1 |
| `src/app/layout.tsx` | Conditionally render forum header | 10 |
| `.env` | Add forum-specific env vars | 1 |

---

## Directory Structure Summary

```
src/
├── lib/forum/
│   ├── constants.ts
│   ├── categories.ts
│   ├── research-categories.ts
│   ├── types.ts
│   ├── publish-thread.ts
│   ├── publish-reply.ts
│   ├── get-board-sections.ts
│   ├── get-threads.ts
│   ├── get-thread-detail.ts
│   ├── get-research-threads.ts
│   ├── get-user-forum-activity.ts
│   ├── rate-limit.ts
│   └── revalidate.ts
│
├── hooks/forum/
│   ├── use-composer.ts
│   ├── use-forum-vote.ts
│   ├── use-is-moderator.ts
│   ├── use-hide-reply.ts
│   ├── use-thread-moderation.ts
│   ├── use-join-group.ts
│   ├── use-membership-management.ts
│   ├── use-notifications.ts
│   └── use-heart-reaction.ts
│
├── components/forum/
│   ├── board-section-list.tsx
│   ├── board-section-grid.tsx
│   ├── board-category-row.tsx
│   ├── board-grid-card.tsx
│   ├── community-card.tsx
│   ├── forum-sidebar.tsx
│   ├── thread-list-view.tsx
│   ├── thread-row.tsx
│   ├── thread-detail-view.tsx
│   ├── forum-post-card.tsx
│   ├── forum-post-content.tsx
│   ├── composer-provider.tsx
│   ├── composer-panel.tsx
│   ├── composer-header.tsx
│   ├── composer-editor.tsx
│   ├── composer-toolbar.tsx
│   ├── composer-draft-bar.tsx
│   ├── composer-grippie.tsx
│   ├── research-filter-toolbar.tsx
│   ├── research-thread-row.tsx
│   ├── research-post-card.tsx
│   ├── forum-header.tsx
│   └── forum-mobile-nav.tsx
│
├── app/
│   ├── boards/
│   │   ├── page.tsx
│   │   └── [feed]/page.tsx
│   ├── thread/
│   │   └── [rootPublicationId]/page.tsx
│   ├── research/
│   │   ├── page.tsx
│   │   └── thread/[rootPublicationId]/page.tsx
│   └── api/forum/
│       ├── threads/route.ts
│       ├── threads/[id]/moderate/route.ts
│       ├── replies/route.ts
│       ├── replies/[publicationId]/hide/route.ts
│       ├── votes/route.ts
│       ├── sync/route.ts
│       └── ../health/route.ts
│
scripts/
├── register-auth-endpoint.ts
├── setup-lens-primitives.ts
├── recover-forum.ts
├── sync-forum.ts
└── cache-content.ts

supabase/migrations/
├── YYYYMMDD_forum_schema.sql
└── YYYYMMDD_seed_categories.sql
```

Total new files: ~55 (excluding .env files and one-time scripts)
