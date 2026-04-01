# Part 8: Navigation & Layout

## Goal

Build the app shell that wraps all forum pages: header with auth state and
navigation, homepage layout with board sections, category sidebar, search,
and mobile responsiveness. This adapts fountain.ink's existing navigation
components and adds forum-specific navigation.

---

## Prerequisites

- Part 6 complete (all pages exist)
- Part 7 complete (auth, notifications working)
- Fountain's Header, UserMenu, and auth components available

---

## App Structure

```
/                        → Redirect to /boards
/boards                  → Homepage (board sections)
/boards/:feed            → Thread list (filtered by category)
/thread/:pubId           → Thread detail
/publication/:pubId      → Standalone article
/editor/new              → New thread (Plate.js editor)
/notifications           → Notification list
/u/:username             → Profile page
/settings                → User settings (from fountain)
/search                  → Search results
```

---

## Step 1: Forum Header

Adapt fountain's `Header` component. Replace blog-specific items (blog
subscribe, draft create) with forum-specific items (boards link, new thread).

```tsx
// src/components/forum/forum-header.tsx

"use client"

import { MeResult } from "@lens-protocol/client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { NotificationButton } from "@/components/notifications/notification-button"
import { UserMenu } from "@/components/user/user-menu"
import { HeaderSearch } from "@/components/navigation/header-search"
import { Button } from "@/components/ui/button"
import { PenSquare, Home, Bell } from "lucide-react"

export function ForumHeader({ session }: { session: MeResult | null }) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const isAuthenticated = session !== null
  const isWritePage = pathname.startsWith("/editor")

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-background/70 backdrop-blur-xl border-b">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-4">
          <Link href="/boards" className="font-bold text-lg tracking-tight">
            SOCIETY PROTOCOL
          </Link>

          {!isMobile && !isWritePage && (
            <nav className="flex items-center gap-1 ml-4">
              <NavLink href="/boards" current={pathname}>
                Boards
              </NavLink>
              <NavLink href="/search" current={pathname}>
                Search
              </NavLink>
            </nav>
          )}
        </div>

        {/* Center: Search (desktop only, non-write pages) */}
        {!isWritePage && !isMobile && (
          <div className="flex-1 max-w-md mx-4">
            <HeaderSearch />
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated && !isWritePage && (
            <Link href="/editor/new">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <PenSquare className="h-4 w-4" />
                {!isMobile && "New Thread"}
              </Button>
            </Link>
          )}
          {isAuthenticated && <NotificationButton />}
          <UserMenu session={session} showDropdown />
        </div>
      </div>
    </header>
  )
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string
  current: string
  children: React.ReactNode
}) {
  const isActive = current.startsWith(href)
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
        isActive
          ? "bg-muted font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </Link>
  )
}
```

---

## Step 2: Mobile Bottom Navigation

For mobile, add a bottom tab bar (common forum pattern).

```tsx
// src/components/forum/forum-mobile-nav.tsx

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, PenSquare, Bell, User } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

export function ForumMobileNav() {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  if (!isMobile) return null

  // Hide on editor pages
  if (pathname.startsWith("/editor")) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t h-14 flex items-center justify-around px-2">
      <MobileTab href="/boards" icon={Home} label="Boards" current={pathname} />
      <MobileTab href="/search" icon={Search} label="Search" current={pathname} />
      <MobileTab href="/editor/new" icon={PenSquare} label="Post" current={pathname} />
      <MobileTab href="/notifications" icon={Bell} label="Alerts" current={pathname} />
      <MobileTab href="/settings" icon={User} label="Profile" current={pathname} />
    </nav>
  )
}

function MobileTab({
  href,
  icon: Icon,
  label,
  current,
}: {
  href: string
  icon: any
  label: string
  current: string
}) {
  const isActive = current.startsWith(href)
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  )
}
```

---

## Step 3: Root Layout

Wire the header and mobile nav into the app layout. Fountain uses a
`(app)` route group for authenticated pages.

