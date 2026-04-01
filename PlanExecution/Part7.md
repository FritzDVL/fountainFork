# Part 7: Forum Features — Port from Current Codebase

## Goal

Port the interactive features from the current Web3Forum into the fountain
fork: voting, moderation, group membership management, notifications, and
profiles. These are adapted to work with the new forum schema (forum_threads,
forum_thread_replies, forum_votes) instead of the old tables.

---

## Prerequisites

- Part 6 complete (thread display working)
- Current Web3Forum codebase accessible for reference
- Lens React SDK hooks available (`useSessionClient`, etc.)

---

## Feature 1: Voting System

### What exists in current codebase
`hooks/common/use-voting.ts` — uses Lens reactions (`addReaction`, `undoReaction`)
with `PostReactionType` (upvote/downvote). Reads from `post.operations.hasUpvoted`
and `post.stats.upvotes`.

### What changes
We keep Lens reactions as the onchain source AND track votes in `forum_votes`
for fast display. The Supabase vote is the speed layer; the Lens reaction is
the permanent record.

### Port: useForumVote hook

```ts
// src/hooks/forum/use-forum-vote.ts

import { useCallback, useEffect, useState } from "react"
import {
  addReaction,
  undoReaction,
} from "@lens-protocol/client/actions"
import {
  PostReactionType,
  postId as toPostId,
  useSessionClient,
} from "@lens-protocol/react"
import { toast } from "sonner"

interface UseForumVoteArgs {
  publicationId: string
  initialUpvotes: number
  initialDownvotes: number
}

export function useForumVote({
  publicationId,
  initialUpvotes,
  initialDownvotes,
}: UseForumVoteArgs) {
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)
  const [userVote, setUserVote] = useState<1 | -1 | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const sessionClient = useSessionClient()

  // Check user's existing vote from Supabase
  useEffect(() => {
    async function checkVote() {
      if (!sessionClient.data) return
      const user = await sessionClient.data.getAuthenticatedUser()
      if (user.isErr()) return

      const res = await fetch(
        `/api/forum/votes?publicationId=${publicationId}&account=${user.value.account}`,
      )
      if (res.ok) {
        const data = await res.json()
        setUserVote(data.direction || null)
      }
    }
    checkVote()
  }, [publicationId, sessionClient.data])

  const vote = useCallback(
    async (direction: 1 | -1) => {
      if (!sessionClient.data) {
        toast.error("Please log in to vote")
        return
      }
      setIsLoading(true)

      try {
        const pid = toPostId(publicationId)
        const reactionType =
          direction === 1 ? PostReactionType.Upvote : PostReactionType.Downvote

        if (userVote === direction) {
          // Toggle off
          await undoReaction(sessionClient.data, {
            post: pid,
            reaction: reactionType,
          })
          setUserVote(null)
          if (direction === 1) setUpvotes((v) => v - 1)
          else setDownvotes((v) => v - 1)
        } else {
          // Undo previous if exists
          if (userVote !== null) {
            const prevType =
              userVote === 1
                ? PostReactionType.Upvote
                : PostReactionType.Downvote
            await undoReaction(sessionClient.data, {
              post: pid,
              reaction: prevType,
            })
            if (userVote === 1) setUpvotes((v) => v - 1)
            else setDownvotes((v) => v - 1)
          }
          // Add new
          await addReaction(sessionClient.data, {
            post: pid,
            reaction: reactionType,
          })
          setUserVote(direction)
          if (direction === 1) setUpvotes((v) => v + 1)
          else setDownvotes((v) => v + 1)
        }

        // Sync to Supabase
        const user = await sessionClient.data.getAuthenticatedUser()
        if (user.isOk()) {
          await fetch("/api/forum/votes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              publicationId,
              account: user.value.account,
              direction: userVote === direction ? 0 : direction,
            }),
          })
        }
      } catch (e) {
        console.error("Vote failed:", e)
        toast.error("Vote failed")
      } finally {
        setIsLoading(false)
      }
    },
    [publicationId, userVote, sessionClient.data],
  )

  return {
    upvotes,
    downvotes,
    score: upvotes - downvotes,
    userVote,
    isLoading,
    upvote: () => vote(1),
    downvote: () => vote(-1),
  }
}
```

### API Route for Votes

