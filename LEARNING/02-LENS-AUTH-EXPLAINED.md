# How Lens Protocol Authentication Works

A beginner-friendly explanation of the auth system, Builder role,
and why the Lens Developer Dashboard was confusing.

---

## The 4 Roles in Lens

Lens Protocol has 4 ways to authenticate. Think of them as 4 different
badges you can wear:

```
🏠 Account Owner    — "I own this Lens account"
🔑 Account Manager  — "I'm authorized to act on someone's behalf"
👶 Onboarding User  — "I'm new, I just want to create an account"
🔧 Builder          — "I'm a developer configuring things"
```

Most of the time, your app's USERS log in as Account Owner.
YOU, the developer, log in as Builder when you need to set things up.

---

## What "Builder" Actually Means

Builder is NOT a special status you apply for. It's just a login mode.

Any wallet can log in as a Builder. The difference is what you can DO
once logged in:

| As Account Owner | As Builder |
|---|---|
| Post articles | Create Apps |
| Follow people | Create Groups |
| React to posts | Create Feeds |
| Join groups | Register auth endpoints |
| | Add app signers |
| | Configure sponsorships |

The key insight: **Builder operations affect the infrastructure.**
Account Owner operations affect the social graph.

---

## Why the Developer Dashboard Was Confusing

When you use the Lens Developer Dashboard at `developer.lens.xyz`:

1. You connect your wallet
2. The dashboard logs you in as Builder automatically
3. You see a GUI to manage your apps, groups, feeds, etc.

The confusion: **the dashboard hides the Builder login from you.**
You never see the word "Builder" in the UI. It just works.

But when you try to do the same things via code (like running a script
to create a Group), you need to explicitly say "I'm logging in as
Builder" — and if you don't know that, nothing works.

This is what the registration script does:

```ts
// Step 1: Log in as Builder
const authenticated = await client.login({
  builder: {                    // ← THIS is the magic word
    address: signer.address,
  },
  signMessage: signMessageWith(signer),
});

// Step 2: Now you can do Builder things
await addAppAuthorizationEndpoint(sessionClient, { ... });
await addAppSigners(sessionClient, { ... });
```

---

## The Authorization Flow (Visual)

```
                    YOUR APP                    LENS API                YOUR AUTH SERVER
                    (Next.js)                   (Lens's servers)        (Railway/Render)
                        │                           │                       │
  User clicks           │                           │                       │
  "Connect Wallet" ────→│                           │                       │
                        │──── Login request ───────→│                       │
                        │                           │──── POST /authorize ─→│
                        │                           │     { account, signedBy }
                        │                           │                       │
                        │                           │     { allowed: true } │
                        │                           │←─────────────────────│
                        │←── Session token ────────│                       │
  User is logged in ←──│                           │                       │
                        │                           │                       │
  User creates a post ─→│                           │                       │
                        │──── post() ─────────────→│                       │
                        │                           │── sign with signer ──→│
                        │                           │── send to Lens Chain  │
                        │←── success ──────────────│                       │
  Post appears! ←──────│                           │                       │
```

Key points:
- The auth server is called EVERY time someone logs in or refreshes
- The auth server is NOT called for every post/action (that's the signer)
- The signer key is registered once and used by Lens API automatically

---

## The Two Secrets Explained

### Secret 1: AUTH_API_SECRET (Bearer Token)

This is a password shared between Lens API and your auth server.

```
Lens API → Your auth server:
  POST /authorize
  Authorization: Bearer <AUTH_API_SECRET>
  { "account": "0x...", "signedBy": "0x..." }
```

Your auth server checks: "Is the Bearer token correct?" If not, it
returns 401. This prevents random people from calling your endpoint.

### Secret 2: SIGNER_PRIVATE_KEY

This is a cryptographic key that signs operations. When a user posts
through your app, Lens API uses this key to stamp the operation.

The Lens Protocol (onchain) checks: "Is this stamp from a registered
signer for this app?" If yes, the operation is accepted.

This is called **App Verification** — it proves the operation came
from your app, not a fake copy.

---

## What Happens If You Don't Set Up Auth?

If you skip the auth server entirely:

- ✅ Users can still log in (Lens allows it by default)
- ✅ Users can still post
- ❌ You can't control WHO logs in
- ❌ You can't sponsor gas fees for users
- ❌ Operations won't be "verified" as coming from your app
- ❌ On Hey.xyz, posts won't show your app name

For development/testing, this is fine. For production, you want auth.

---

## Glossary

| Term | Plain English |
|---|---|
| Builder | Developer login mode — lets you configure apps/groups/feeds |
| Session Client | An authenticated connection to the Lens API |
| Authorization Endpoint | Your auth server's URL that Lens calls |
| Bearer Token | The shared secret in the HTTP header |
| App Signer | The key that stamps operations as "from your app" |
| App Verification | The process of checking that stamp |
| Sponsorship | Your app paying gas fees so users don't have to |
| Grove | Decentralized storage where article content lives |
| Feed | A publication stream (like a channel) |
| Group | An organizational container (like a club) |
| GroupGatedFeedRule | "Only group members can post to this feed" |