```tsx
// src/app/(app)/layout.tsx (modify existing)

import { ForumHeader } from "@/components/forum/forum-header"
import { ForumMobileNav } from "@/components/forum/forum-mobile-nav"
import { getSession } from "@/lib/auth/get-session" // fountain's auth

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <div className="min-h-screen flex flex-col">
      <ForumHeader session={session} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <ForumMobileNav />
    </div>
  )
}
```

---

## Step 4: Homepage with Board Sections

The homepage from Part 6 (`/boards/page.tsx`) already renders sections.
Add a sidebar with quick links and community info.

```tsx
// src/app/(app)/boards/page.tsx (enhanced from Part 6)

import { getBoardSections } from "@/lib/forum/get-board-sections"
import { BoardSectionList } from "@/components/forum/board-section-list"

export const dynamic = "force-dynamic"

export default async function BoardsPage() {
  const sections = await getBoardSections()

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {sections.map((section) => (
            <BoardSectionList key={section.id} section={section} />
          ))}
        </div>

        {/* Sidebar (desktop only) */}
        <aside className="hidden lg:block w-72 shrink-0">
          <ForumSidebar />
        </aside>
      </div>
    </div>
  )
}

function ForumSidebar() {
  return (
    <div className="sticky top-20 space-y-6">
      {/* Community info */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold text-sm mb-2">Society Protocol</h3>
        <p className="text-xs text-muted-foreground">
          A close community for discussing governance, research,
          and the future of decentralized societies.
        </p>
      </div>

      {/* Quick links */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold text-sm mb-2">Quick Links</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <a href="/boards/commons?category=beginners" className="text-muted-foreground hover:text-foreground">
              Beginners & Help
            </a>
          </li>
          <li>
            <a href="/boards/commons?category=announcements" className="text-muted-foreground hover:text-foreground">
              Announcements
            </a>
          </li>
          <li>
            <a href="/boards/research?category=architecture" className="text-muted-foreground hover:text-foreground">
              Architecture
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
```

---

## Step 5: Search Page

Forum search queries the `forum_threads` full-text search index.

```tsx
// src/app/(app)/search/page.tsx

import { createClient } from "@/lib/db/client"
import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: { q?: string }
}

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q?.trim()

  let results: any[] = []
  if (query) {
    const db = await createClient()
    const { data } = await db
      .from("forum_threads")
      .select(
        "root_publication_id, title, summary, category, author_username, created_at",
      )
      .eq("is_hidden", false)
      .textSearch(
        "title_content_search",
        query,
        { type: "websearch" },
      )
      .order("created_at", { ascending: false })
      .limit(30)

    results = data || []
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold mb-4">Search</h1>

      {/* Search form */}
      <form method="GET" className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search threads..."
          className="w-full px-4 py-2 border rounded-lg bg-background"
          autoFocus
        />
      </form>

      {/* Results */}
      {query && (
        <div className="text-sm text-muted-foreground mb-4">
          {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
        </div>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <Link
            key={r.root_publication_id}
            href={`/thread/${r.root_publication_id}`}
            className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="font-medium text-sm">{r.title}</div>
            {r.summary && (
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {r.summary}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2">
              {r.author_username} · {r.category} · {formatRelativeTime(r.created_at)}
            </div>
          </Link>
        ))}
      </div>

      {query && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No threads found matching your search.
        </div>
      )}
    </div>
  )
}
```

Note: The `textSearch` call uses the GIN index created in Part 3:
```sql
CREATE INDEX idx_forum_threads_search ON forum_threads
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_text,'')));
```

For this to work with Supabase's `.textSearch()`, you may need to create
a generated column or use `.rpc()` with a custom function. Alternative:

```ts
// Using raw SQL via rpc
const { data } = await db.rpc("forum_search_threads", {
  search_query: query,
  result_limit: 30,
})
```

