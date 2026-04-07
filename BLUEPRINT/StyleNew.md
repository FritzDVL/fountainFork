## COMPONENT 1: Thread Page (Stacked Posts)

### Layout Wireframe

┌──────────────────────────────────────────────────────┐
│ Category > Subcategory                               │
│ Thread Title Here                          h1        │
├────────┬─────────────────────────────────────────────┤
│ ┌────┐ │ username  Admin   · Apr 6         #1       │
│ │ AV │ │                                             │
│ │48px│ │ Post body text goes here. Lorem ipsum...    │
│ └────┘ │                                             │
│  45px  │ ♡  🔗  ⋯  🔖           ↩ Reply             │
├────────┼─────────────────────────────────────────────┤
│ ┌────┐ │ username2  · Apr 7                #2       │
│ │ AV │ │                                             │
│ │48px│ │ ┌─────────────────────────────────┐        │
│ └────┘ │ │ ▸ username said:                │        │
│        │ │ Quoted text here...             │        │
│        │ └─────────────────────────────────┘        │
│        │ Reply body text...                          │
│        │ ♡  🔗  ⋯  🔖           ↩ Reply             │
└────────┴─────────────────────────────────────────────┘


### Specs

Two-column layout:
Avatar column:  w-[45px] (desktop), w-[24px] (mobile)
Avatar size:    w-[45px] h-[45px] rounded-full (desktop), w-6 h-6 (mobile)
Gap:            gap-3 (12px)
Content column: flex-1 min-w-0


Post container:
py-4 border-b border-[hsl(217,33%,17%)]

— thin separator, not a card border.

