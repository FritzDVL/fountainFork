# Phase 2: Lens Primitives — Groups & Feeds

## Goal

Create the 2 Groups and 2 Feeds onchain, register them with the Lens App,
and save addresses in a constants file. By the end, you have group-gated
feeds ready to receive publications.

## Depends On

Phase 1 (Builder auth working)

---

## What Gets Created

```
Lens App (0x637E...)
├── Commons Group    (MembershipApprovalGroupRule)
├── Research Group   (MembershipApprovalGroupRule)
├── Commons Feed     (GroupGatedFeedRule → Commons Group)
└── Research Feed    (GroupGatedFeedRule → Research Group)
```

## Steps

### 2.1 Create Setup Script

`scripts/setup-lens-primitives.ts` — authenticates as Builder, creates
all 4 primitives in sequence, registers them with the app.

See MasterPlanV2 Part 2 for the full script. Key operations:
1. `createGroup()` × 2 (with `membershipApprovalRule`)
2. `createFeed()` × 2 (with `groupGatedRule` pointing to respective group)
3. `addAppFeeds()` — register both feeds
4. `addAppGroups()` — register both groups

### 2.2 Run Script & Save Addresses

```bash
npx tsx scripts/setup-lens-primitives.ts
```

Save the 4 output addresses.

### 2.3 Create Constants File

```
src/lib/forum/constants.ts
```

Contains: `COMMONS_GROUP_ADDRESS`, `RESEARCH_GROUP_ADDRESS`,
`COMMONS_FEED_ADDRESS`, `RESEARCH_FEED_ADDRESS`, `FEED_MAP`, `FeedType`.

### 2.4 Create Categories Config

```
src/lib/forum/categories.ts
```

30 categories across 5 sections. Each category maps to a feed type
(commons or research). Includes flat lookup helpers:
`ALL_CATEGORIES`, `getCategoryBySlug()`, `getCategoriesByFeed()`.

### 2.5 Approve Initial Members

Approve yourself (and co-founders) as members of both groups:
1. `joinGroup(userSession, { group: COMMONS_GROUP_ADDRESS })`
2. `approveGroupMembershipRequests(adminSession, { group, members })`

---

## Acceptance Tests

| # | Test | Expected Result | Status |
|---|---|---|---|
| T2.1 | `fetchGroup(COMMONS_GROUP_ADDRESS)` | Returns group with name "Society-Commons-Open" | ✅ |
| T2.2 | `fetchGroup(RESEARCH_GROUP_ADDRESS)` | Returns group with name "Society-Research-Open" | ✅ |
| T2.3 | `fetchFeed(COMMONS_FEED_ADDRESS)` | Returns feed with groupGatedRule | ✅ |
| T2.4 | `fetchFeed(RESEARCH_FEED_ADDRESS)` | Returns feed with groupGatedRule | ✅ |
| T2.5 | Post to Commons Feed WITHOUT membership | Rejected by GroupGatedFeedRule | Deferred |
| T2.6 | Post to Commons Feed AFTER joining | Succeeds | Deferred to Phase 6 |
| T2.7 | Import constants in app, no TS errors | Compiles clean | ✅ |

## Completion Notes (2026-04-04)

### Decision: Open Groups (no MembershipApprovalGroupRule)

First attempt used `membershipApprovalRule` which blocked join requests
via scripts. Recreated groups without the rule — open membership, anyone
can join. Membership approval can be added later via group rule updates.

### Addresses (v2 — open groups)
- Commons Group: `0xC49d554071dC12498Df4bDCD39E337062c782644`
- Research Group: `0x7f2b18933152DF1c6ded211583c95A739831743d`
- Commons Feed: `0x3e7EEfaC1cF8Aaf260d045694B2312139f46fd03`
- Research Feed: `0xb3E74A66c813b79c63Db6A5f13D57ffBDa62D590`

### Old addresses (v1 — approval-gated, unused)
- Commons Group: `0x724CCb155b813b8a21E7C452167d22828871c7E1`
- Research Group: `0x73D8A1c03C3e5a7686295574f4Fce2F08ea908B8`
- Commons Feed: `0x43cF2ECc67D02d6F262Ed789de98f1950AAF8a2C`
- Research Feed: `0x0eC9c71e865a8690D5285B278320a251331d6321`

## Files Created

```
scripts/setup-lens-primitives.ts     — one-time creation script
src/lib/forum/constants.ts           — 4 addresses + FEED_MAP
src/lib/forum/categories.ts          — 30 categories, 5 sections
```
