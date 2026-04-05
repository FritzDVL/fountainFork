# Phase 5a: Composer Visual Refinement

## Goal

Upgrade the composer from bare MVP to a polished, forum-quality editor.
Not the full Discourse dual-column spec yet — just the quick wins that
make it feel professional.

## What We Have (MVP)

```
┌──────────────────────────────────────────────────────────────┐
│ New Thread                                          [Close]  │
├──────────────────────────────────────────────────────────────┤
│ Thread title                                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   (plain editor area, floating toolbar only on text select)  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                          [Create Topic]      │
└──────────────────────────────────────────────────────────────┘
```

Problems:
- No visible toolbar — users don't know formatting is available
- Panel looks flat and cheap (no shadow, thin border)
- Title input blends into the background
- Editor area feels cramped
- No visual separation between sections
- Submit bar is plain

## What We Want (5a)

```
┌──────────────────────────────────────────────────────────────┐
│ ✏️ New Thread                                       [Close]  │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Thread title                                             │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ B  I  U  S  ~  H1  H2  •  1.  ""  <>  🖼  🔗  📋          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Write your post here...                                    │
│                                                              │
│   (taller editor area with placeholder text)                 │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                          [Create Topic]      │
└──────────────────────────────────────────────────────────────┘
```

Improvements:
- Fixed toolbar with formatting buttons (reuse Fountain's toolbar)
- Panel has shadow + stronger border
- Title input has visible border/background
- Taller default height (60vh instead of 50vh)
- Placeholder text in editor
- Icon in header bar
- Floating toolbar ALSO still works on text selection

---

## Fountain Components We Reuse

| Component | File | What it gives us |
|---|---|---|
| `FixedToolbar` | `src/components/ui/fixed-toolbar.tsx` | Sticky toolbar container with blur bg |
| `FixedToolbarButtons` | `src/components/ui/fixed-toolbar-buttons.tsx` | All formatting buttons (B, I, U, headings, lists, links, images, tables) |
| `FloatingToolbar` | `src/components/ui/floating-toolbar.tsx` | Popup toolbar on text selection |
| `FloatingToolbarButtons` | `src/components/ui/floating-toolbar-buttons.tsx` | Buttons for the floating toolbar |
| `MarkToolbarButton` | `src/components/ui/mark-toolbar-button.tsx` | Individual format buttons |
| `InsertDropdownMenu` | `src/components/ui/insert-dropdown-menu.tsx` | Insert menu (image, table, etc.) |
| `TurnIntoDropdownMenu` | `src/components/ui/turn-into-dropdown-menu.tsx` | Block type selector (paragraph, heading, quote) |

We can use `FixedToolbarButtons` directly — it's the same toolbar
Fountain shows in its full editor. Or we can create a slimmed-down
version with fewer buttons for the forum composer.

---

## Execution Steps

### Step 5a.1: Add Fixed Toolbar to ForumEditor

Update `src/components/forum/forum-editor.tsx`:
- Import `FixedToolbar` and `FixedToolbarButtons`
- Render toolbar above the editor area (inside the `<Plate>` context)
- Keep floating toolbar too (both work together)

The toolbar must be INSIDE the `<Plate>` component because the buttons
use `useEditorRef()` to apply formatting.

### Step 5a.2: Improve Composer Panel Styling

Update `src/components/forum/composer-panel.tsx`:
- Height: `60vh` instead of `50vh`
- Shadow: `shadow-xl` on the panel
- Border: `border-t-2` instead of `border-t`
- Header: add pencil icon, slightly larger text
- Submit button: primary color, slightly larger

### Step 5a.3: Improve Title Input

Update `src/components/forum/composer-header.tsx`:
- Title input: visible border, rounded, padding, larger font
- Placeholder: "Give your thread a title"
- Reply mode: slightly styled "Replying to" bar

### Step 5a.4: Slim Toolbar Variant (Optional)

If the full `FixedToolbarButtons` feels too crowded for the composer,
create a `ComposerToolbarButtons` with just the essentials:
- Bold, Italic, Underline, Strikethrough, Code
- Heading selector (H1, H2, H3)
- Bullet list, Numbered list
- Blockquote, Code block
- Link, Image
- No: AI button, color pickers, alignment, line height, table

This is optional — try the full toolbar first, slim down if needed.

---

## Files to Update

```
src/components/forum/forum-editor.tsx      — add FixedToolbar
src/components/forum/composer-panel.tsx     — styling improvements
src/components/forum/composer-header.tsx    — title input styling
```

## Files to Create (optional)

```
src/components/forum/composer-toolbar-buttons.tsx  — slim toolbar (if needed)
```

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T5a.1 | Open composer | Fixed toolbar visible with formatting buttons |
| T5a.2 | Click Bold button | Text becomes bold |
| T5a.3 | Click Heading button | Text becomes heading |
| T5a.4 | Insert image via toolbar | Image upload works |
| T5a.5 | Select text | Floating toolbar also appears |
| T5a.6 | Panel has shadow | Visually elevated above page content |
| T5a.7 | Title input has border | Clearly visible input field |
| T5a.8 | Editor area is taller | More writing space |
