# Part 10: Polish & Deploy

## Goal

Ship the forum to production. This covers performance optimization, SEO,
error handling, rate limiting, and deployment configuration. By the end
of this part, the forum is live and production-ready.

---

## Prerequisites

- Parts 1–9 complete (full forum working locally)
- Domain name configured (e.g., lensforum.xyz or forum.societyprotocol.xyz)
- Vercel / Railway / VPS account for hosting
- Auth server deployed (from Part 1)

---

## Step 1: Performance — Caching & ISR

### Next.js Caching Strategy

```
Page                    | Strategy           | Revalidation
------------------------|--------------------|--------------
/boards                 | ISR                | 60 seconds
/boards/:feed?category  | ISR                | 30 seconds
/thread/:pubId          | ISR                | 30 seconds
/publication/:pubId     | ISR                | 300 seconds
/search                 | Dynamic (no cache) | —
/notifications          | Dynamic (no cache) | —
/u/:username            | ISR                | 120 seconds
```

Apply to each page:

```tsx
// Board listing — revalidate every 60s
export const revalidate = 60

// Thread list — revalidate every 30s
export const revalidate = 30

// Thread detail — revalidate every 30s
export const revalidate = 30
```

### On-Demand Revalidation

When a new thread or reply is published, revalidate the affected pages
immediately instead of waiting for the ISR timer:

```ts
// src/lib/forum/revalidate.ts

import { revalidatePath } from "next/cache"

export function revalidateThread(rootPublicationId: string) {
  revalidatePath(`/thread/${rootPublicationId}`)
}

export function revalidateCategory(category: string, feed: string) {
  revalidatePath(`/boards/${feed}?category=${category}`)
  revalidatePath("/boards")
}
```

Call these after publishing in the API routes:

```ts
// In /api/forum/threads POST handler (Part 4)
revalidateCategory(body.category, body.feed)

// In /api/forum/replies POST handler (Part 5)
revalidateThread(body.threadRootPublicationId)
```

### Supabase Query Optimization

The content_json cache from Part 9 is the biggest win. Additionally:

- Thread list queries hit indexed columns only (category, is_hidden, is_pinned, last_reply_at)
- Thread detail fetches thread + replies in 2 queries (both indexed)
- Board homepage aggregates are lightweight (category counts)

No additional optimization needed unless traffic exceeds Supabase free tier.

---

## Step 2: SEO — Meta Tags & Open Graph

### Dynamic Metadata for Thread Pages

```tsx
// src/app/(app)/thread/[rootPublicationId]/page.tsx

import type { Metadata } from "next"
import { createClient } from "@/lib/db/client"

export async function generateMetadata({
  params,
}: {
  params: { rootPublicationId: string }
}): Promise<Metadata> {
  const db = await createClient()
  const { data: thread } = await db
    .from("forum_threads")
    .select("title, summary, author_username, category")
    .eq("root_publication_id", params.rootPublicationId)
    .single()

  if (!thread) {
    return { title: "Thread Not Found" }
  }

  const title = `${thread.title} — Society Protocol`
  const description = thread.summary || `Discussion in ${thread.category}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Society Protocol Forum",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}
```

### Static Metadata for Board Pages

```tsx
// src/app/(app)/boards/page.tsx

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Boards — Society Protocol",
  description: "Community discussion boards for Society Protocol governance, research, and collaboration.",
  openGraph: {
    title: "Society Protocol Forum",
    description: "Decentralized community discussion boards.",
    type: "website",
  },
}
```

### Category Page Metadata

```tsx
// src/app/(app)/boards/[feed]/page.tsx

import type { Metadata } from "next"
import { getCategoryBySlug } from "@/lib/forum/categories"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { category?: string }
}): Promise<Metadata> {
  const cat = getCategoryBySlug(searchParams.category || "")
  if (!cat) return { title: "Category Not Found" }

  return {
    title: `${cat.name} — Society Protocol`,
    description: cat.description,
  }
}
```

### robots.txt and sitemap

```ts
// src/app/robots.ts
import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://lensforum.xyz/sitemap.xml",
  }
}
```

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from "next"
import { createClient } from "@/lib/db/client"
import { SECTIONS } from "@/lib/forum/categories"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await createClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: "https://lensforum.xyz/boards", changeFrequency: "hourly", priority: 1 },
  ]

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = SECTIONS.flatMap((s) =>
    s.categories.map((c) => ({
      url: `https://lensforum.xyz/boards/${c.feed}?category=${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  )

  // Thread pages (most recent 500)
  const { data: threads } = await db
    .from("forum_threads")
    .select("root_publication_id, updated_at")
    .eq("is_hidden", false)
    .order("updated_at", { ascending: false })
    .limit(500)

  const threadPages: MetadataRoute.Sitemap = (threads || []).map((t) => ({
    url: `https://lensforum.xyz/thread/${t.root_publication_id}`,
    lastModified: t.updated_at,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }))

  return [...staticPages, ...categoryPages, ...threadPages]
}
```

---

## Step 3: Error Handling

### Global Error Boundary

```tsx
// src/app/(app)/error.tsx

"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground text-sm mb-4">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        Try again
      </button>
    </div>
  )
}
```

### Not Found Page

```tsx
// src/app/(app)/not-found.tsx