```ts
// src/app/api/forum/votes/route.ts

import { createClient } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const pubId = req.nextUrl.searchParams.get("publicationId")
  const account = req.nextUrl.searchParams.get("account")
  if (!pubId || !account) return NextResponse.json({ direction: null })

  const db = await createClient()
  const { data } = await db
    .from("forum_votes")
    .select("direction")
    .eq("publication_id", pubId)
    .eq("account_address", account)
    .single()

  return NextResponse.json({ direction: data?.direction || null })
}

export async function POST(req: NextRequest) {
  const { publicationId, account, direction } = await req.json()
  const db = await createClient()

  if (direction === 0) {
    // Remove vote
    await db
      .from("forum_votes")
      .delete()
      .eq("publication_id", publicationId)
      .eq("account_address", account)
  } else {
    await db.rpc("forum_apply_vote", {
      p_publication_id: publicationId,
      p_account: account,
      p_direction: direction,
    })
  }

  return NextResponse.json({ success: true })
}
```

---

## Feature 2: Moderation Tools

### What exists in current codebase
- `hooks/replies/use-hide-reply.ts` — uses `hideReply` from Lens SDK
- `hooks/communities/use-community-remove-member.ts` — `removeGroupMembers` + `banGroupAccounts`
- `hooks/communities/use-community-unban-member.ts` — `unbanGroupAccounts`
- `hooks/communities/use-add-moderator.ts` — `addAdmins` on the group
- `hooks/communities/use-remove-moderator.ts` — `removeAdmins`
- `hooks/communities/use-is-moderator.ts` — checks if user is group admin
- `components/thread/thread-reply-moderator-actions.tsx` — UI for mod actions

### Port strategy
These hooks use Lens SDK directly and are mostly group-address-agnostic.
Port them with minimal changes — just update the group address references
to use the new constants (COMMONS_GROUP_ADDRESS, RESEARCH_GROUP_ADDRESS).

### Key hooks to port (adapt, don't rewrite)

```ts
// src/hooks/forum/use-is-moderator.ts
// Adapted from hooks/communities/use-is-moderator.ts

import { useEffect, useState } from "react"
import { fetchAdminsFor } from "@lens-protocol/client/actions"
import { evmAddress } from "@lens-protocol/client"
import { useSessionClient } from "@lens-protocol/react"
import { COMMONS_GROUP_ADDRESS, RESEARCH_GROUP_ADDRESS } from "@/lib/forum/constants"

export function useIsModerator() {
  const [isModerator, setIsModerator] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const sessionClient = useSessionClient()

  useEffect(() => {
    async function check() {
      if (!sessionClient.data) {
        setIsModerator(false)
        setIsLoading(false)
        return
      }

      const user = await sessionClient.data.getAuthenticatedUser()
      if (user.isErr()) {
        setIsModerator(false)
        setIsLoading(false)
        return
      }

      // Check if admin of either group
      for (const groupAddr of [COMMONS_GROUP_ADDRESS, RESEARCH_GROUP_ADDRESS]) {
        const result = await fetchAdminsFor(sessionClient.data, {
          address: evmAddress(groupAddr),
        })
        if (result.isOk()) {
          const isAdmin = result.value.items.some(
            (a) => a.account.address === user.value.account,
          )
          if (isAdmin) {
            setIsModerator(true)
            setIsLoading(false)
            return
          }
        }
      }

      setIsModerator(false)
      setIsLoading(false)
    }
    check()
  }, [sessionClient.data])

  return { isModerator, isLoading }
}
```

```ts
// src/hooks/forum/use-hide-reply.ts
// Adapted from hooks/replies/use-hide-reply.ts

import { useCallback, useState } from "react"
import { hideReply } from "@lens-protocol/client/actions"
import { postId, useSessionClient } from "@lens-protocol/react"
import { toast } from "sonner"

export function useHideReply() {
  const [isLoading, setIsLoading] = useState(false)
  const sessionClient = useSessionClient()

  const hide = useCallback(
    async (publicationId: string) => {
      if (!sessionClient.data) {
        toast.error("Not logged in")
        return false
      }

      setIsLoading(true)
      try {
        const result = await hideReply(sessionClient.data, {
          post: postId(publicationId),
        })

        if (result.isErr()) {
          toast.error("Failed to hide reply")
          return false
        }

        // Also mark hidden in Supabase
        await fetch(`/api/forum/replies/${publicationId}/hide`, {
          method: "POST",
        })

        toast.success("Reply hidden")
        return true
      } catch {
        toast.error("Failed to hide reply")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [sessionClient.data],
  )

  return { hide, isLoading }
}
```

### Moderation actions API

```ts
// src/app/api/forum/replies/[publicationId]/hide/route.ts

import { createClient } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  req: NextRequest,
  { params }: { params: { publicationId: string } },
) {
  const db = await createClient()

  await db
    .from("forum_thread_replies")
    .update({ is_hidden: true })
    .eq("publication_id", params.publicationId)

  return NextResponse.json({ success: true })
}
```

