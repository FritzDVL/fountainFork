# Core Concept V2: The Forum Display Layer

## The Fundamental Idea

Fountain.ink is article-centric. Every feature revolves around writing,
publishing, and displaying individual articles. The editor, the publish
dialog, the article page, the blog feed — all designed for standalone
articles.

You are keeping ALL of that. But you're adding a forum experience on
top by creating a web2 display layer that mirrors Lens publication
content into Supabase and presents it in a forum layout.

The critical distinction: **the thread page is a pure web2 construct**.
It has no Lens URL. It's not a Lens publication. It's a page in your
app that pulls content from your Supabase database and stacks multiple
publications' content vertically. The thread exists only in your
database. The individual publications exist on Lens.

---

## What a Thread Actually Is

A thread is NOT a Lens primitive. There is no "thread" on Lens.

A thread is a row in your Supabase `forum_threads` table that says:
"these publications, in this order, form a conversation."

```
forum_threads table:
  id: "thread-uuid-123"
  title: "How does Proof of Hunt work?"
  category: "consensus"
  publications: ordered list of Lens publication IDs

Thread page /thread/thread-uuid-123:
  ┌─────────────────────────────────────┐
  │ Publication X (the opening post)     │
  │ contentJson rendered via Plate.js    │
  │ author, timestamp                    │
  ├─────────────────────────────────────┤
  │ Publication Y (a response)           │
  │ contentJson rendered via Plate.js    │
  │ author, timestamp                    │
  ├─────────────────────────────────────┤
  │ Publication Z (another response)     │
  │ contentJson rendered via Plate.js    │
  │ author, timestamp                    │
  ├─────────────────────────────────────┤
  │ [Reply Editor — write your response] │
  └─────────────────────────────────────┘
```

The thread ID is a Supabase UUID, not a Lens publication ID. The URL
is `/thread/thread-uuid-123`, not `/p/user/post`. There is no onchain
representation of the thread itself.

---

## No commentOn

The original plan used Lens `commentOn` to link replies to root posts.
That's dropped. Here's why:

- `commentOn` creates a parent-child relationship on Lens. That means
  the reply is visually attached to the root post on Hey.xyz and other
  Lens apps. You don't want that — each publication should stand alone
  as a clean, pristine article on Lens.

- `commentOn` constrains you to Lens's reply model. You want your own
  ordering, your own threading, your own display logic. Supabase gives
  you that freedom.

- Without `commentOn`, every publication is a standalone article. On
  Lens, on Hey.xyz, on any other app — it's just an article. Only on
  YOUR forum does it appear as part of a thread.

The thread structure lives entirely in Supabase:

```
forum_thread_entries table:
  thread_id:       "thread-uuid-123"
  publication_id:  "0x01-0x42"        ← Lens publication ID
  position:        1                   ← order in thread
  content_json:    { ... }             ← mirrored from Lens metadata
  author_address:  "0xabc..."
  created_at:      timestamp
```

Position 1 is the opening post. Position 2, 3, 4... are responses.
There is no "root" in the Lens sense. There's just "the first entry
in this thread."

---

## No Comments on Individual Publication Pages

Fountain currently shows a `CommentPreview` at the bottom of every
article page (`/p/[user]/[post]`). This lets people write Lens-native
comments directly on the publication.

In your fork, this gets removed. Each publication's own page is a
clean, standalone article. No comment section. No replies. Just the
content, the author, the metadata.

If someone wants to respond, they go to the thread page and write
their response there. That response becomes its own Lens publication,
which gets its own clean article page, AND appears as the next entry
in the thread.

```
Publication page (/p/user/my-article):
  ┌─────────────────────────────────────┐
  │ Full article content                 │
  │ Author, date, tags                   │
  │ Reactions (upvote, bookmark, etc.)   │
  │                                      │
  │ NO comment section                   │
  │ NO reply area                        │
  │                                      │
  │ "This post is part of a discussion"  │
  │ → Link to /thread/thread-uuid-123    │
  └─────────────────────────────────────┘
```

---

## How Publishing Works in the Forum

### Creating a new thread

1. User writes in Plate.js editor (same as Fountain)
2. User clicks Publish
3. Publish dialog shows — but instead of Fountain's "Distribution" tab
   with blog selector, there's a **category selector** (which board
   does this thread belong to?)
4. Article publishes to Lens as a normal standalone publication
5. ADDITIONALLY: a new row is created in `forum_threads`, and the
   publication is added as position 1 in `forum_thread_entries`
