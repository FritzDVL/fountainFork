# Prompt: Discourse Thread Post Styling ONLY

Use this prompt to get a detailed spec for how individual posts look
INSIDE a thread page. NOT the board listing, NOT the thread list —
ONLY the stacked posts within a single thread.

---

## THE PROMPT

```
Go to https://meta.discourse.org and open any topic with 5+ replies.
Analyze ONLY how individual posts are displayed within the thread.
I need pixel-perfect detail on every visual element of a single post.

I'm using Next.js + Tailwind CSS with a dark theme. My current post card
looks like this:

CURRENT LAYOUT:
┌──────────────────────────────────────────────────────────────┐
│ [32px avatar circle] username                                │
│                      Reply #2 · 2h ago        [Onchain ↗]   │
│                                                              │
│ Post content rendered here with rich text...                 │
│                                                              │
│ ♡  Reply                                                     │
└──────────────────────────────────────────────────────────────┘

Problems:
- Flat layout, avatar is inline with text
- No clear visual hierarchy between posts
- Action buttons feel disconnected
- No visual distinction between the original post and replies
- Hard to scan who wrote what when scrolling fast

Break down EXACTLY how Discourse renders each post. I need:

### 1. POST CONTAINER
- How are posts separated? (border, gap, background?)
- Is there a different style for the FIRST post (OP) vs replies?
- What's the vertical spacing between posts?
- Is there a hover state on posts?

### 2. AVATAR + AUTHOR AREA
- Where is the avatar positioned? (left column? inline?)
- Avatar size in pixels (desktop and mobile)
- Is the avatar sticky when scrolling a long post?
- Author name: font size, weight, color
- Is there a link on the author name? Where does it go?
- Role badges (Admin, Moderator, OP): size, color, shape, position
- How does "Original Poster" get indicated on their replies?

### 3. TIMESTAMP + POST NUMBER
- Where is the timestamp? (next to name? right-aligned?)
- Format: relative ("2h ago") or absolute ("Apr 6")?
- Is there a tooltip with the full date?
- Post number (#1, #2): where positioned? font size? color?
- Is the post number a permalink (clickable)?

### 4. POST CONTENT AREA
- Left padding/margin from the avatar column
- Font size and line-height for body text
- Paragraph spacing (gap between <p> tags)
- How are images displayed? (max-width, border-radius, margin)
- How are code blocks styled? (background, border, padding, font)
- How are links styled? (color, underline, hover)

### 5. QUOTED REPLIES (when someone quotes another post)
- Container: background color, border, border-radius, padding
- Header: "username said:" — font size, weight, color
- Is the header clickable? (jumps to original post?)
- Quoted text: font size, color (dimmer than regular text?)
- Expand/collapse for long quotes?

### 6. ACTION BUTTONS ROW
- Which buttons: Like/Heart, Reply, Share/Link, Bookmark, Flag, More (...)
- Layout: left-aligned? spread? reply on the right?
- Icon size in pixels
- Text labels or icon-only?
- Default color (very muted)
- Hover color and hover background
- Active/pressed state (e.g., liked = red heart)
- Like count: where positioned relative to the heart icon?
- Spacing between buttons

### 7. SEPARATOR BETWEEN POSTS
- Is it a border-bottom? A gap? Both?
- Color and thickness of the line
- Any extra spacing or visual break between posts?

### 8. THREAD HEADER (above the first post)
- Title: font size, weight
- Category badge: position, style
- Tags: position, style
- Metadata line: what info is shown? (replies count, views, created date, last activity)
- Is there a "Reply" button at the top level?

### 9. MOBILE DIFFERENCES (< 768px)
- What changes in the avatar layout?
- Do action buttons change?
- Does the post number hide?
- Any layout shifts?

### OUTPUT FORMAT

For each section above, give me:
1. Exact Tailwind CSS classes
2. Any custom CSS needed
3. Pixel values for spacing
4. Hex colors for the dark theme
5. ASCII wireframe showing position of each element

My dark theme colors:
- Background: hsl(222.2 84% 4.9%)
- Text: hsl(210 40% 98%)
- Muted bg: hsl(217.2 32.6% 17.5%)
- Muted text: hsl(215 20.2% 65.1%)
- Border: hsl(217.2 32.6% 17.5%)
- Font: Inter

DO NOT change my board listing or thread list components.
ONLY the post cards inside a thread page.
```
