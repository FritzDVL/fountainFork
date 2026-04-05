# Phase 6 Learnings

## 1. Group membership required before posting
Even with open groups (no approval), users must `joinGroup()` before
posting to a group-gated feed. The `GroupGatedFeedRule` checks membership,
not just that the group exists. One-time join per user, instant.

## 2. Lens metadata `content` field must be non-empty
The `article()` metadata builder requires `content` (markdown) to have
at least 1 character. Empty string = validation error. Solution: use
the MarkdownPlugin serializer from inside the Plate editor context.

## 3. MarkdownPlugin only works inside Plate context
`api.markdown.serialize()` is only accessible via `useEditorPlugin(MarkdownPlugin)`
which only works inside a `<Plate>` component tree. You cannot call it
from outside. Solution: ForumEditor exposes `editorRef` callback with
`getContentJson()` and `getContentMarkdown()` methods.

## 4. Two views of the same content
Every forum post is a standalone Lens publication. It has two views:
- **Forum view** (`/thread/[id]`) — stacked with other replies
- **Article view** (`/p/[user]/[pubId]`) — Fountain's full article page
  with Grove hash, tipping, license, author card

The "Onchain" badge links from forum view → article view.

## 5. Reuse Fountain's resolve pattern
Fountain uses `storageClient.resolve(uri)` to turn `lens://` URIs into
real URLs, and `resolveUrl()` from `src/lib/utils/resolve-url.ts` for
general URI resolution. Don't hardcode external URLs.

## 6. Article page needs cleanup (future task)
The standalone article page (`/p/[user]/[post]`) shows comment sections
and "read more" links to other publications. These should be removed
for forum posts since:
- Comments are handled by the forum thread (not Lens comments)
- "Read more" links to unrelated Fountain articles

This cleanup is noted for Phase 10 (Polish).
