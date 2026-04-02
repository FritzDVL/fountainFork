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

| # | Test | Expected Result |
|---|---|---|
| T2.1 | `fetchGroup(COMMONS_GROUP_ADDRESS)` | Returns group with name "Society-Commons" |
| T2.2 | `fetchGroup(RESEARCH_GROUP_ADDRESS)` | Returns group with name "Society-Research" |
| T2.3 | `fetchFeed(COMMONS_FEED_ADDRESS)` | Returns feed with groupGatedRule |
| T2.4 | `fetchFeed(RESEARCH_FEED_ADDRESS)` | Returns feed with groupGatedRule |
| T2.5 | Post to Commons Feed WITHOUT membership | Rejected by GroupGatedFeedRule |
| T2.6 | Post to Commons Feed AFTER approval | Succeeds |
| T2.7 | Import constants in app, no TS errors | Compiles clean |

## Files Created

```
scripts/setup-lens-primitives.ts     — one-time creation script
src/lib/forum/constants.ts           — 4 addresses + FEED_MAP
src/lib/forum/categories.ts          — 30 categories, 5 sections
```