import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h2 className="text-xl font-bold mb-2">Page not found</h2>
      <p className="text-muted-foreground text-sm mb-4">
        The thread or page you're looking for doesn't exist.
      </p>
      <Link
        href="/boards"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        Back to Boards
      </Link>
    </div>
  )
}
```

### API Error Handling Pattern

All forum API routes should follow this pattern:

```ts
export async function POST(req: NextRequest) {
  try {
    // ... logic ...
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
```

---

## Step 4: Rate Limiting

### API Route Rate Limiting

Use a simple in-memory rate limiter for API routes. For production at
scale, use Upstash Redis or Vercel's built-in rate limiting.

```ts
// src/lib/forum/rate-limit.ts

const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const entry = requests.get(key)

  if (!entry || now > entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}
```

Apply to publishing routes:

```ts
// In /api/forum/threads POST
const ip = req.headers.get("x-forwarded-for") || "unknown"
if (!rateLimit(`thread:${ip}`, 5, 60_000)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 })
}

// In /api/forum/replies POST
if (!rateLimit(`reply:${ip}`, 10, 60_000)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 })
}

// In /api/forum/votes POST
if (!rateLimit(`vote:${ip}`, 30, 60_000)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 })
}
```

---

## Step 5: Environment Configuration

### Production .env

```env
# App
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E
NEXT_PUBLIC_SITE_URL=https://lensforum.xyz

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_JWT_SECRET=...
SUPABASE_SERVICE_KEY=...
DATABASE_URL=postgresql://...

# Lens
LENS_API_KEY=...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# Auth server URL (deployed from Part 1)
NEXT_PUBLIC_AUTH_SERVER_URL=https://auth.lensforum.xyz
```

### Auth Server Production .env

```env
PRIVATE_KEY=0x...          # Signer private key
ENVIRONMENT=production
API_SECRET=0x...           # Shared with Lens API
APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E
PORT=3004
```

---

## Step 6: Deployment

### Option A: Vercel (Recommended for the App)

```bash
# In the forum app repo
vercel --prod
```

Configure in Vercel dashboard:
- Framework: Next.js
- Build command: `bun run build`
- Install command: `bun install`
- Environment variables: all from production .env
- Domain: lensforum.xyz

### Auth Server: Railway or Fly.io

The auth server is a standalone Express app — deploy separately.

```bash
# Railway
cd society-forum-auth
railway init
railway up

# Or Fly.io
fly launch
fly deploy
```

After deployment, update the auth endpoint URL registered with Lens
if it changed (re-run the registration script from Part 1).

### Sync Cron

If using Vercel, add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/forum/sync", "schedule": "*/5 * * * *" }
  ]
}
```

If using Railway/external, set up a cron job:
```bash
*/5 * * * * cd /path/to/app && npx tsx scripts/sync-forum.ts
```

---

## Step 7: Post-Launch Monitoring

### What to Watch

- Auth server response times (must be < 500ms for Lens API)
- Supabase connection pool usage
- Sync job success/failure logs
- Error rates in Vercel/hosting dashboard
- Thread/reply creation success rate

### Health Check Endpoint

```ts
// src/app/api/health/route.ts

import { createClient } from "@/lib/db/client"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const db = await createClient()
    const { count } = await db
      .from("forum_threads")
      .select("*", { count: "exact", head: true })

    return NextResponse.json({
      status: "ok",
      threads: count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: String(error) },
      { status: 500 },
    )
  }
}
```

---

## Launch Checklist

### Before Launch
- [ ] All Parts 1–9 complete and tested
- [ ] Auth server deployed and responding < 500ms
- [ ] Authorization Endpoint registered with Lens
- [ ] App Signer registered with Lens
- [ ] Both Groups created with MembershipApprovalGroupRule
- [ ] Both Feeds created with GroupGatedFeedRule
- [ ] Supabase tables created and categories seeded
- [ ] At least 1 admin approved in both groups
- [ ] Content cache populated for existing posts
- [ ] Sync cron job configured

### Deployment
- [ ] Production environment variables set
- [ ] App deployed to Vercel (or hosting of choice)
- [ ] Auth server deployed to Railway/Fly.io
- [ ] Domain configured and SSL active
- [ ] Health check endpoint responding

### Post-Launch
- [ ] Test login flow end-to-end on production
- [ ] Test thread creation on production
- [ ] Test reply creation on production
- [ ] Verify posts appear on Hey.xyz with correct app name
- [ ] Verify sync cron is running
- [ ] Monitor error rates for first 24 hours
- [ ] Approve initial community members

---

## What You've Built

```
┌─────────────────────────────────────────────────────┐
│  SOCIETY PROTOCOL FORUM                              │
│  Fork of fountain.ink + custom forum layer           │
│                                                      │
│  Auth Server (Express)                               │
│  ├─ /authorize — controls who can log in             │
│  └─ /verify — signs every operation                  │
│                                                      │
│  Forum App (Next.js)                                 │
│  ├─ Plate.js editor (rich text, images, code)        │
│  ├─ Board sections with 30 categories                │
│  ├─ Thread list + detail (Discourse-style)           │
│  ├─ Full-article replies (not just comments)         │
│  ├─ Voting, moderation, notifications                │
│  ├─ Search (Postgres full-text)                      │
│  └─ Mobile responsive                               │
│                                                      │
│  Lens Protocol (onchain)                             │
│  ├─ 1 App (0x637E...)                                │
│  ├─ 2 Groups (Commons + Research, approval-gated)    │
│  ├─ 2 Feeds (group-gated)                            │
│  └─ Auth Endpoint + App Signer                       │
│                                                      │
│  Supabase (speed layer)                              │
│  ├─ forum_threads + forum_thread_replies              │
│  ├─ forum_categories + forum_votes                   │
│  ├─ Content JSON cache                               │
│  └─ Full-text search index                           │
│                                                      │
│  Recovery                                            │
│  ├─ Full rebuild from Lens (if Supabase lost)        │
│  ├─ Incremental sync every 5 minutes                 │
│  └─ Content cache auto-population                    │
└─────────────────────────────────────────────────────┘
```

This replaces the original 26-feed, no-auth, limited-formatting Web3Forum
with a clean, gated, rich-content forum built on proven foundations.