6. The `content_json` from the publication metadata is mirrored into
   the Supabase entry

### Responding to a thread

1. User is on a thread page, clicks the reply editor at the bottom
2. Writes their response in Plate.js editor (same editor, compact mode)
3. Clicks "Post Reply"
4. Article publishes to Lens as a normal standalone publication
   (NO `commentOn`, NO link to the opening post on Lens)
5. ADDITIONALLY: a new row is added to `forum_thread_entries` with
   the next position number
6. The `content_json` is mirrored into Supabase
7. Thread page refreshes, new entry appears at the bottom

On Lens, both the opening post and the response are identical in
nature — standalone articles. The only place they're connected is
in your Supabase database.

---

## Recovery: What If Supabase Disappears?

This is the critical question. If there's no `commentOn` linking
publications, how do you rebuild threads from Lens?

Answer: **metadata attributes**. When publishing a response to a
thread, you store a custom attribute in the Lens metadata:

```ts
attributes: [
  { key: "contentJson", type: JSON, value: "..." },       // already exists
  { key: "forumThreadId", type: STRING, value: "thread-uuid-123" },
  { key: "forumPosition", type: NUMBER, value: "3" },
]
```

These attributes are stored permanently on Grove as part of the
publication metadata. They're invisible to other Lens apps (they
don't know what `forumThreadId` means), but YOUR recovery script
can read them.

Recovery process:
```
1. Fetch all publications from your feeds (Commons + Research)
2. For each publication, read metadata attributes
3. If it has forumThreadId → it belongs to a thread
4. Group by forumThreadId
5. Order by forumPosition (or by timestamp as fallback)
6. Rebuild forum_threads and forum_thread_entries tables
7. Forum is back online with exact same thread structure
```

For the opening post (position 1), the attribute would be:
```ts
{ key: "forumThreadId", value: "thread-uuid-123" }
{ key: "forumPosition", value: "1" }
{ key: "forumCategory", value: "consensus" }
{ key: "forumThreadTitle", value: "How does Proof of Hunt work?" }
```

The opening post carries the thread title and category so the
`forum_threads` row can be fully reconstructed from it alone.

This gives you TWO independent recovery paths:
- **forumThreadId + forumPosition** → exact thread reconstruction
- **Timestamps on publications** → fallback ordering if positions
  are somehow lost

---

## What Supabase Stores (Full Mirror)

You said: "No need to store just enough information. If it's more
convenient to keep the whole of publications on the Supabase and
increase efficiency then that's what we will do."

So Supabase stores EVERYTHING needed to render the forum without
any Lens API calls:

```
forum_threads:
  id                  UUID (the thread ID, used in URLs)
  title               text
  category            text (slug)
  feed                text ('commons' or 'research')
  author_address      text (who opened the thread)
  author_username     text
  entry_count         integer (how many posts in thread)
  last_entry_at       timestamptz
  views_count         integer
  is_pinned           boolean
  is_locked           boolean
  created_at          timestamptz

forum_thread_entries:
  id                  UUID
  thread_id           UUID → forum_threads
  publication_id      text (Lens publication ID)
  position            integer (1, 2, 3...)
  content_json        jsonb (FULL Plate.js JSON — renders the article)
  content_text        text (plain text for search)
  content_markdown    text (markdown version)
  title               text (publication title, if any)
  subtitle            text
  cover_url           text
  author_address      text
  author_username     text
  created_at          timestamptz

forum_categories:
  slug, name, description, section, feed, display_order, thread_count
```

Every field needed to render a thread page comes from Supabase.
Zero Lens API calls for reading. Lens is only called when publishing.

---

## Fountain Features: Repurpose, Don't Delete

You said: "We might rebrand those features with a new name for
different functions on the forum if they fit this new model of UX."

Here's how Fountain's existing features map to forum concepts:

### Blog → Board / Category Group

Fountain: A "blog" is a Lens Group with a Feed. Users create blogs
to organize their articles. The blog has a title, slug, description,
and its own page (`/b/[blog]`).

Forum: A "board" or "category group" serves the same purpose — it's
an organizational container. The Commons Group and Research Group are
your two main "blogs." The blog creation flow (`CreateBlogModal`)
could be repurposed to let admins create new category groups or
sub-communities.

The blog page (`/b/[blog]`) becomes the board page — showing threads
in that category instead of articles in that blog.

### Blog Select Menu → Category Selector

