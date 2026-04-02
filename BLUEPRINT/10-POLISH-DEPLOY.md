# Phase 10: Polish & Deploy

## Goal

Ship to production. Performance optimization, SEO, error handling, rate
limiting, and deployment. By the end, the forum is live.

## Depends On

All previous phases.

---

## Steps

### 10.1 Caching & ISR

| Page | Strategy | Revalidation |
|---|---|---|
| `/boards` | ISR | 60s |
| `/boards/[feed]?category=` | ISR | 30s |
| `/thread/[id]` | ISR | 30s |
| `/research` | ISR | 30s |
| `/search` | Dynamic | — |
| `/notifications` | Dynamic | — |

On-demand revalidation after publish:
```ts
revalidatePath(`/thread/${publicationId}`)
revalidatePath(`/boards/${feed}?category=${category}`)
revalidatePath('/boards')
```

### 10.2 SEO — Meta Tags & Structured Data

**Thread pages:** dynamic `generateMetadata()` with title, description (from summary), OpenGraph.

**Board pages:** static metadata per category.

**Sitemap:** `src/app/sitemap.ts` — static pages + category pages + recent 500 threads.

**robots.txt:** allow all, point to sitemap.

### 10.3 Error Handling

**Global error boundary:** `src/app/error.tsx` — "Something went wrong" + retry button.

**Not found:** `src/app/not-found.tsx` — "Page not found" + link to boards.

**API routes:** try/catch wrapper on all handlers, return structured error JSON.

### 10.4 Rate Limiting

In-memory rate limiter for MVP:

| Route | Limit |
|---|---|
| POST `/api/forum/threads` | 5 per minute per IP |
| POST `/api/forum/replies` | 10 per minute per IP |
| POST `/api/forum/votes` | 30 per minute per IP |

For production at scale: upgrade to Upstash Redis.

### 10.5 Navigation & Layout Polish

**Forum header:** `src/components/forum/forum-header.tsx`
- Logo → `/boards`
- Nav: Boards, Search
- "🔒 Research" button (amber accent)
- "New Thread" button (when authenticated)
- Notifications bell
- User menu

**Mobile bottom nav:** `src/components/forum/forum-mobile-nav.tsx`
- 5 tabs: Boards, Search, Post, Alerts, Profile
- Fixed bottom, hidden on desktop

**Root layout integration:**
- Wrap forum pages with header + mobile nav
- `pb-16 md:pb-0` on main content for mobile nav clearance

### 10.6 Health Check

**File:** `src/app/api/health/route.ts`

Returns: `{ status: "ok", threads: count, timestamp }` or 500 on error.

### 10.7 Environment Configuration

**Production `.env`:**
- `NEXT_PUBLIC_ENVIRONMENT=production`
- `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`
- All Supabase, Lens, WalletConnect credentials
- Auth server URL

**Auth server `.env`:**
- `PRIVATE_KEY` (signer key)
- `API_SECRET`
- `APP_ADDRESS`
- `ENVIRONMENT=production`

### 10.8 Deployment

| Service | Platform | Notes |
|---|---|---|
| Forum app | Vercel | Next.js, `bun run build` |
| Auth server | Railway / Fly.io | Express, must respond < 500ms |
| Sync cron | Vercel Cron / system cron | Every 5 minutes |
| Database | Supabase | Managed Postgres |

### 10.9 Post-Launch Monitoring

Watch for:
- Auth server response times (< 500ms requirement)
- Supabase connection pool usage
- Sync job success/failure
- Error rates in hosting dashboard
- Thread/reply creation success rate

---

## Launch Checklist

### Pre-Launch
- [ ] All Phases 1–9 complete and tested
- [ ] Auth server deployed, responding < 500ms
- [ ] Authorization Endpoint + App Signer registered with Lens
- [ ] Both Groups + Feeds created onchain
- [ ] Supabase tables created, categories seeded
- [ ] At least 1 admin approved in both groups
- [ ] Content cache populated
- [ ] Sync cron configured

### Deployment
- [ ] Production env vars set
- [ ] App deployed to Vercel
- [ ] Auth server deployed
- [ ] Domain configured + SSL
- [ ] Health check responding

### Post-Launch
- [ ] Login flow works end-to-end on production
- [ ] Thread creation works on production
- [ ] Reply creation works on production
- [ ] Posts appear on Hey.xyz with correct app name
- [ ] Sync cron running
- [ ] Monitor error rates for 24 hours
- [ ] Approve initial community members

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T10.1 | Production build succeeds | `bun run build` exits 0 |
| T10.2 | All pages load on production URL | No 500 errors |
| T10.3 | Login works on production | Auth server logs confirm |
| T10.4 | Publish thread on production | Post on Lens, row in Supabase |
| T10.5 | SEO: check thread page source | OG tags present |
| T10.6 | Sitemap accessible | `/sitemap.xml` returns XML |
| T10.7 | 404 page renders | Custom not-found page |
| T10.8 | Error boundary catches errors | "Something went wrong" page |
| T10.9 | Rate limit triggers on spam | 429 response after limit |
| T10.10 | Health check endpoint | Returns 200 with thread count |
| T10.11 | Mobile layout works | Bottom nav visible, responsive |
| T10.12 | ISR revalidation works | Page updates within revalidation window |

## Files Created

```
src/app/error.tsx
src/app/not-found.tsx
src/app/sitemap.ts
src/app/robots.ts
src/app/api/health/route.ts
src/lib/forum/rate-limit.ts
src/lib/forum/revalidate.ts
src/components/forum/forum-header.tsx
src/components/forum/forum-mobile-nav.tsx
vercel.json                              — cron config
```
