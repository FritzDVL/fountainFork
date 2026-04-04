# Post-Execution Audit: Impact of Phase 1-2 on Phases 3-10

Generated: 2026-04-05 after completing Phases 1 and 2.

---

## What We Learned During Execution

### Infrastructure Decisions
- **Self-hosted Supabase** on VPS via Docker (not cloud Supabase)
- **Auth server** on same VPS via PM2 (not Railway/Render)
- **All services on one VPS** (72.61.119.100)
- **Migrations run via `docker exec`** (not `supabase db push` — TLS issue)

### Lens SDK Discoveries
- SDK uses `canary` version — some parameter names differ from docs
  (e.g., `accounts` not `members` in `approveGroupMembershipRequests`)
- `MembershipApprovalGroupRule` blocks `joinGroup` via scripts — hard to
  automate. Switched to open groups.
- Builder auth works fine via scripts with `privateKeyToAccount`
- Private key MUST have `0x` prefix — no spaces

### Fountain Codebase Discoveries
- JWT uses `auth.jwt() ->> 'sub'` for user address (not `current_setting`)
- `is_admin()` function already exists — reuse it
- `IFRAMELY_API_KEY` required (not just `IFRAMELY_BASE_URL`)
- Cookie clear bug on logout (non-ASCII chars)
- `NEXT_PUBLIC_SITE_URL` controls share URLs (defaults to fountain.ink)
- Lens client `origin` is hardcoded to `https://fountain.ink`

---

## Phase-by-Phase Impact

### Phase 3: Database ⚠️ CHANGES NEEDED

| Blueprint says | Change to |
|---|---|
| RLS uses `current_setting('request.jwt.claims')` | Use `auth.jwt()` — Fountain's pattern |
| Custom admin check in policies | Reuse existing `is_admin()` function |
| Run via `supabase db push` | Run via `docker exec` on VPS |
| `tags TEXT[]` column mentioned in Phase 8 | Include in Phase 3 schema from day one |

**Action:** Write migration using `auth.jwt() ->> 'sub'` for author checks
and `is_admin()` for admin checks. Include `tags` column on `forum_threads`.

### Phase 4: Forum Pages ⚠️ MINOR CHANGES

| Blueprint says | Change to |
|---|---|
| `import { createClient } from "@/lib/db/server"` | Confirmed correct — Fountain uses this pattern |
| `<PlateEditor value={contentJson} readOnly={true} />` | Need to verify exact prop names against Fountain's editor component |

**Action:** Before building, inspect `src/components/editor/editor.tsx` to
confirm the exact props for readOnly rendering. The component may use
`value` as a string (JSON.stringify) not an object.

### Phase 5: Composer ✅ NO CHANGES

Blueprint is still accurate. Plate.js integration approach is correct.
The composer is new code that doesn't touch existing Fountain components.

### Phase 6: Publish Flow ⚠️ CHANGES NEEDED

| Blueprint says | Change to |
|---|---|
| T6.13: "Publish without group membership → rejected" | Groups are now open — anyone can join freely. Test becomes: "User must join group before posting to feed" |
| `publishThread` receives `sessionClient` as param | Confirmed correct pattern from Fountain's codebase |
| Uses `storageClient` from `src/lib/lens/storage-client` | Need to verify this import exists and works |

**Action:** Before Phase 6, user needs to join both groups (simple
`joinGroup` call — no approval needed now). Verify `storageClient` export.

### Phase 7: Forum Features ⚠️ CHANGES NEEDED

| Blueprint says | Change to |
|---|---|
| Feature 4: Group Membership with approval flow | Simplify — groups are open, `joinGroup` is instant |
| T7.13-T7.15: Membership approval tests | Replace with: "User joins group → can post immediately" |
| `use-membership-management.ts` (approve/deny) | Defer — not needed with open groups |

**Action:** Remove approval workflow from Phase 7 scope. Keep `joinGroup`
hook but it's now a simple one-step operation.

### Phase 8: Research ⚠️ MINOR CHANGES

| Blueprint says | Change to |
|---|---|
| "Token-gated posting" | Defer token gating — groups are open for now |
| `tags TEXT[]` added in Phase 8 migration | Move to Phase 3 migration (include from day one) |
| T8.13: "Non-token-holder tries to post → rejected" | Defer this test |

**Action:** Include `tags` column in Phase 3. Token gating is a future
enhancement, not needed for MVP.

### Phase 9: Recovery & Sync ⚠️ CHANGES NEEDED

| Blueprint says | Change to |
|---|---|
| Service client: `createClient(URL, SERVICE_KEY)` | Correct, but URL must be `http://72.61.119.100:8000` (self-hosted) |
| Deployment: Vercel Cron / system cron | Use system cron on VPS (we're not on Vercel) |
| Scripts run from anywhere | Scripts must run on VPS or use VPS Supabase URL |

**Action:** Recovery/sync scripts use VPS Supabase URL. Deploy as system
cron on VPS, not Vercel cron.

### Phase 10: Polish & Deploy ⚠️ CHANGES NEEDED

| Blueprint says | Change to |
|---|---|
| Deploy app to Vercel | Deploy to VPS (we already have the infrastructure) |
| Auth server to Railway/Fly.io | Already on VPS ✅ |
| Database on Supabase cloud | Already self-hosted on VPS ✅ |
| `vercel.json` for cron | Use system cron (`crontab`) on VPS |
| `NEXT_PUBLIC_SITE_URL` not mentioned | Must set to `https://forum.societyprotocol.io` |

**Action:** Rewrite deployment section for VPS. Add `NEXT_PUBLIC_SITE_URL`
to production env. Use PM2 + nginx (already set up) instead of Vercel.

---

## CODEBASE-RULES Updates Needed

| Rule | Change |
|---|---|
| Rule 7: RLS claim path | Change from `current_setting('request.jwt.claims')` to `auth.jwt()` |
| Rule 3: Supabase clients | Add note: self-hosted URL is `http://72.61.119.100:8000` |
| New Rule 11 | Migrations run via `docker exec` on VPS, not `supabase db push` |
| New Rule 12 | Groups are open (no MembershipApprovalGroupRule) — join is instant |
| New Rule 13 | All deployment is VPS-based (PM2 + nginx + Docker), not Vercel |

---

## Summary: What's Safe vs What Needs Updating

| Phase | Status |
|---|---|
| Phase 3 (Database) | ⚠️ RLS syntax + include tags column + run via docker exec |
| Phase 4 (Forum Pages) | ⚠️ Minor — verify PlateEditor props |
| Phase 5 (Composer) | ✅ No changes needed |
| Phase 6 (Publish Flow) | ⚠️ Open groups change + verify storageClient |
| Phase 7 (Forum Features) | ⚠️ Simplify membership — no approval flow |
| Phase 8 (Research) | ⚠️ Tags in Phase 3 + defer token gating |
| Phase 9 (Recovery & Sync) | ⚠️ VPS URLs + system cron |
| Phase 10 (Polish & Deploy) | ⚠️ VPS deployment, not Vercel |
