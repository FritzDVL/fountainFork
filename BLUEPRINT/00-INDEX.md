# BLUEPRINT — Society Protocol Forum Implementation Plan

## What This Is

A structured, exhaustive execution plan for building a Discourse-style forum
on top of a Fountain.ink fork. Each phase is a self-contained deliverable
with clear inputs, outputs, acceptance tests, and visual references.

## Source Documents

All specs were derived from merging:
- `PlanExecution/CoreConceptV5.md` — architecture & terminology
- `PlanExecution/ComposerSpec.md` — Discourse-style composer panel
- `PlanExecution/ComposerDiscourse.md` — reverse-engineered Discourse UX
- `PlanExecution/MasterPlanV2.md` — 10-part implementation plan + corrections
- `PlanExecution/mockup-landing-fountain.html` — landing page visual
- `PlanExecution/mockup-board-fountain.html` — board/thread list visual
- `PlanExecution/mockup-research-fountain.html` — research section visual
- `PlanExecution/LandingPageExample.md` — landing page component spec
- `PlanExecution/BoardExample.md` — board + thread detail component spec
- `PlanExecution/ResearchExample.md` — research section component spec

## Guiding Principles

1. **Don't break Fountain.** All forum code is additive — new files, new
   routes, new tables. Existing Fountain features remain functional.
2. **Small, testable milestones.** Each phase produces something you can
   see and verify before moving on.
3. **Supabase = speed layer, Lens = truth.** Forum tables cache onchain
   data. Everything is recoverable from Lens Protocol.
4. **Same editor, different wrapper.** Plate.js powers both Fountain's
   article editor and the forum composer. Same plugins, same formatting.

## Phase Overview

| # | Phase | Deliverable | Status | Completed |
|---|---|---|---|---|
| 1 | [Foundation](./01-FOUNDATION.md) | Fork running, auth working, publish verified | ✅ DONE | 2026-04-04 |
| 2 | [Lens Primitives](./02-LENS-PRIMITIVES.md) | 2 Groups + 2 Feeds created onchain | ✅ DONE | 2026-04-04 |
| 3 | [Database](./03-DATABASE.md) | Forum tables + seed data in Supabase | ✅ DONE | 2026-04-05 |
| 4 | [Forum Pages](./04-FORUM-PAGES.md) | Landing, board list, thread detail pages | ✅ DONE | 2026-04-05 |
| 5 | [Composer](./05-COMPOSER.md) | Discourse-style bottom panel composer | ✅ DONE | 2026-04-05 |
| 6 | [Publish Flow](./06-PUBLISH-FLOW.md) | Thread creation + reply publishing | ✅ DONE | 2026-04-06 |
| 7 | [Forum Features](./07-FORUM-FEATURES.md) | Voting, moderation, quote-reply | ✅ DONE | 2026-04-06 |
| 8 | [Research Section](./08-RESEARCH.md) | Token-gated research with categories + tags | ✅ DONE | 2026-04-07 |
| 9 | [Recovery & Sync](./09-RECOVERY-SYNC.md) | Background sync + full recovery script | ✅ DONE | 2026-04-07 |
| 10 | [Polish & Deploy](./10-POLISH-DEPLOY.md) | SEO, caching, error handling, production | ⬜ Next | — |

## Dependency Graph

```
Phase 1 (Foundation)
  ├─→ Phase 2 (Lens Primitives)
  └─→ Phase 3 (Database)
        └─→ Phase 4 (Forum Pages)
              └─→ Phase 5 (Composer)
                    └─→ Phase 6 (Publish Flow) ←── Phase 2
                          ├─→ Phase 7 (Forum Features)
                          │     └─→ Phase 8 (Research)
                          └─→ Phase 9 (Recovery & Sync)
                                └─→ Phase 10 (Polish & Deploy)
```

Phases 2 and 3 can run in parallel after Phase 1.

## File Naming Convention

All new forum code lives under these paths:
```
src/lib/forum/          — services, types, constants
src/components/forum/   — React components
src/hooks/forum/        — React hooks
src/app/boards/         — board pages
src/app/thread/         — thread pages
src/app/api/forum/      — API routes
supabase/migrations/    — forum schema migrations
```

No existing Fountain files are modified except:
- `src/app/layout.tsx` — add forum header (conditionally)
- `src/middleware.ts` — add forum domain to allowedOrigins
- `.env` — add forum-specific env vars

## Visual References

The mockup HTML files in `PlanExecution/` are the visual source of truth:
- `mockup-landing-fountain.html` → Phase 4 landing page
- `mockup-board-fountain.html` → Phase 4 thread list
- `mockup-research-fountain.html` → Phase 8 research section

Open them in a browser to see the exact target UI.
