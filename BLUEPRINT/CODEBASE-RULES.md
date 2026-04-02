# Codebase Integration Rules

## Purpose

Hard rules for integrating forum code with Fountain's existing codebase.
These were derived from the 10 issues found during the Fountain.ink
codebase review (documented in MasterPlanV2 corrections section).

Violating any of these will cause bugs. Follow them exactly.

---

## Rule 1: Lens SDK — Client vs React

| Context | Package | Pattern |
|---|---|---|
| Client components (hooks) | `@lens-protocol/react` | `useSessionClient()`, `useAuthenticatedUser()` |
| Server / API routes | `@lens-protocol/client` | `getLensClient()` from `src/lib/lens/client.ts` |
| Scripts | `@lens-protocol/client` | `PublicClient.create()` directly |

Publish functions (`publishThread`, `publishReply`) receive `sessionClient`
as a parameter from the calling component. They do NOT call `getLensClient()`.

## Rule 2: ForumDraft, Not Draft

Fountain's `Draft` type extends `Database["public"]["Tables"]["drafts"]["Row"]`
and has many required DB fields. Forum publish functions use `ForumDraft`:

```ts
interface ForumDraft {
  title: string
  contentJson: any
  contentMarkdown: string
  subtitle?: string | null
  coverUrl?: string | null
  tags?: string[]
}
```

- Thread creation: build `ForumDraft` from composer editor state
- Replies: build `ForumDraft` directly (no draft table)
- If reusing Fountain's draft system for autosave: convert via adapter

## Rule 3: Three Supabase Clients

| Context | Import | File |
|---|---|---|
| API routes (`route.ts`) | `import { createClient } from "@/lib/db/server"` | `src/lib/db/server.ts` |
| Server components (pages) | `import { createClient } from "@/lib/db/server"` | `src/lib/db/server.ts` |
| Client components | `import { createClient } from "@/lib/db/client"` | `src/lib/db/client.ts` |
| Scripts (recovery, sync) | `import { createClient } from "@supabase/supabase-js"` with service key | Direct import |
| Admin ops (bypass RLS) | `import { createServiceClient } from "@/lib/db/service"` | `src/lib/db/service.ts` |

Using the wrong client causes auth failures or security issues.

## Rule 4: Flat Route Structure

Fountain uses flat top-level routes. NO `(app)` route group.

```
✅ src/app/boards/page.tsx
✅ src/app/thread/[id]/page.tsx
❌ src/app/(app)/boards/page.tsx
```

## Rule 5: Route Coexistence

Forum routes must not conflict with Fountain's existing routes:

| Fountain Route | Forum Route | Status |
|---|---|---|
| `/b/[blog]` | `/boards` | No conflict |
| `/p/[user]/[post]` | `/thread/[id]` | No conflict |
| `/w/[id]` | — | Reuse for editor if needed |
| `/u/[user]` | — | Add forum activity tab |
| `/search` | — | Extend with forum search |

## Rule 6: Content Cache from Day One

`content_json JSONB` columns exist on `forum_threads` AND `forum_thread_replies`
from the initial migration (Phase 3). Both publish services (Phase 6) write
to these columns at publish time. Thread detail pages read from Supabase
first, Lens API only as fallback.

## Rule 7: RLS — Not USING (true)

Tightened policies:
- Threads/replies: public read, authenticated insert, author-or-admin update
- Votes: public read, own-votes-only for write
- Categories/communities: public read, admin-only write

Verify JWT claim path: `(current_setting('request.jwt.claims')::json->>'metadata')::json->>'address'`

## Rule 8: Middleware — CORS Only

Fountain's `src/middleware.ts` handles CORS and token forwarding.
No route protection — auth is at component/API level.
Only change: add forum domain to `allowedOrigins`.

## Rule 9: usePublishDraft — Thread Only

- Thread creation (root posts): CAN use `usePublishDraft` for autosave,
  then convert `Draft → ForumDraft` via adapter before publishing
- Replies: do NOT use `usePublishDraft`. Manage editor state locally.
  Construct `ForumDraft` directly from Plate.js editor value.

## Rule 10: Lens SDK Canary

Fountain uses `"canary"` version for both `@lens-protocol/client` and
`@lens-protocol/react`. API surfaces may differ from stable docs.
Test all Lens SDK calls against the actual installed version.

---

## Fountain Tables — Do Not Touch

```
users, blogs, posts, drafts, curated, feedback, banlist, chat_messages
```

All forum tables use the `forum_` prefix. No modifications to existing tables.

## Fountain Components — Reuse, Don't Replace

| Component | Reuse How |
|---|---|
| `PlateEditor` (`src/components/editor/editor.tsx`) | `<PlateEditor readOnly value={json} />` for content display |
| `getEditorPlugins()` | Same plugins for composer editor |
| `UserAvatar` | In post cards and thread rows |
| `UserMenu` | In forum header |
| `NotificationButton` | In forum header |
| `HeaderSearch` | In forum header |
| Toast system (sonner) | For all notifications |
| Dialog/Sheet/Button (Radix UI) | For all forum UI |
