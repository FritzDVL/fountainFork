# Content Visibility, Auth Rules, Hosting, and the Composer

Answers to questions from the Phase 1 walkthrough session.

---

## "Can I prevent my posts from showing on Hey, Soclly, etc.?"

**The honest answer: No, not fully.** And this is by design.

Lens Protocol is a public, decentralized social protocol. When you
publish a post, it goes onchain. Any app that reads the Lens Protocol
can see it. This is the fundamental trade-off of decentralized publishing:

```
CENTRALIZED (Medium, Substack):
  You publish → Only visible on that platform
  Platform dies → Your content is gone

DECENTRALIZED (Lens):
  You publish → Visible to any app reading Lens
  Any app dies → Your content survives onchain
```

You can't have both "permanent and decentralized" AND "only visible on
my app." They're contradictory goals.

### What you CAN control

1. **Feed filtering.** Other apps choose what to show. Hey.xyz shows
   posts from the Global Feed by default. If your posts go to YOUR
   custom feed (not the Global Feed), most apps won't show them unless
   they specifically query your feed.

2. **Metadata.** The `app` field on every publication identifies which
   app created it. Other apps CAN filter by this. Some do, some don't.

3. **Content on Grove.** The actual article content (text, images) is
   stored on Grove. You could theoretically use access-controlled storage
   (ACL) to make the content readable only by your app. But the metadata
   (title, author, timestamp) is still onchain and public.

4. **The Distribution tab in Fountain.** That "title and link" option
   controls how the metadata is structured — it doesn't prevent other
   apps from seeing the post. It just means other apps show a title
   with a link back to your app instead of the full content inline.

### The practical approach

For your forum, posts go to YOUR custom feeds (Commons Feed, Research
Feed). These are not the Global Feed. Most Lens apps (Hey, Soclly)
show the Global Feed by default. Your posts will only show up on other
apps if:

- Someone specifically looks at your feed address
- Someone visits the author's profile and sees all their publications
- An app explicitly indexes your feed

The profile page issue (someone seeing your posts on Hey by visiting
your profile) is unavoidable — that's how Lens works. But for casual
browsing, your forum posts won't pollute other apps' main feeds.

### "Can I run my own chain?"

Technically, Lens Chain is a ZK chain. You could fork it and run your
own. But then you'd lose:
- The shared social graph (followers, accounts)
- Interoperability with other Lens apps
- The existing user base
- Grove storage integration

You'd essentially be building a completely separate platform that
happens to use similar technology. At that point, you might as well
use a traditional database. The whole point of Lens is the shared
social layer.

**My recommendation:** Use custom feeds, accept that metadata is public,
and use the "title and link" distribution mode so other apps just show
a link back to your forum. That's the best balance.

---

## "How do I use the auth server for access control?"

Right now, the auth server just says `{ allowed: true }` for everyone.
Here are practical rules you could add later:

### Example 1: Allowlist (only specific addresses)
```js
const ALLOWED = ['0xAlice...', '0xBob...', '0xCarol...'];

app.post('/authorize', (req, res) => {
  if (ALLOWED.includes(req.body.account)) {
    res.json({ allowed: true, sponsored: true });
  } else {
    res.json({ allowed: false, reason: "Not on the allowlist" });
  }
});
```

### Example 2: Check group membership
```js
app.post('/authorize', async (req, res) => {
  const isMember = await checkGroupMembership(req.body.account);
  res.json({
    allowed: isMember,
    sponsored: isMember,
    reason: isMember ? undefined : "Join the community first"
  });
});
```

### Example 3: Token gate (must hold X tokens)
```js
app.post('/authorize', async (req, res) => {
  const balance = await getTokenBalance(req.body.account);
  const hasEnough = balance >= 100;
  res.json({
    allowed: hasEnough,
    sponsored: hasEnough,
    reason: hasEnough ? undefined : "Must hold 100 SPEC tokens"
  });
});
```

### What happens when someone is rejected?

The user sees an error in their wallet/app. The Lens API returns the
`reason` string you provided. Your app can catch this and show a
friendly message like "You need to join the community first" with a
button to request membership.

**For Phase 1, keep it simple: allow everyone.** Add rules in Phase 7
when you build the membership management features.

---

## "Where should I host the auth server?"

You have a spare VPS — **use it.** That's the best option for you.

Here's the comparison:

| Option | Free Tier | Cold Starts | Best For |
|---|---|---|---|
| **Your VPS** ✅ | You already have it | None (always running) | Your situation |
| Railway | $5/mo (free trial) | None | Small projects |
| Render | Free (spins down after 15min) | Yes, 30-50s wake up | Hobby projects |
| Fly.io | Free (limited) | Minimal | Edge deployment |
| Vercel | Free (serverless) | Yes, cold starts | Static sites |
| Supabase Edge Functions | Free | Yes | Simple functions |