Username + meta row:
Username:    text-sm font-bold text-[#e9e9e9] hover:underline cursor-pointer
Admin badge: text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#e45735] text-white
Mod badge:   same shape, bg-[#3ab54a]
Timestamp:   text-xs text-[hsl(215,20%,55%)] ml-1.5
             Format: "Apr 6" — use title attr for full ISO date tooltip
Post number: text-xs text-[hsl(215,20%,45%)] ml-auto  (right-aligned, very muted)


Body text:
text-[15px] leading-[1.4] text-[hsl(210,40%,93%)] mt-2


Action buttons row:
mt-3 flex items-center gap-3 text-[hsl(215,20%,50%)]

Each button: p-1.5 rounded hover:bg-[hsl(217,33%,20%)] hover:text-[hsl(215,20%,75%)]
Icon size:   w-4 h-4 (16px)
Reply button: ml-auto text-xs flex items-center gap-1


Blockquote (quoted reply):
css
/* Custom CSS — Tailwind can't do the aside header cleanly */
.quote-container {
  background: hsl(217, 33%, 12%);
  border-left: 3px solid hsl(215, 20%, 40%);
  border-radius: 4px;
  padding: 8px 12px;
  margin: 8px 0;
  font-size: 14px;
}
.quote-container .quote-title {
  font-size: 12px;
  font-weight: 600;
  color: hsl(215, 20%, 65%);
  margin-bottom: 4px;
  cursor: pointer;
}


Mobile (< 768px):
- Avatar column shrinks to w-6, avatar to w-6 h-6
- Post number hidden: hidden md:block
- Action icons stay but gap tightens: gap-2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## COMPONENT 2: Thread List (Topic Table)

### Layout Wireframe

Topic (flex-1)          Posters(90px) Replies(60px) Views(60px) Activity(80px)
─────────────────────── ─────────── ──────── ─────── ──────────
Bold Title Here                                                
 🟢 Category · tag1 tag2  ○○○○○      42       1.2k    1d

Another Thread Title                                           
 🔵 Dev · help wanted     ○○○        7        340     3h


### Specs

Table header:
text-[11px] uppercase tracking-wider font-semibold text-[hsl(215,20%,50%)]
py-2 border-b border-[hsl(217,33%,17%)]


Column widths (Tailwind grid or flex):
Topic:    flex-1 min-w-0
Posters:  w-[90px]   (hidden on mobile)
Replies:  w-[60px]   text-center
Views:    w-[60px]   text-center (hidden on mobile)
Activity: w-[80px]   text-right


Topic cell:
Title:    text-[15px] font-bold leading-snug text-[#e9e9e9] hover:text-[#4eaef3]
          Visited/read titles: text-[hsl(215,20%,55%)] font-normal

Meta line (below title, mt-0.5):
  Category badge: inline-flex items-center gap-1
    Colored dot: w-2.5 h-2.5 rounded-full (use category color)
    Text: text-xs font-medium text-[hsl(215,20%,70%)]
  
  Tag pill: text-[11px] px-1.5 py-0.5 rounded border border-[hsl(217,33%,25%)]
            text-[hsl(215,20%,60%)] ml-1


Posters (mini avatars):
flex -space-x-1
Each: w-[22px] h-[22px] rounded-full ring-1 ring-[hsl(222,84%,5%)]
OP avatar: ring-2 ring-[#4eaef3]


Stats cells:
text-sm text-[hsl(215,20%,60%)]
Format numbers: 1.2k, 340, 42 (use Intl.NumberFormat compact)
High reply count (>50): text-[#4eaef3] font-semibold


Activity:
text-xs text-[hsl(215,20%,55%)]
Recent (<1d): text-[#4eaef3]


Row:
py-2.5 px-2 border-b border-[hsl(217,33%,12%)]
hover:bg-[hsl(217,33%,10%)] transition-colors


Mobile (< 768px):
- Hide: Posters, Views columns
- Replies + Activity collapse into a single line below title: text-xs text-muted
- Title stays full width

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## COMPONENT 3: Board Landing Page (Category List)

### Layout Wireframe

Category                              Topics    Latest
──────────────────────────────────── ──────── ──────────
┃ Category Name                        3/week  Topic title
┃ Description text here, one or                username · 2h
┃ two lines max...                     
┃   ├ Subcategory A  ├ Subcategory B
──────────────────────────────────── ──────── ──────────


### Specs

Section header:
text-sm font-bold text-[hsl(215,20%,65%)] uppercase tracking-wide
py-2 border-b border-[hsl(217,33%,17%)]

— No background bar. Just text + bottom border.

Category row:
flex items-start py-3 px-2 border-b border-[hsl(217,33%,12%)]
Left border: border-l-[3px] (use category's hex color via style prop)
pl-3


Category name:
text-[15px] font-bold text-[#e9e9e9] hover:text-[#4eaef3]


Description:
text-sm text-[hsl(215,20%,60%)] leading-relaxed mt-0.5
line-clamp-2


Subcategory badges (inline):
mt-1.5 flex flex-wrap gap-1.5
Each: text-xs text-[hsl(215,20%,65%)] flex items-center gap-1
  Dot: w-2 h-2 rounded-full (subcategory color)


Stats column (right side):
w-[80px] text-right shrink-0
Topics/week: text-sm text-[hsl(215,20%,55%)]
"per week" label: text-[11px] text-[hsl(215,20%,40%)]


Latest topic preview (optional, Discourse shows this):
w-[200px] shrink-0 hidden lg:block
Title: text-sm text-[hsl(215,20%,70%)] truncate
Meta:  text-xs text-[hsl(215,20%,45%)]


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## COMPONENT 4: Research Page (Filtered Thread List)

### Filter Bar Wireframe

┌─────────────────────────────────────────────────────────┐
│  Latest   New   Unread   Top  │  🟢 Category ▾  tag ✕  │  + New Topic │
│  ═══════                      │                         │              │
└─────────────────────────────────────────────────────────┘


### Specs

Filter bar container:
flex items-center gap-1 py-2 border-b border-[hsl(217,33%,17%)]


Nav tabs (Latest / New / Unread / Top):
Default:  px-2.5 py-1.5 text-sm text-[hsl(215,20%,60%)] rounded
          hover:bg-[hsl(217,33%,15%)] hover:text-[hsl(215,20%,80%)]
Active:   text-[#e9e9e9] font-semibold
          border-b-2 border-[#e45735] rounded-none pb-1.5

— Discourse uses a colored bottom border on the active tab, not a filled bg.

Category filter (dropdown trigger):
inline-flex items-center gap-1.5 px-2 py-1 text-sm rounded
bg-[hsl(217,33%,12%)] text-[hsl(215,20%,70%)]
hover:bg-[hsl(217,33%,18%)]
  Colored square: w-2.5 h-2.5 rounded-sm (category color)


Tag filter pill (active/selected):
inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full
bg-[hsl(217,33%,15%)] text-[hsl(215,20%,70%)]
border border-[hsl(217,33%,25%)]
  ✕ button: ml-0.5 hover:text-white


New Topic button:
ml-auto px-3 py-1.5 text-sm font-medium rounded
bg-[#e45735] text-white hover:bg-[#c9432a]


Thread rows (same as Component 2 but with more padding):
py-3 (instead of py-2.5)
Category badge square: w-3 h-3 rounded-sm (instead of dot)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## Summary of Key Changes from Your Current Code

| Element | Your Current | Change To |
|---|---|---|
| Post layout | Flat/inline | Two-column: avatar left, content right |
| Avatar size | 32px | 45px desktop, 24px mobile |
| Timestamp | "2h ago" | "Apr 6" with tooltip |
| Post separator | border-b full | border-b border-[hsl(217,33%,12%)] thin |
| Thread title | text-sm font-medium | text-[15px] font-bold |
| Category badge | Green dot | Colored dot matching category color |
| Stats | Raw numbers | Compact format (1.2k) |
| Section headers | Muted bg + accent bar | Bold text + bottom border only |
| Filter bar | Dropdowns | Tab pills with active underline |
| Action buttons | Text labels | Icon-only, muted, hover highlight |

Number formatting helper you'll need:

ts
const compact = (n: number) =>
  Intl.NumberFormat("en", { notation: "compact" }).format(n);