With the SQL function:
```sql
CREATE OR REPLACE FUNCTION forum_search_threads(search_query TEXT, result_limit INT DEFAULT 30)
RETURNS SETOF forum_threads AS $$
  SELECT * FROM forum_threads
  WHERE is_hidden = FALSE
    AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_text,''))
        @@ websearch_to_tsquery('english', search_query)
  ORDER BY created_at DESC
  LIMIT result_limit;
$$ LANGUAGE sql STABLE;
```

---

## Step 6: Notifications Page

Port the notifications page from the current codebase. Uses the
`useForumNotifications` hook from Part 7.

```tsx
// src/app/(app)/notifications/page.tsx

"use client"

import { useForumNotifications } from "@/hooks/forum/use-notifications"

// Port notification item components from current codebase:
// - MentionNotificationItem
// - ReactionNotificationItem
// - ReplyNotificationItem

export default function NotificationsPage() {
  const { notifications, loading } = useForumNotifications()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Notifications</h1>

      {loading && <div className="text-muted-foreground">Loading...</div>}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No notifications yet.
        </div>
      )}

      <div className="space-y-1">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
    </div>
  )
}

// Simplified notification renderer
// Replace with ported components from current codebase for full fidelity
function NotificationItem({ notification }: { notification: any }) {
  return (
    <div className="border rounded-lg p-3 text-sm">
      <pre className="text-xs text-muted-foreground">
        {notification.__typename}
      </pre>
    </div>
  )
}
```

---

## Step 7: Profile Page

Port from current codebase. Fountain already has user pages — merge
the forum activity tab into their structure.

```tsx
// src/app/(app)/u/[username]/page.tsx

import { getUserForumActivity } from "@/lib/forum/get-user-forum-activity"
import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"

// Port ProfileHeader, ProfileStats from current codebase
// Fountain also has user components — merge as appropriate

interface Props {
  params: { username: string }
}

export default async function ProfilePage({ params }: Props) {
  // Fetch Lens account data (port from use-profile-account.ts)
  // Fetch forum activity
  const activity = await getUserForumActivity(params.username)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Profile header — port from current codebase */}
      <h1 className="text-xl font-bold mb-6">@{params.username}</h1>

      {/* Forum activity */}
      <h2 className="font-bold text-sm mb-3">Forum Activity</h2>

      {activity.threads.length === 0 && activity.replies.length === 0 && (
        <div className="text-muted-foreground text-sm">No forum activity yet.</div>
      )}

      <div className="space-y-2">
        {activity.threads.map((t: any) => (
          <Link
            key={t.root_publication_id}
            href={`/thread/${t.root_publication_id}`}
            className="block border rounded p-3 hover:bg-muted/50 text-sm"
          >
            <span className="font-medium">{t.title}</span>
            <span className="text-muted-foreground ml-2">
              {t.reply_count} replies · {formatRelativeTime(t.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

## Responsive Design Notes

- Header: full nav on desktop, logo + hamburger on mobile
- Mobile bottom nav: 5 tabs (Boards, Search, Post, Alerts, Profile)
- Board sections: full width on mobile, sidebar hidden
- Thread list: compact rows on mobile (hide view count, shorten timestamps)
- Thread detail: full width, reply editor stacks below
- Editor: fountain's Plate.js is already responsive
- `pb-16 md:pb-0` on main content to account for mobile bottom nav

---

## Checklist — Part 8 Complete When:

- [ ] Forum header shows logo, nav links, search, auth state
- [ ] Mobile bottom navigation works on small screens
- [ ] Homepage shows board sections with sidebar
- [ ] Search page returns results from full-text index
- [ ] Notifications page shows forum-filtered notifications
- [ ] Profile page shows user info + forum activity
- [ ] All pages are responsive (mobile + desktop)
- [ ] Navigation between pages works (breadcrumbs, links)
- [ ] "New Thread" button visible when authenticated
- [ ] Editor page accessible from nav

---

## Next: Part 9 — Recovery & Sync

With the full app working, Part 9 adds the safety net: background sync
between Supabase and Lens, recovery scripts to rebuild from onchain data,
and content cache optimization.