### Why your VPS is the best choice

The auth server MUST respond in < 500ms. If it's slow, Lens rejects
the login. This kills serverless options with cold starts:

- **Render free tier:** Spins down after 15 minutes of inactivity.
  First request after that takes 30-50 seconds. Lens will reject it.
- **Vercel serverless:** Cold starts of 1-3 seconds. Too slow.
- **Supabase Edge Functions:** Can have cold starts too.

Your VPS is always running. No cold starts. Problem solved.

### Why not Supabase for the auth server?

Supabase is a database service, not a general-purpose web server.
You CAN use Supabase Edge Functions (Deno-based serverless functions),
but they have cold starts and limited runtime. The auth server is a
simple Express.js app — it's happiest on a regular server.

### Setup on your VPS

```bash
# On your VPS
git clone https://github.com/<your-org>/society-forum-auth.git
cd society-forum-auth
bun install

# Create .env with your keys
nano .env

# Run with a process manager so it stays alive
# Option A: PM2
npm install -g pm2
pm2 start "bun run start" --name auth-server
pm2 save
pm2 startup  # auto-start on reboot

# Option B: systemd service
sudo nano /etc/systemd/system/auth-server.service
# [Unit]
# Description=Society Protocol Auth Server
# After=network.target
# [Service]
# WorkingDirectory=/path/to/society-forum-auth
# ExecStart=/usr/local/bin/bun run start
# Restart=always
# [Install]
# WantedBy=multi-user.target

sudo systemctl enable auth-server
sudo systemctl start auth-server
```

Then point a domain to it: `auth.yourdomain.com` → your VPS IP.
Use nginx or caddy as a reverse proxy with HTTPS (Lens requires HTTPS).

### Later: the main app on the VPS too

Since your VPS is powerful enough for a full Discourse instance, it can
definitely run the Next.js forum app too. For development you'll use
`localhost:3000`, but for production you could deploy both the app and
the auth server on the same VPS.

---

## "The Lens App address — don't I need that?"

Yes! You DO use the Lens App address. It's in your `.env` file:

```env
NEXT_PUBLIC_APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E
```

The app uses this address when users log in:

```ts
// When a user logs in, the app tells Lens:
// "This user wants to log in to THIS app"
client.login({
  accountOwner: {
    account: userAddress,
    app: "0x637E685eF29403831dE51A58Bc8230b88549745E",  // ← your app
    owner: signerAddress,
  }
});
```

The Lens App address identifies your app. The auth server controls
who gets in. They work together:

```
Lens App Address = "This is the nightclub called Society Protocol"
Auth Server      = "This is the bouncer at the door"
Auth Keys        = "This is the stamp that proves drinks came from our bar"
```

---

## "About the Composer — Plate.js vs Discourse-style"

You're right that we're using BOTH. Here's how they fit together:

### Plate.js = the engine (what processes the text)

Plate.js is the rich text editor library. It handles:
- Typing text
- Bold, italic, headings, code blocks
- Image uploads
- Link insertion
- Storing content as JSON

This is the same engine Fountain uses. We keep it.

### Discourse-style composer = the wrapper (how it looks and behaves)

The Discourse composer is a UI PATTERN — a bottom panel that slides up.
It's not a different editor. It's a different WAY OF PRESENTING the
same Plate.js editor.

```
FOUNTAIN'S APPROACH:
  Click "New Post" → navigate to /w/[id] → full-page editor
  (You leave the page you were on)

DISCOURSE'S APPROACH:
  Click "New Thread" → panel slides up from bottom → editor inside
  (You stay on the page, can still see the forum behind it)
```

What we're building:

```
┌──────────────────────────────────────────────────────────┐
│ Forum page (thread list, etc.) — still visible above     │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ ▲ Drag handle                    [Minimize] [⤢] [Close]  │
│ Title: [________________________________]                │
│ Board: [Beginners & Help ▾]                              │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │                                                      │ │
│ │  THIS IS PLATE.JS — same editor as Fountain          │ │
│ │  Bold, italic, headings, code, images, links...      │ │
│ │                                                      │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ [B I U H1 H2 • — "" <> 🖼 🔗]          [Create Topic]   │
└──────────────────────────────────────────────────────────┘
```

The panel (position, sliding, minimize/expand/fullscreen) is custom
code we write. The editor INSIDE the panel is Plate.js from Fountain.

Think of it like a car:
- Plate.js = the engine
- Discourse-style panel = the body/chassis
- Same engine, different car body

The `ComposerDiscourse.md` file you mentioned describes the PANEL
behavior (how it slides, resizes, minimizes). The Plate.js editor
goes inside that panel. Phase 5 in the BLUEPRINT builds this.
