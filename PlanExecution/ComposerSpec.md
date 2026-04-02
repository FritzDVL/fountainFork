# Composer Specification — Discourse-Style Editor

## Overview

Replace Fountain's full-page editor experience with a Discourse-style
composer that appears as a bottom panel, expandable to full page, with
a dual-column layout (editor + live preview).

The underlying engine stays Plate.js. What changes is the UI wrapper.

---

## How It Works

### Opening the Composer

When user clicks "+ New Thread" (on a board page) or "+ New Topic"
(on the research page), a panel slides up from the bottom of the
screen, covering roughly the bottom 40% of the viewport.

```
┌──────────────────────────────────────────────────────────────┐
│ Thread list (or research list) visible above                  │
│                                                               │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ ▲ Drag handle to resize          [Minimize] [Expand] [Close] │
│                                                               │
│  Title: [________________________________]                    │
│  Board: [Beginners & Help ▾]  (or Category + Tags for research)│
│                                                               │
│  ┌─────────────────────────┐  ┌─────────────────────────┐    │
│  │ EDITOR (Plate.js)       │  │ PREVIEW (read-only)     │    │
│  │                         │  │                         │    │
│  │ Type here...            │  │ Rendered output...      │    │
│  │                         │  │                         │    │
│  │ **bold** _italic_       │  │ bold italic             │    │
│  │ ## Heading              │  │ Heading                 │    │
│  │                         │  │                         │    │
│  └─────────────────────────┘  └─────────────────────────┘    │
│                                                               │
│  [Toolbar: B I H1 H2 • — "" <> 🖼 🔗]        [Create Topic] │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Three States

1. **Minimized** — collapsed to a thin bar at the bottom showing
   "New Thread: [title preview]" with a click-to-expand button.
   User can browse the forum while composing.

2. **Half-screen** (default) — bottom 40-50% of viewport. The thread
   list or page content is still visible above. Resizable via drag.

3. **Full-screen** — covers the entire page. Like Fountain's current
   `/w/[id]` editor but without navigating away.

### Dual Column (Desktop)

Left column: Plate.js editor in edit mode. Toolbar at the bottom.
Right column: Plate.js editor in readOnly mode, rendering the same
content in real-time. This is the live preview.

On mobile: single column, editor only. Preview accessible via a
toggle button.

### Header Fields

For Commons boards:
```
Title: [________________________________]
Board: [Beginners & Help ▾]     ← dropdown, pre-selected from context
```

For Research:
```
Title: [________________________________]
Category: [🟠 Consensus ▾]      ← ONE category, required
Tags: [#hunting] [#game-theory] [+ add tag]  ← multiple, optional
```

### Toolbar

Compact, at the bottom of the editor column (not top like Fountain):
```
B  I  U  H1  H2  •  —  ""  <>  🖼  🔗  📎
```

Same Plate.js plugins as Fountain — bold, italic, underline, headings,
lists, blockquote, code block, image upload, link, file attach.

### Submit

"Create Topic" button (or "Post Reply" when replying). On click:
1. Publish to Lens as standalone article (same pipeline as Fountain)
2. Write to forum_threads + forum_thread_entries in Supabase
3. Close composer
4. Navigate to the new thread page

---

## Reply Composer

When replying to a thread, the same composer opens but:
- No "Board" or "Category" selector (inherited from thread)
- Title field is optional (most replies won't have titles)
- If triggered from a specific post's reply button, the quoted
  text is pre-inserted

### Quote-Reply Flow

Each post in a thread has a reply button (💬). Clicking it:

1. Opens the composer (or focuses it if already open)
2. Inserts a blockquote at the cursor position:

```
> [Quoted text from the post]
> — @username, #3

[cursor here, user types their response]
```

In Plate.js terms, this inserts a blockquote node with the quoted
content, followed by an empty paragraph for the user to type in.

The quote attribution ("— @username, #3") links back to that
specific post in the thread.

### Selecting Text to Quote

Discourse also lets you select text in a post and click "Quote" to
insert just that selection. This is a future enhancement:

1. User selects text in a post
2. A floating "Quote" button appears above the selection
3. Clicking it opens the composer with that text as a blockquote

This is pure DOM selection + Plate.js insertion. No Lens involvement.

---

## What Changes in Fountain

### Current Fountain Editor Flow
```
Click "New Post" → navigate to /w/[documentId] → full-page editor
→ click Publish → dialog with 3 tabs → publish
```

### New Forum Composer Flow
```
Click "+ New Thread" → composer slides up from bottom (no navigation)
→ write in dual-column editor → click "Create Topic" → publish
→ composer closes → thread page opens
```

### Technical Approach

The composer is a new React component that:
- Uses Plate.js `createPlateEditor()` with the same plugins as Fountain
- Renders in a fixed-position panel (`position: fixed; bottom: 0`)
- Has its own state management (not tied to Fountain's draft system
  for replies, but CAN use it for thread openers if we want autosave)
- The preview column uses a second Plate.js instance in readOnly mode,
  synced to the editor's value via React state

### What Stays

- Fountain's `/w/[id]` editor page still works for standalone articles
- The Plate.js plugins, toolbar buttons, and formatting capabilities
  are identical — same engine, different wrapper
- The publish pipeline (metadata → Grove → Lens) is unchanged

### What's New

- `ComposerPanel` component — the sliding bottom panel
- `ComposerEditor` — dual-column layout with Plate.js
- `ComposerHeader` — title, board/category/tag selectors
- `ComposerToolbar` — compact bottom toolbar
- `useComposer` hook — manages open/close/minimize state
- Quote insertion logic — converts selected text to blockquote node

---

## Porting from Discourse

If you want to analyze Discourse's composer for exact behavior:

### Clone and analyze
```bash
git clone https://github.com/discourse/discourse.git ~/discourse
```

### Key files to ask Kiro to examine
```
# Composer component (Ember.js)
app/assets/javascripts/discourse/app/components/composer-editor.gjs
app/assets/javascripts/discourse/app/components/composer-body.gjs

# Composer model (state management)
app/assets/javascripts/discourse/app/models/composer.js

# Quote-reply feature
app/assets/javascripts/discourse/app/components/quote-button.gjs
app/assets/javascripts/discourse/app/lib/quote.js

# Category/tag selector
app/assets/javascripts/discourse/app/components/category-chooser.gjs
app/assets/javascripts/discourse/app/components/mini-tag-chooser.gjs
```

### What to ask Kiro
"Analyze the Discourse composer component. Give me a detailed spec of:
1. The sliding panel behavior (open, minimize, expand, close)
2. The dual-column layout (editor + preview)
3. The quote-reply insertion logic
4. The category and tag selector behavior
5. The toolbar layout and button order
Focus on UX behavior, not Ember.js implementation details."

Then use that spec to build the equivalent in React + Plate.js on
top of Fountain's codebase.

---

## Simplified Version (MVP)

If the full Discourse composer is too much for V1, start with:

1. **Bottom panel** that slides up (no dual-column, just editor)
2. **Title + board selector** in the header
3. **Plate.js editor** with floating toolbar (Fountain already has this)
4. **"Create Topic" button** that publishes
5. **Quote-reply** via the reply button on each post

Add the preview column and text-selection quoting later.
