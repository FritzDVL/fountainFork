# Prompt: Discourse Visual Styling Breakdown for Forum Refinement

Use this prompt with another AI (or Kiro in a fresh context) to get
a detailed CSS spec for improving the forum's visual design.

---

## THE PROMPT

```
I'm building a Discourse-style forum using Next.js + Tailwind CSS on a dark theme.
I need you to analyze Discourse's visual design (specifically https://meta.discourse.org)
and give me EXACT styling specs I can apply to my existing components.

Here is my current code for each component. Tell me what to change to match Discourse's
look and feel. Be specific — give me Tailwind classes, hex colors, pixel values.

### COMPONENT 1: Thread Page (stacked posts)

Current code:
- Thread header: h1 text-2xl font-bold, breadcrumb above, reply count + views below
- Post card: border-b py-6, 32px avatar circle with initial letter, author name + 
  "Reply #N · 2h ago", content below, heart + reply buttons at bottom
- No avatar column — everything is flat/inline

What Discourse does differently:
- Avatar in a LEFT COLUMN (48px wide on desktop, 24px on mobile)
- Content in a RIGHT COLUMN (takes remaining width)
- Post number (#1) right-aligned, subtle
- Username is a link, bold, with a colored badge for admin/mod
- Timestamp is "Apr 6" format (not "2h ago") with tooltip showing full date
- Action buttons are icon-only, very muted, spread across the bottom
- Thin gray line between posts, not a full border
- Quoted text has a light background + left border + "username said:" header

Give me the exact layout spec:
- Avatar column width
- Content column padding
- Font sizes for: username, timestamp, post number, body text
- Colors for: username, timestamp, muted text, borders, backgrounds
- Spacing: gap between avatar and content, padding inside post, gap between posts
- Action button row: icon sizes, gap, hover colors
- Blockquote styling for quoted replies

### COMPONENT 2: Thread List (table of threads)

Current code:
- Grid layout: Topic | Started by | Replies | Views | Activity
- Each row: font-medium text-sm title, green dot + author name, centered stats
- Pinned threads show 📌 icon
- Border rounded-lg container with header row

What Discourse does differently:
- Topic column shows: title (bold) + category badge + tags on second line
- "Posters" column shows stacked mini-avatars (last 5 participants)
- Replies and Views use a compact format (1.2k instead of 1200)
- Activity shows relative time
- Row hover is very subtle
- No outer border — clean flat table

Give me:
- Column proportions
- Title font: size, weight, line-height
- Category badge: colored dot size, text size, background, padding, border-radius
- Tag pill: border, padding, font size, color
- Stats formatting (compact numbers)
- Row padding and hover style
- Mobile layout (what hides, what stacks)

### COMPONENT 3: Board Landing Page (category list)

Current code:
- Sections with header bar (muted bg, uppercase title, left accent bar)
- Category rows: name + description, thread count + latest activity on right
- Grid layout for Functions section (cards)

What Discourse does differently:
- Category rows have a colored left border (category color)
- Description text is slightly larger and more readable
- Stats show "threads / week" not just total count
- Subcategory badges shown inline
- Section headers are simpler — just bold text, no background bar

Give me:
- Category row: left border width + color, padding, font sizes
- Description: font size, color, max lines
- Stats layout: what to show, font sizes
- Section header: font size, weight, spacing
- Overall spacing rhythm

### COMPONENT 4: Research Page (filtered thread list)

Current code:
- Filter toolbar: category dropdown + tag dropdown + "Latest" tab + "New Topic" button
- Thread rows: two-line (title on line 1, category badge + tag pills on line 2)
- Same table columns as thread list

What Discourse does differently:
- Filter bar is cleaner — pills/tabs instead of dropdowns
- Active filter has a colored underline or filled background
- Thread rows have more breathing room
- Category badge is more prominent (larger colored square)

Give me:
- Filter bar: button styles, active state, spacing
- Thread row: padding, line-height between title and meta line
- Category badge: exact sizing for the colored square, text weight
- Tag pill: exact border color, padding, font

### DESIGN TOKENS I'M USING

Dark theme:
- Background: hsl(222.2 84% 4.9%)
- Foreground: hsl(210 40% 98%)
- Muted bg: hsl(217.2 32.6% 17.5%)
- Muted text: hsl(215 20.2% 65.1%)
- Border: hsl(217.2 32.6% 17.5%)
- Primary: hsl(210 40% 98%)
- Font: Inter

Light theme also supported (Tailwind dark: prefix).

### OUTPUT FORMAT

For each component, give me:
1. ASCII wireframe showing the exact layout grid
2. Tailwind classes for each element
3. Any custom CSS needed (colors, spacing not in Tailwind)
4. Mobile breakpoint changes
5. Before/after comparison of what changes

Focus on PRACTICAL changes I can apply to my existing code.
Don't redesign from scratch — tell me what to ADD or CHANGE.
```

---

## HOW TO USE THIS

1. Copy the prompt above
2. Paste it into another AI (Claude, ChatGPT, etc.)
3. It will give you a detailed spec for each component
4. Bring the spec back here and we'll apply the changes

Alternatively, give this prompt to me (Kiro) in a fresh conversation
with the current component code as context.
