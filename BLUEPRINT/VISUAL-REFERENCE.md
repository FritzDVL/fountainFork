# Visual Reference Guide

## How to Use the Mockups

The HTML mockup files in `PlanExecution/` are the visual source of truth.
Open them in a browser to see the exact target UI. They use Fountain's
design tokens (Inter font, dark theme, same color variables).

---

## Mockup → Phase Mapping

| Mockup File | Phase | What It Shows |
|---|---|---|
| `mockup-landing-fountain.html` | Phase 4 | Landing page with 5 board sections + language communities |
| `mockup-board-fountain.html` | Phase 4 | Thread list for "Beginners & Help" category |
| `mockup-research-fountain.html` | Phase 8 | Research section with filter toolbar + category badges |

---

## Landing Page (`mockup-landing-fountain.html`)

### Key Visual Elements

```
┌─ HEADER ─────────────────────────────────────────────────────┐
│ Society Protocol    [Search...]    [🔒 Research]    🔔  [U]  │
└──────────────────────────────────────────────────────────────┘

┌─ SECTION: GENERAL DISCUSSION ────────────────────────────────┐
│ ▎ GENERAL DISCUSSION                                         │
│ Beginners & Help          New to the forum...    12  340  2h │
│ 4 Key Concepts            Core concepts...        5  120  1d │
│ Web3 Outpost              Web3 integration...     3   87  3d │
│ DAO Governance            Governance...           8  210  5h │
└──────────────────────────────────────────────────────────────┘

┌─ SECTION: FUNCTIONS (GRID) ──────────────────────────────────┐
│ ▎ FUNCTIONS (VALUE SYSTEM)                                   │
│ ┌──────────────────┐ ┌──────────────────┐                    │
│ │ ✦ Economic Game  │ │ ✦ Function Ideas │                    │
│ └──────────────────┘ └──────────────────┘                    │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                │
│ │ ✦ Hunting  │ │ ✦ Property │ │ ✦ Parenting│                │
│ └────────────┘ └────────────┘ └────────────┘                │
│ ... (3 more rows of 3)                                       │
└──────────────────────────────────────────────────────────────┘

┌─ SECTION: OTHERS ────────────────────────────────────────────┐
│ ... (same list layout as General Discussion)                 │
└──────────────────────────────────────────────────────────────┘

┌─ SECTION: PARTNER COMMUNITIES ───────────────────────────────┐
│ ... (same list layout)                                       │
└──────────────────────────────────────────────────────────────┘

LANGUAGE BOARDS
┌──────────┐ ┌──────────┐ ┌──────────┐
│   🇪🇸     │ │   🇧🇷     │ │   🇨🇳     │
│ Español  │ │Português │ │   中文    │
│ 42 memb. │ │ 18 memb. │ │  7 memb. │
└──────────┘ └──────────┘ └──────────┘
```

### Design Tokens (from mockup CSS)

```css
--bg: hsl(222.2 84% 4.9%);           /* dark background */
--fg: hsl(210 40% 98%);              /* light text */
--muted: hsl(217.2 32.6% 17.5%);    /* muted backgrounds */
--muted-fg: hsl(215 20.2% 65.1%);   /* muted text */
--border: hsl(217.2 32.6% 17.5%);   /* borders */
--primary: hsl(210 40% 98%);         /* primary buttons */
--primary-fg: hsl(222.2 47.4% 11.2%);
--radius: 0.5rem;
--research-accent: hsl(45 80% 55%);  /* amber for Research */
```

Font: Inter, 400/500/600/700 weights.
Max width: 960px centered.
Header: 56px sticky, blur backdrop.

---

## Thread List (`mockup-board-fountain.html`)

### Key Visual Elements

```
Boards / Beginners & Help                    ← breadcrumb

Beginners & Help                [+ New Thread]
New to the forum? Start here.

┌──────────────────────────┬────────────┬───────┬─────┬────────┐
│ Topic                    │ Started by │Replies│Views│Activity│
├──────────────────────────┼────────────┼───────┼─────┼──────┤
│ 📌 Welcome to the forum │  🟢 alice  │  24   │ 340 │   2h  │
│ How do I create a Lens   │  🟢 bob    │   8   │ 120 │   5h  │
│ What is GHO token?       │  🟢 carol  │   3   │  45 │   1d  │
│ First time posting here  │  🟢 dave   │   1   │  22 │   3d  │
│ Help with wallet setup   │  🟢 eve    │   0   │  10 │   5d  │
│ Difference between L1/L2 │  🟢 frank  │   6   │  89 │   1w  │
└──────────────────────────┴────────────┴───────┴─────┴────────┘
                       [Load More]
```

