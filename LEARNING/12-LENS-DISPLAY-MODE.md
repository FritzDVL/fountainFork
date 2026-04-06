# Lens Display Mode — Controlling What Other Apps See

## The Problem

Everything published on Lens is public. Other apps (Soclly, Hey, etc.)
can display your posts in their feeds. By default, they show the full
content — your entire article text leaks to every app.

## Fountain's Solution: Lens Display Modes

Fountain has a "Distribution" setting with 4 modes that control what
goes into the `content` field of the Lens article metadata:

| Mode | What other apps see |
|---|---|
| `content_only` | Full markdown text (everything leaks) |
| `link` | Just the URL to your app |
| `title_link` | Title + URL to your app |
| `content_link` | "Posted on [app]" + URL + full content |

The `content` field is what other apps use as preview text. The actual
rich content lives in the `contentJson` metadata attribute and on Grove.

## What We Use

We hardcode `title_link` mode for all forum posts:

```ts
content: `${draft.title} — https://forum.societyprotocol.io`
```

Other apps see: `My Thread Title — https://forum.societyprotocol.io`
Our forum sees: full rich content from `contentJson` attribute

## Why This Matters

- Posts don't leak full text to other apps' feeds
- Other apps show a title + link back to YOUR forum
- Users must visit your forum to read the full content
- The content is still permanently stored (Grove + contentJson attribute)
- This is NOT encryption or access control — the data is still public
  if someone reads the metadata attributes directly

## Where This Is Implemented

- `src/lib/forum/publish-thread.ts` — thread content field
- `src/lib/forum/publish-reply.ts` — reply content field
- Reference: `src/lib/publish/get-post-content.ts` (Fountain's implementation)

## Key Lesson

We missed this because we didn't study Fountain's Distribution tab
closely enough. The `getPostContent()` function in Fountain handles
this — we should have reused its pattern from the start.
