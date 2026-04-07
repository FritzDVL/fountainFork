# Composer Visual Map — Current Layout

This file maps every visual section of the composer panel so we can
point to specific areas that need adjustment.

## Full Composer (when open)

```
┌──────────────────────────────────────────────────────────────────────┐
│ A: TOP BAR                                                          │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ ✏️ New Thread                              [_] [□] [X]          │ │
│ │                                         minimize maximize close │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ B: HEADER (title + category/tags)                                    │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ [Give your thread a title________________________]              │ │
│ │ [Select category ▾]  [Add tag ▾]          ← only on /research  │ │
│ │ #hunting × #game-theory ×                 ← selected tags      │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ C: FIXED TOOLBAR                                                     │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ B  I  U  S  </>  •  1.  🔗  🖼  ⋯                             │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ D: EDITOR AREA (Plate.js)                                            │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │                                                                  │ │
│ │  D1: FOUNTAIN TITLE ZONE ← invisible title plugin area?         │ │
│ │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │ │
│ │                                                                  │ │
│ │  D2: WRITING AREA ← where you actually type                     │ │
│ │  "Write your post here..."                                      │ │
│ │                                                                  │ │
│ │                                                                  │ │
│ │                                                                  │ │
│ │                                                                  │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ E: SUBMIT BAR                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │                                              [Create Topic]     │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## Section Descriptions

### A: TOP BAR
- Shows "New Thread" or "Reply" with pencil icon
- Minimize (collapse to draft bar), Maximize (full screen), Close buttons
- File: `composer-panel.tsx`

### B: HEADER
- Title input field
- Category dropdown + Tag dropdown (only on /research pages)
- Selected tags as removable pills
- File: `composer-header.tsx`

### C: FIXED TOOLBAR
- Formatting buttons: Bold, Italic, Underline, Strikethrough, Code
- List buttons: Bullet, Numbered
- Insert: Link, Image, More
- File: `composer-toolbar-buttons.tsx`
- Rendered inside `forum-editor.tsx` via `<FixedToolbar>`

### D: EDITOR AREA
- This is the Plate.js editor
- File: `forum-editor.tsx`

**D1: FOUNTAIN TITLE ZONE** — This is a mystery area at the top of the
editor. It may be a leftover from Fountain's Title/Subtitle plugins.
We filtered out `TitlePlugin` and `SubtitlePlugin` but there might be
residual spacing or a placeholder element. This is the area that feels
like "two sections" — one empty zone at top, then the actual writing
area below.

**D2: WRITING AREA** — Where you actually type. Shows placeholder
"Write your post here..." when empty.

### E: SUBMIT BAR
- "Create Topic" or "Post Reply" button
- File: `composer-panel.tsx`

## Spacing Issues to Investigate

1. **Left/right padding of D (editor area):**
   Currently uses `!px-0` override on the Editor component.
   The `fullWidth` variant has `px-16 sm:px-24` built in.
   The `!px-0` removes ALL padding — text starts at the very edge.

2. **D1 mystery zone:**
   May be caused by the `fullWidth` variant's `pb-72` (bottom padding)
   or residual title plugin spacing. Need to check if there's an empty
   node at the top of the editor value.

3. **Overall centering:**
   The composer panel is `fixed bottom-0 left-0 right-0` (full width).
   The editor content has no max-width or horizontal centering.
   Adding `max-w-[700px] mx-auto` to the editor container would center it.

## Files Involved

```
src/components/forum/composer-panel.tsx          ← A, E (panel + submit)
src/components/forum/composer-header.tsx          ← B (title + dropdowns)
src/components/forum/composer-toolbar-buttons.tsx  ← C (toolbar buttons)
src/components/forum/forum-editor.tsx             ← C container + D (editor)
```