---

## Feature 3: Group Membership Management

### What exists in current codebase
- `hooks/communities/use-join-community.ts` — `joinGroup`
- `hooks/communities/use-leave-community.ts` — `leaveGroup`
- `hooks/communities/use-request-join-community.ts` — `joinGroup` (with approval)
- `hooks/communities/use-community-membership-management.ts` — approve/deny requests
- `hooks/communities/use-community-members.ts` — list members
- `hooks/communities/use-community-banned-members.ts` — list banned

### Port strategy
These are pure Lens SDK operations. Port directly, parameterize by group
address. The main change: instead of one community group, we have two
main groups (Commons + Research) plus optional community groups.

```ts
// src/hooks/forum/use-join-group.ts

import { useCallback, useState } from "react"
import { joinGroup } from "@lens-protocol/client/actions"
import { evmAddress, useSessionClient } from "@lens-protocol/react"
import { handleOperationWith } from "@lens-protocol/client/viem"
import { useWalletClient } from "wagmi"
import { toast } from "sonner"

export function useJoinGroup() {
  const [isLoading, setIsLoading] = useState(false)
  const sessionClient = useSessionClient()
  const { data: walletClient } = useWalletClient()

  const join = useCallback(
    async (groupAddress: string) => {
      if (!sessionClient.data || !walletClient) {
        toast.error("Please log in and connect wallet")
        return false
      }

      setIsLoading(true)
      const pending = toast.loading("Requesting to join...")

      try {
        const result = await joinGroup(sessionClient.data, {
          group: evmAddress(groupAddress),
        })
          .andThen(handleOperationWith(walletClient))
          .andThen(sessionClient.data.waitForTransaction)

        toast.dismiss(pending)

        if (result.isErr()) {
          toast.error("Failed to join")
          return false
        }

        toast.success("Join request sent! Waiting for approval.")
        return true
      } catch {
        toast.dismiss(pending)
        toast.error("Failed to join")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [sessionClient.data, walletClient],
  )

  return { join, isLoading }
}
```

The approve/deny/ban/unban hooks follow the same pattern — direct ports
from the current codebase with the group address parameterized.

---

## Feature 4: Notifications

### What exists in current codebase
- `hooks/notifications/use-notifications.ts` — `fetchNotifications` from Lens
- `components/notifications/` — various notification item renderers

### Port strategy
Lens notifications work at the protocol level — they're not tied to our
app's data model. Port the hook and components directly. The only change:
filter notifications to our app's feeds.

```ts
// src/hooks/forum/use-notifications.ts

import { useEffect, useState } from "react"
import { fetchNotifications } from "@lens-protocol/client/actions"
import { evmAddress, type Notification, useSessionClient } from "@lens-protocol/react"
import { COMMONS_FEED_ADDRESS, RESEARCH_FEED_ADDRESS } from "@/lib/forum/constants"

export function useForumNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const sessionClient = useSessionClient()

  useEffect(() => {
    async function load() {
      if (!sessionClient.data) return

      const result = await fetchNotifications(sessionClient.data, {
        filter: {
          feeds: [
            { feed: evmAddress(COMMONS_FEED_ADDRESS) },
            { feed: evmAddress(RESEARCH_FEED_ADDRESS) },
          ],
        },
      })

      if (result.isOk()) {
        setNotifications([...result.value.items])
      }
      setLoading(false)
    }
    load()
  }, [sessionClient.data])

  return { notifications, loading }
}
```

Notification renderer components (`mention-notification-item.tsx`,
`reaction-notification-item.tsx`, `reply-notification-item.tsx`) port
directly — they render Lens Notification objects which haven't changed.

---

## Feature 5: Profile Pages

### What exists in current codebase
- `hooks/account/use-profile-account.ts` — fetch account + stats
- `components/profile/profile-header.tsx` — cover image, avatar, bio
- `components/profile/profile-stats.tsx` — followers, following, posts
- `components/profile/profile-recent-activity.tsx` — recent posts
- `components/profile/profile-joined-communities.tsx` — groups

### Port strategy
Profile pages are Lens-native — they show account data, not forum-specific
data. Port directly. Add a "Forum Activity" tab that queries `forum_threads`
and `forum_thread_replies` by `author_address`.

