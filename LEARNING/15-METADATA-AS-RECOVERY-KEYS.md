# Metadata Attributes as Recovery Keys

## The Pattern

Every forum post embeds "recovery instructions" in its Lens metadata
attributes. These are permanent key-value pairs that tell any future
recovery script how to reconstruct the forum structure.

## What We Store

### On Thread Roots (publish-thread.ts)

```ts
attributes: [
  {
    key: "contentJson",
    type: MetadataAttributeType.JSON,
    value: JSON.stringify(draft.contentJson)  // full Plate.js document
  },
  {
    key: "forumCategory",
    type: MetadataAttributeType.STRING,
    value: category  // e.g. "consensus", "beginners"
  },
]
```

Plus `tags` in the metadata top-level (category slug + user tags).

### On Replies (publish-reply.ts)

```ts
attributes: [
  {
    key: "contentJson",
    type: MetadataAttributeType.JSON,
    value: JSON.stringify(draft.contentJson)  // full Plate.js document
  },
  {
    key: "forumThreadId",
    type: MetadataAttributeType.STRING,
    value: threadRootPublicationId  // links reply to its parent thread
  },
]
```

## How Recovery Reads Them

```ts
for (const post of allPosts) {
  const attrs = post.metadata.attributes || [];
  const forumCategory = attrs.find(a => a.key === "forumCategory")?.value;
  const forumThreadId = attrs.find(a => a.key === "forumThreadId")?.value;
  const contentJson = attrs.find(a => a.key === "contentJson")?.value;

  if (forumCategory) {
    // This is a THREAD ROOT → insert into forum_threads
  } else if (forumThreadId) {
    // This is a REPLY → insert into forum_thread_replies
  } else {
    // Not a forum post → skip
  }
}
```

## Why NOT Use commentOn?

Lens has a native `commentOn` field that links a comment to a parent
post. We deliberately do NOT use this because:

1. It creates a Lens-level parent-child relationship we can't control
2. Other apps would show our replies as comments on the thread root
3. Thread structure would be split between Lens (parent link) and
   Supabase (position, category, etc.)

Instead, every post is a STANDALONE article. The thread structure
exists only in our metadata attributes and Supabase. This gives us
full control over how threads are displayed and organized.

See: BLUEPRINT/CODEBASE-RULES.md Rule 14

## Key Lesson

Metadata attributes are the bridge between the permanent layer (Lens)
and the replaceable layer (Supabase). They must contain everything
needed to reconstruct the forum without any other data source.

If you add a new piece of forum structure (e.g. thread priority,
post type), it MUST be stored as a metadata attribute on the Lens
publication. Otherwise it will be lost on recovery.
