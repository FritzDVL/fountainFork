# Fountain Reuse Map — What Already Exists for Each Phase

## How to Use This

Before implementing any phase, check this map. Find the Fountain file
that already does what you need. Read it. Reuse it. Only write new code
for the delta (what's different for the forum).

---

## Phase 6: Publish Flow

| Need | Fountain already has | File |
|---|---|---|
| Publish article to Lens | `publishPost()` | `src/lib/publish/publish-post.ts` |
| Build metadata attributes | `getPostAttributes()` | `src/lib/publish/get-post-attributes.ts` |
| Convert to markdown | `api.markdown.serialize()` | `src/components/editor/addons/editor-autosave.tsx:37` |
| Upload to Grove | `storageClient.uploadAsJson()` | `src/lib/lens/storage-client.ts` |
| Get user info | `getUserAccount()` | `src/lib/auth/get-user-profile.ts` |
| Get Lens session | `getLensClient()` | `src/lib/lens/client.ts` |
| Sign with wallet | `handleOperationWith(walletClient)` | `@lens-protocol/client/viem` |
| Build article metadata | `article()` | `@lens-protocol/metadata` |
| Get feed address | `getFeedAddress()` | `src/lib/publish/get-feed-address.ts` |

**Forum delta:** Different feed (our constants, not blog group), different
attributes (forumCategory/forumThreadId), different Supabase table.

---

## Phase 7: Forum Features

### Voting / Reactions
| Need | Fountain already has | File |
|---|---|---|
| Add reaction | `addReaction()` | `src/hooks/use-post-actions.ts` |
| Undo reaction | `undoReaction()` | `src/hooks/use-post-actions.ts` |
| Reaction UI | `PostReactions` component | `src/components/post/post-reactions.tsx` |

**Forum delta:** Heart only (no downvote), sync to `forum_votes` table.

### Moderation
| Need | Fountain already has | File |
|---|---|---|
| Check if admin | `useAdminStatus()` hook | `src/hooks/use-admin-status.ts` |
| Admin check (server) | `isAdmin()` | `src/lib/auth/is-admin.ts` |
| Admin middleware | `adminMiddleware()` | `src/lib/auth/admin-middleware.ts` |
| Admin UI wrapper | `AdminAuthCheck` | `src/components/admin/admin-auth-check.tsx` |
| Admin post actions | `useAdminPostActions()` | `src/hooks/use-admin-post-actions.ts` |

**Forum delta:** Pin/lock threads (Supabase only), hide replies.

### Notifications
| Need | Fountain already has | File |
|---|---|---|
| Fetch notifications | `fetchNotifications()` | `src/app/api/notifications/route.ts` |
| Notification UI | `NotificationView` | `src/components/notifications/notification-view.tsx` |
| Notification context | `NotificationsProvider` | `src/components/notifications/notifications-context.tsx` |
| Notification feed | `NotificationsFeed` | `src/components/notifications/notifications-feed.tsx` |
| Notification button | `NotificationButton` | `src/components/notifications/notification-button.tsx` |

**Forum delta:** Filter to forum feeds only. UI already works as-is.

---

## Phase 8: Research Section

| Need | Fountain already has | File |
|---|---|---|
| Feed filtering | Feed context + filter | `src/contexts/feed-context.tsx` |
| Feed display | `FeedArticles` | `src/components/feed/feed-articles.tsx` |
| Search | `FeedSearch` | `src/components/feed/feed-search.tsx` |

**Forum delta:** Category badges, tag pills, filter toolbar. New UI but
same data patterns.

---

## Phase 9: Recovery & Sync

| Need | Fountain already has | File |
|---|---|---|
| Fetch posts from feed | `fetchPosts()` | Used throughout the app |
| Read metadata attributes | `post.metadata.attributes` | `src/app/p/[user]/[post]/page.tsx` |
| Service client for scripts | `createClient()` | `src/lib/db/service.ts` |

**Forum delta:** Recovery logic is new, but the Lens SDK calls are standard.

---

## Phase 10: Polish & Deploy

| Need | Fountain already has | File |
|---|---|---|
| SEO metadata | `generateMetadata()` | `src/lib/seo/metadata.ts` |
| Structured data | `generateArticleSchema()` | `src/lib/seo/structured-data.ts` |
| Sitemap | `sitemap.ts` | `src/app/sitemap.ts` |
| Error boundary | `error.tsx` | `src/app/error.tsx` |
| Header component | `Header` | `src/components/navigation/header.tsx` |
| User menu | `UserMenu` | `src/components/user/user-menu.tsx` |
| Mobile detection | `useIsMobile()` | `src/hooks/use-mobile.tsx` |

**Forum delta:** Forum-specific header, mobile nav, forum sitemap entries.