```ts
// src/lib/forum/get-user-forum-activity.ts

import { createClient } from "@/lib/db/client"

export async function getUserForumActivity(authorAddress: string) {
  const db = await createClient()

  const { data: threads } = await db
    .from("forum_threads")
    .select("root_publication_id, title, category, reply_count, created_at")
    .eq("author_address", authorAddress)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20)

  const { data: replies } = await db
    .from("forum_thread_replies")
    .select(`
      publication_id,
      position,
      created_at,
      thread_id,
      forum_threads!inner(root_publication_id, title)
    `)
    .eq("author_address", authorAddress)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20)

  return { threads: threads || [], replies: replies || [] }
}
```

---

## Feature 6: Authorization Endpoint — Membership Check

In Part 1, the auth endpoint returns `allowed: true` for everyone.
Now we can tighten it to check group membership.

Update `src/authorize.ts` in the auth server:

```ts
// In the auth server (society-forum-auth)
// Updated authorize.ts with membership check

import express from "express"
import { PRIVATE_KEY } from "./config"
import { PublicClient, mainnet, evmAddress } from "@lens-protocol/client"
import { fetchGroupMembers } from "@lens-protocol/client/actions"

const COMMONS_GROUP = "0x..."  // from Part 2
const client = PublicClient.create({ environment: mainnet })

const router = express.Router()

router.post("/", async function (req, res) {
  if (req.body.test === true) return res.sendStatus(200)

  const { account, signedBy } = req.body
  if (!account || !signedBy) {
    return res.status(400).json({ error: "Missing fields" })
  }

  // Check if account is a member of the Commons group
  // (Members of Commons can access the forum)
  const members = await fetchGroupMembers(client, {
    group: evmAddress(COMMONS_GROUP),
    filter: { member: evmAddress(account) },
  })

  const isMember = members.isOk() && members.value.items.length > 0

  if (!isMember) {
    return res.json({
      allowed: false,
      reason: "You must be a member of the Society Protocol community to access this forum.",
    })
  }

  res.json({
    allowed: true,
    sponsored: true,
    signingKey: PRIVATE_KEY,
  })
})

export default router
```

Note: This is optional and can be enabled later. Start with `allowed: true`
for everyone during development, then enable membership checks when ready.

---

## Port Checklist — Files to Copy/Adapt

From `hooks/common/`:
- [x] `use-voting.ts` → `hooks/forum/use-forum-vote.ts` (adapted)

From `hooks/communities/`:
- [x] `use-is-moderator.ts` → `hooks/forum/use-is-moderator.ts` (adapted)
- [x] `use-join-community.ts` → `hooks/forum/use-join-group.ts` (adapted)
- [ ] `use-leave-community.ts` → `hooks/forum/use-leave-group.ts` (direct port)
- [ ] `use-community-membership-management.ts` → `hooks/forum/use-membership-management.ts` (adapt)
- [ ] `use-community-members.ts` → `hooks/forum/use-group-members.ts` (direct port)
- [ ] `use-community-banned-members.ts` → `hooks/forum/use-banned-members.ts` (direct port)
- [ ] `use-community-remove-member.ts` → `hooks/forum/use-remove-member.ts` (direct port)
- [ ] `use-community-unban-member.ts` → `hooks/forum/use-unban-member.ts` (direct port)
- [ ] `use-add-moderator.ts` → `hooks/forum/use-add-moderator.ts` (direct port)
- [ ] `use-remove-moderator.ts` → `hooks/forum/use-remove-moderator.ts` (direct port)

From `hooks/replies/`:
- [x] `use-hide-reply.ts` → `hooks/forum/use-hide-reply.ts` (adapted)

From `hooks/notifications/`:
- [x] `use-notifications.ts` → `hooks/forum/use-notifications.ts` (adapted)

From `hooks/account/`:
- [ ] `use-profile-account.ts` → direct port (Lens-native, no changes)

From `components/notifications/`:
- [ ] All notification item components → direct port

From `components/profile/`:
- [ ] All profile components → direct port + add forum activity tab

---

## Checklist — Part 7 Complete When:

- [ ] Voting works on threads and replies (Lens reactions + Supabase sync)
- [ ] Moderators can hide replies (Lens hideReply + Supabase is_hidden)
- [ ] Moderator check works for both groups
- [ ] Users can request to join groups
- [ ] Admins can approve/deny membership requests
- [ ] Admins can remove/ban members
- [ ] Notifications show forum-specific activity
- [ ] Profile pages show user info + forum activity
- [ ] Auth endpoint optionally checks group membership

---

## Next: Part 8 — Navigation & Layout

With all features working, Part 8 builds the app shell: homepage layout,
navbar with auth state, category navigation, search, and mobile responsiveness.
