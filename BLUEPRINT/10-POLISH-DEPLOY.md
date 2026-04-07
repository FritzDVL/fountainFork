# Phase 10: Polish & Deploy (UPDATED)

## Goal

Ship to production on VPS. Fix known issues, optimize performance,
add SEO, set up cron sync, and deploy. By the end, the forum is live
at `https://forum.societyprotocol.io`.

## Depends On

All previous phases ✅

---

## What's Changed Since Original Plan

| Original assumption | Reality |
|---|---|
| Deploy to Vercel | VPS-based (Hostinger Ubuntu 24.04, 72.61.119.100) |
| Vercel Cron for sync | System cron on VPS |
| Need new forum header | Already using Fountain's header with Research button added (Phase 8) |
| Need mobile nav | Defer — Fountain's existing responsive layout works for MVP |
| Need `forum_votes` API | Skipped — using Lens reactions directly (Phase 7) |
| Dual-pane composer preview | Defer — single-pane works for MVP |

---

## Fountain Code to Study First

| Need | Fountain file | What to learn |
|---|---|---|
| SEO metadata | `src/lib/seo/metadata.ts` | `generateMetadata()` pattern |
| Structured data | `src/lib/seo/structured-data.ts` | JSON-LD schema |
| Sitemap | `src/app/sitemap.ts` | How Fountain generates sitemap |
| Error boundary | `src/app/error.tsx` | Already exists, may just need forum styling |
| PM2 deployment | Auth server already uses PM2 | Same pattern for the app |

---

## Steps

### 10.1 Article Page Cleanup

The `/p/[user]/[post]` page is the "Onchain" view for forum posts.
Currently shows Fountain's comment section and "Read More" links
which are irrelevant for forum posts.

**What to do:** Conditionally hide these when the post has a
`forumCategory` or `forumThreadId` metadata attribute.

**File:** `src/app/p/[user]/[post]/page.tsx`

Study how it renders `CommentPreview` and `ReadMoreSection`, then
wrap them in a condition:
```ts
const isForumPost = post.metadata?.attributes?.some(
  a => a.key === "forumCategory" || a.key === "forumThreadId"
);
// Only render comments/readmore if NOT a forum post
```

---

### 10.2 Known CSS Fixes

Issues discovered during testing:

| Issue | Where | Fix |
|---|---|---|
| List bullets/numbers invisible | Composer editor | CSS for `list-disc` / `list-decimal` markers |
| [+] drag handle showing | Composer editor | Already removed DndPlugin in Phase 7 — verify |
| "Turn into" dropdown | Composer toolbar | Already removed — verify |

---

### 10.3 Environment Configuration

**Production `.env` on VPS:**
```
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_SITE_URL=https://forum.societyprotocol.io
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
NEXT_PUBLIC_APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E
NEXT_PUBLIC_AUTH_SERVER_URL=https://auth.societyprotocol.io
LENS_API_KEY=...
IFRAMELY_API_KEY=placeholder
```

**Critical:** `NEXT_PUBLIC_SITE_URL` fixes share URLs (currently
default to fountain.ink — known issue from Phase 1).

---

### 10.4 SEO — Meta Tags

**Thread pages:** Add `generateMetadata()` to `src/app/thread/[rootPublicationId]/page.tsx`:
```ts
export async function generateMetadata({ params }) {
  const thread = await getThreadDetail(params.rootPublicationId);
  return {
    title: `${thread.title} — Society Protocol Forum`,
    description: thread.summary,
    openGraph: { title: thread.title, description: thread.summary },
  };
}
```

**Board pages:** Add metadata to `src/app/boards/[feed]/page.tsx`.

**Research page:** Add metadata to `src/app/research/page.tsx`.

**Landing page:** Static metadata on `src/app/boards/page.tsx`.

---

### 10.5 Sitemap

Update `src/app/sitemap.ts` to include forum pages:
- `/boards` (static)
- `/research` (static)
- `/boards/commons?category=[slug]` for each category
- `/thread/[id]` for recent threads (last 500)

---

### 10.6 Error Handling

Fountain already has `src/app/error.tsx`. Verify it works for forum
pages. If needed, add forum-specific error messages.

Add try/catch to any forum API routes that don't have it yet.

---

### 10.7 Build & Deploy to VPS

**On Mac (build):**
```bash
cd /Users/user/Developer/fountainFork
bun run build
```

**Transfer to VPS:**
```bash
rsync -avz --exclude node_modules --exclude .git \
  /Users/user/Developer/fountainFork/ \
  root@72.61.119.100:/opt/society-forum/
```

**On VPS (install + start):**
```bash
cd /opt/society-forum
bun install --production
pm2 start ecosystem.config.js --name society-forum
# or
pm2 start "bun run start" --name society-forum
```

**PM2 ecosystem file:** `ecosystem.config.js`
```js
module.exports = {
  apps: [{
    name: "society-forum",
    script: "node_modules/.bin/next",
    args: "start -p 3001",
    env: { NODE_ENV: "production" },
  }],
};
```