### Column Widths
- Topic: ~55%
- Started by: ~14%
- Replies: ~9% (center)
- Views: ~9% (center)
- Activity: ~10% (center)

### Mobile
- Only Topic column visible
- Stats hidden

---

## Research Section (`mockup-research-fountain.html`)

### Key Visual Elements

```
🔒 Society Protocol Research
Technical research and discussion — token-gated posting

┌──────────────────────────────────────────────────────────────┐
│ [All Categories ▾]  [All Tags ▾]  Latest       [+ New Topic]│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────┬────────────┬───────┬─────┬────────┐
│ Topic                    │ Started by │Replies│Views│Activity│
├──────────────────────────┼────────────┼───────┼─────┼──────┤
│ Proof of Hunt consensus  │  🟢 alice  │  12   │ 230 │   3h  │
│ 🟠 Consensus  #hunting   │            │       │     │       │
│                          │            │       │     │       │
│ State machine formal     │  🟢 bob    │   5   │  89 │   1d  │
│ 🟣 State Machine         │            │       │     │       │
│                          │            │       │     │       │
│ ZK-SNARK integration     │  🟢 carol  │   8   │ 145 │   2d  │
│ 🔴 Cryptography  #zk     │            │       │     │       │
└──────────────────────────┴────────────┴───────┴─────┴────────┘
```

### Category Colors (from mockup CSS)

```css
.cat-architecture   { background: #3b82f6; }  /* blue */
.cat-state-machine  { background: #a855f7; }  /* purple */
.cat-consensus      { background: #f97316; }  /* orange */
.cat-cryptography   { background: #ef4444; }  /* red */
.cat-account-system { background: #06b6d4; }  /* cyan */
.cat-security       { background: #eab308; }  /* yellow */
.cat-game-theory    { background: #10b981; }  /* emerald */
```

### Category Badge
```html
<span class="category-badge">
  <span class="cat-box cat-consensus"></span>  <!-- 8x8 colored square -->
  Consensus
</span>
```

### Tag Badge
```html
<span class="tag-badge">#hunting</span>  <!-- gray border pill -->
```

---

## Thread Detail (from BoardExample.md)

### Key Visual Elements

```
┌─ POST #0 (ROOT) ────────────────────────────────────────────┐
│                                                              │
│  [avatar] alice · Original post · 3 days ago          [↗]   │
│                                                              │
│  Welcome everyone! This is the place to ask your             │
│  first questions about Society Protocol.                     │
│                                                              │
│  ## Getting Started                                          │
│  - Link to docs                                              │
│  - **Bold text** and *italic* work here                      │
│                                                              │
│  ▲ 12 ▼                                                     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [avatar] bob · Reply #1 · 3 days ago                 [↗]   │
│                                                              │
│  Thanks for this! I had a question about...                  │
│                                                              │
│  ▲ 5 ▼                                                      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  REPLY EDITOR                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [Plate.js rich text editor]                          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                          [Post Reply]        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Post Card Layout
- Header: avatar (32x32) + author name + position label + timestamp + external link
- Content: Plate.js readOnly rendering (full rich text)
- Footer: vote buttons (▲ score ▼)
- Divider: `border-b` between posts
- Padding: `py-6` per post

---

## Composer Panel (from ComposerSpec.md + ComposerDiscourse.md)

### Open State
```
┌──────────────────────────────────────────────────────────────┐
│ ▲ Drag handle                        [Minimize] [⤢] [Close] │
├──────────────────────────────────────────────────────────────┤
│ Title: [________________________________]                    │
│ Board: [Beginners & Help ▾]                                  │
├──────────────────────┬───────────────────────────────────────┤
│   EDITOR             │   PREVIEW                             │
│   (Plate.js edit)    │   (Plate.js readOnly)                 │
├──────────────────────┴───────────────────────────────────────┤
│ [B I U H1 H2 • — "" <> 🖼 🔗]              [Create Topic]   │
└──────────────────────────────────────────────────────────────┘
```

### Draft Bar (Minimized)
```
┌──────────────────────────────────────────────────────────────┐
│ New Thread: "How do I create a Lens account?"    [▲ Expand]  │
└──────────────────────────────────────────────────────────────┘
```

Height: 45px. Click anywhere → expands to open state.
