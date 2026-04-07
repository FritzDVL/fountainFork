# How Forum Recovery Works — The Unkillable Forum

## The Core Idea

Every post on the forum is published as a standalone Lens Protocol
article. Lens stores it permanently on the blockchain. Grove stores
the full content permanently on decentralized storage. Our Supabase
database is just a fast cache — a speed layer for displaying data
quickly. It is NOT the source of truth.

```
┌─────────────────────────────────────────────┐
│           PERMANENT (blockchain)            │
│                                             │
│  Lens Protocol: post ID, author, timestamp  │
│  Grove Storage: full article content        │
│  Metadata attributes: forumCategory,        │
│    forumThreadId, contentJson, tags          │
│                                             │
│  → Cannot be deleted, censored, or lost     │
│  → Exists as long as Lens Protocol exists   │
└─────────────────────────────────────────────┘
              │
              │  Recovery script reads this
              │  and rebuilds everything below
              ▼
┌─────────────────────────────────────────────┐
│           REPLACEABLE (our server)          │
│                                             │
│  Supabase: thread structure, view counts,   │
│    search index, moderation flags           │
│  VPS: the Next.js app serving the forum     │
│                                             │
│  → Can be destroyed and rebuilt             │
│  → Server is disposable, data is not        │
└─────────────────────────────────────────────┘
```

## What Makes This Possible

When we publish a forum post, we embed "recovery instructions" in the
Lens metadata. These are key-value pairs stored permanently alongside
the post:

**Thread root:**
```
forumCategory: "consensus"     ← "I am a thread in the Consensus category"
contentJson: { ... }           ← "Here is my full rich text content"
```

**Reply:**
```
forumThreadId: "0x1234...abcd" ← "I am a reply to this thread"
contentJson: { ... }           ← "Here is my full rich text content"
```

The recovery script reads these attributes and reconstructs the
database. It doesn't need any prior knowledge of what threads exist —
it discovers everything by scanning the Lens Feeds.

## Disaster Scenarios

### Scenario 1: Database Wiped
Someone drops all tables, or Supabase has an outage.
→ Run `scripts/recover-forum.ts`
→ Scans both Lens Feeds, rebuilds all tables
→ Forum is back in minutes

### Scenario 2: VPS Destroyed
Server catches fire, hosting provider goes bankrupt.
→ Get any new server (any provider, any location)
→ Clone the repo, install dependencies
→ Set up fresh Supabase (Docker or hosted)
→ Run recovery script
→ Forum is back, same content, new server

### Scenario 3: Hostile Takeover
Someone gains access and deletes everything maliciously.
→ Same as Scenario 2 — spin up new instance, recover
→ The attacker cannot delete the Lens data
→ They can only destroy the replaceable layer

### Scenario 4: Project Abandoned
Original team stops maintaining the forum.
→ Anyone can fork the repo (it's open source)
→ They point it at the same Feed addresses
→ Run recovery script on their own Supabase
→ A complete mirror of the forum exists independently
→ New posts on either instance appear on both (same Feeds)

### Scenario 5: Gradual Drift
The sync job stops running, Supabase gets stale.
→ Run recovery script to catch up
→ Or restart the cron job
→ No data is lost, just temporarily not displayed

## What This Does NOT Provide

- **Real-time P2P sync:** Instances don't talk to each other directly.
  They both read from Lens independently. There's a delay (up to 5 min
  with the sync cron).

- **Decentralized hosting:** You still need a server to run the app.
  The data is decentralized, the app is not. Someone has to pay for
  hosting.

- **Privacy:** All forum content is public on Lens. Recovery means
  anyone can read everything. This is a feature for a public forum,
  but not suitable for private discussions.

- **Moderation recovery:** Pin/lock/hide status is Supabase-only.
  After recovery, all threads are unpinned and unlocked. Moderators
  would need to re-apply moderation actions.

## Why This Is Powerful

Traditional forums (Discourse, phpBB, vBulletin) store everything in
one database. If that database is lost, the forum is gone. Backups
help, but they can be incomplete, corrupted, or stolen.

Our forum stores content on a public blockchain. The database is just
a view layer. You can destroy it and rebuild it. You can run multiple
copies. You can fork it. The content belongs to the users (their Lens
accounts), not to the server operator.

This is the fundamental promise of web3 applied to forums:
**Your server is disposable. Your data is permanent.**