---

### 10.8 Nginx Configuration

Update existing nginx config for `forum.societyprotocol.io`:
```nginx
server {
    listen 443 ssl;
    server_name forum.societyprotocol.io;

    ssl_certificate /etc/letsencrypt/live/forum.societyprotocol.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/forum.societyprotocol.io/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### 10.9 Sync Cron Setup

```bash
# On VPS
crontab -e

# Add:
*/5 * * * * cd /opt/society-forum && npx tsx scripts/sync-forum.ts >> /var/log/forum-sync.log 2>&1
```

---

### 10.10 Health Check

**File:** `src/app/api/health/route.ts`

```ts
export async function GET() {
  const db = await createClient();
  const { count } = await db.from("forum_threads").select("*", { count: "exact", head: true });
  return NextResponse.json({ status: "ok", threads: count, timestamp: new Date().toISOString() });
}
```

---

### 10.11 Lens Display Mode — Verify

Confirm that new posts show `Title — URL` on other apps (Soclly, Hey)
instead of full content. This was fixed in Phase 6 but needs production
verification.

---

## Deferred to Post-Launch

| Feature | Why deferred |
|---|---|
| Mobile bottom nav | Fountain's responsive layout works for MVP |
| Dual-pane composer preview | Single-pane works for MVP |
| Rate limiting | Low traffic at launch, add when needed |
| ISR / caching | Start with `force-dynamic`, optimize later |
| Quote-reply Level 2 (text selection) | Complex DOM work, post-launch |
| Optimistic publish (Phase 6b) | UX improvement, not blocking |
| Persistent operational data (web3) | View counts, pin/lock on web3 service |
| Tag autocomplete in composer | Dropdown works for MVP |
| Notifications filtered to forum | Fountain's notifications work as-is |
| User forum activity tab | Nice-to-have for profiles |

---

## Execution Order

| Step | What | Effort |
|---|---|---|
| 10.1 | Article page cleanup | Small |
| 10.2 | CSS fixes (list bullets) | Small |
| 10.3 | Production .env | Small |
| 10.4 | SEO metadata | Medium |
| 10.5 | Sitemap update | Small |
| 10.6 | Error handling verify | Small |
| 10.7 | Build + deploy to VPS | Medium |
| 10.8 | Nginx config | Small |
| 10.9 | Sync cron setup | Small |
| 10.10 | Health check endpoint | Small |
| 10.11 | Lens Display verify | Small |

---

## Launch Checklist

### Pre-Launch
- [ ] All Phases 1–9 complete and tested
- [ ] `bun run build` succeeds with no errors
- [ ] Production .env configured on VPS
- [ ] `NEXT_PUBLIC_SITE_URL` set to `https://forum.societyprotocol.io`
- [ ] Article page hides comments/readmore for forum posts
- [ ] List bullet CSS fixed
- [ ] SEO metadata on thread/board/research pages

### Deployment
- [ ] App transferred to VPS
- [ ] `bun install` + PM2 started on port 3001
- [ ] Nginx proxying to port 3001
- [ ] SSL cert valid for `forum.societyprotocol.io`
- [ ] Health check returns 200

### Post-Launch
- [ ] Login flow works on production
- [ ] Thread creation works on production
- [ ] Reply creation works on production
- [ ] Onchain badge links to `/p/[user]/[pubId]`
- [ ] Share URLs use `forum.societyprotocol.io` (not fountain.ink)
- [ ] Posts show `Title — URL` on other Lens apps
- [ ] Sync cron running (check `/var/log/forum-sync.log`)
- [ ] Monitor for 24 hours

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T10.1 | `bun run build` | Exits 0, no errors |
| T10.2 | All pages load on production URL | No 500 errors |
| T10.3 | Login works on production | Auth server confirms |
| T10.4 | Publish thread on production | Post on Lens + Supabase |
| T10.5 | Thread page has OG tags | View source shows meta tags |
| T10.6 | `/sitemap.xml` accessible | Returns XML with forum URLs |
| T10.7 | Forum post article page | No comment section, no read more |
| T10.8 | Health check | Returns 200 with thread count |
| T10.9 | Share URL | Uses `forum.societyprotocol.io` |
| T10.10 | Sync cron log | Shows execution every 5 min |
| T10.11 | Other Lens apps | Show title + link, not full content |

## Files to Create

```
src/app/api/health/route.ts          — health check
ecosystem.config.js                  — PM2 config
```

## Files to Update

```
src/app/p/[user]/[post]/page.tsx     — hide comments/readmore for forum posts
src/app/thread/[rootPublicationId]/page.tsx  — SEO metadata
src/app/boards/page.tsx              — SEO metadata
src/app/boards/[feed]/page.tsx       — SEO metadata
src/app/research/page.tsx            — SEO metadata
src/app/sitemap.ts                   — add forum URLs
```