Fountain: When publishing, the Distribution tab has a `BlogSelectMenu`
where you pick which blog to publish to. This determines which Lens
Group's Feed the article goes to.

Forum: Replace with a category selector. Instead of "Publish to
[My Blog]", it's "Post in [Consensus]" or "Post in [Beginners]".
The category determines which Feed (Commons or Research) the
publication goes to.

### Article Details Tab → Thread Details

Fountain: Title, subtitle, cover image, slug, tags, original date,
canonical URL.

Forum: Keep title and tags. Subtitle and cover image are optional
(most forum posts won't have them, but they CAN — it's still a full
article). Slug can auto-generate. Add category selector here or as
a separate tab.

### Monetization Tab → Keep or Repurpose

Fountain: Collecting settings (price, editions, referral rewards).

Forum: Could keep as-is. Forum posts are still Lens publications
that can be collected. Or disable for now and re-enable later.
The code stays, just hide the tab.

### Newsletter / Listmonk → Notification System

Fountain: Send newsletter to blog subscribers when publishing.

Forum: Could repurpose for thread subscription notifications.
"Notify me when someone responds to this thread." The Listmonk
infrastructure is already there. But this is a later feature.

### User Profile (`/u/[user]`) → Forum Profile

Fountain: Shows user's articles, followers, following.

Forum: Add a "Forum Activity" tab showing threads started and
responses posted. The existing profile infrastructure stays.

### Draft System → Keep As-Is

Fountain: Auto-saves drafts to Supabase while writing.

Forum: Works perfectly for writing thread openers. When someone
starts writing a new thread, it auto-saves as a draft. When they
publish, the draft becomes a Lens publication AND the first entry
in a new thread.

For replies (written in the compact editor at the bottom of a
thread page), drafts are not needed — the content is local state
until published.

### Feed / Home Page → Board Homepage

Fountain: Shows curated articles, latest articles, search.

Forum: Shows board sections with categories, thread counts,
latest activity. The feed components (`feed-articles.tsx`,
`feed-latest.tsx`, etc.) could be adapted to show thread lists
instead of article cards.

---

## What Gets Modified (Specific Changes)

### Publish Dialog (`publish-dialog.tsx`)

Current: 3 tabs — Article Details, Monetization, Distribution.
Distribution has BlogSelectMenu + newsletter + Lens display options.

Modified: Replace Distribution tab content. Instead of blog selector,
show category selector (grouped by section). Instead of newsletter
checkbox, show "Post as new thread" vs "this is a standalone article"
toggle. Keep Lens display options (they control how the article
appears on Hey.xyz — still useful).

The publish flow itself (`publishPost` in `publish-post.ts`) gets
a small addition: after publishing to Lens, also write to
`forum_threads` + `forum_thread_entries` if the user chose to
create a thread.

### Article Page (`/p/[user]/[post]/page.tsx`)

Current: Shows article + author + reactions + CommentPreview.

Modified: Remove CommentPreview. Add a link to the thread page if
this publication is part of a thread (look up in `forum_thread_entries`
by publication_id). Everything else stays.

### Header (`header.tsx`)

Current: Logo, search, draft create button, notifications, user menu.

Modified: Add "Boards" link in navigation. Possibly replace or
supplement "New Post" with "New Thread" depending on context.

### New Routes (Added)

```
/boards                              → Board homepage (sections + categories)
/boards/[feed]?category=[slug]       → Thread list for a category
/thread/[thread-id]                  → Thread page (stacked entries)
```

These are new pages. They read from Supabase only.

### Existing Routes (Kept)

```
/p/[user]/[post]    → Article page (clean, no comments)
/w/[id]             → Editor (unchanged)
/u/[user]           → Profile (add forum activity tab)
/settings           → Settings (unchanged)
/search             → Search (add thread search)
```

---

## Summary: What This Project Is

You're taking Fountain.ink — a polished, professional article
publishing platform built on Lens Protocol — and adding a forum
display layer that:

1. Lets users organize articles into threaded conversations
2. Displays those conversations as stacked posts on thread pages
3. Stores thread structure in Supabase (pure web2, fast, flexible)
4. Keeps every individual article as a clean standalone Lens publication
5. Can recover thread structure from Lens metadata if Supabase is lost
6. Repurposes Fountain's existing features (blogs → boards, blog
   selector → category selector, article feed → thread list) rather
   than deleting them

The publishing pipeline doesn't change. The editor doesn't change.
The Lens integration doesn't change. What changes is how the content
is ORGANIZED and DISPLAYED after publishing.
