# Composer Specification — Final Merged Version

## Origin

This spec merges two source documents:
- `ComposerSpec.md` — original design for a Discourse-style editor on Fountain
- `ComposerDiscourse.md` — reverse-engineered Discourse UX behavior

The result is a React + Plate.js composer that replicates Discourse's
panel behavior while using Fountain's editor engine.

---

## Panel State Machine

4 mutually exclusive states:

```
closed ──→ open ──→ fullscreen
  ↑          │  ↑       │
  │          ▼  │       │
  └──── draft ──┘       │
  ↑                     │
  └─────────────────────┘
```

| State | Visual | Height | Trigger |
|---|---|---|---|
| `closed` | Not visible | 0 | Discard, successful publish, close button |
| `draft` | Collapsed bar (45px), shows draft title | 45px | Minimize button (↓), click away |
| `open` | Full editor panel | `var(--composer-height)`, min 255px, max `100vh - header` | Click draft bar, "New Thread", "Reply" |
| `fullscreen` | Covers viewport | 100% | Fullscreen toggle (⤢) |

Transitions: CSS animated `height 0.2s, max-width 0.2s, transform 0.2s`.

---

## Panel Mechanics

- `position: fixed; bottom: 0; left: 0; right: 0`
- `z-index` above content, below modals
- **Grippie** drag handle at top for vertical resize
  - Drag events store height in localStorage (`composer.height`)
  - Sets CSS variable `--composer-height`
- Main page content gets `padding-bottom: var(--composer-height)` with 250ms transition
- **Mobile:** fullscreen (`height: 100dvh, top: 0`), no grippie, no fullscreen toggle

---

## Layout (Open State)

```
┌──────────────────────────────────────────────────────────────┐
│ [grippie drag handle]                                        │
├──────────────────────────────────────────────────────────────┤
│ [Context label]                         [⤢] [↓] [✕]         │  ← control bar
├──────────────────────────────────────────────────────────────┤
│ Title: [________________________________]                    │  ← header fields
│ Board: [Beginners & Help ▾]                                  │
├──────────────────────┬───────────────────────────────────────┤
│                      │                                       │
│   Plate.js Editor    │   Live Preview (readOnly)             │  ← dual column
│   (edit mode)        │   (synced via React state)            │
│                      │                                       │
├──────────────────────┴───────────────────────────────────────┤
│ [B I U H1 H2 • — "" <> 🖼 🔗]    [« toggle]  [Create Topic]│  ← submit panel
└──────────────────────────────────────────────────────────────┘
```

Dual column: flexbox row, each `flex: 1`, preview has `margin-left: 16px`.

---

## Preview Toggle

- **Desktop:** `«` button in submit panel rotates 180° when preview hidden
- Preview **hidden:** composer narrows to `max-width: 740px` (centered)
- Preview **shown:** composer goes full width
- State persisted in localStorage as `composer.showPreview`
- **Mobile:** no side-by-side. "Preview" button shows full-screen overlay.
  Pencil icon returns to editing.

---

## Composer Actions (What Opens It)

| Action | Title editable | Board/Category | Pre-filled content |
|---|---|---|---|
| New Thread (Commons) | ✅ | Board selector (pre-selected from context) | Empty |
| New Topic (Research) | ✅ | Category + Tags | Empty |
| Reply | ❌ | Inherited from thread | Empty (or quote) |
| Quote-Reply | ❌ | Inherited from thread | Blockquote of selected text |

---

## Header Fields

**Commons boards:**
```
Title: [________________________________]
Board: [Beginners & Help ▾]     ← dropdown, pre-selected from context
```

**Research:**
```
Title: [________________________________]
Category: [🟠 Consensus ▾]      ← ONE category, required
Tags: [#hunting] [#game-theory] [+ add tag]  ← multiple, optional
```

**Reply:**
```
Replying to: "Welcome to the forum" by alice
```

---

## Toolbar

Compact, at the BOTTOM of the editor column (not top like Fountain):
```
B  I  U  H1  H2  •  —  ""  <>  🖼  🔗  📎
```

Same Plate.js plugins as Fountain: bold, italic, underline, headings,
lists, blockquote, code block, image upload, link, file attach.

---

## Quote-Reply Flow

### Basic (Reply Button)

Each post in a thread has a 💬 reply button. Clicking it:
1. Opens composer (or focuses if already open)
2. Inserts blockquote at cursor:

```
> [Quoted text from the post]
> — @username, #3

[cursor here]
```

In Plate.js: insert blockquote node + empty paragraph.

### Advanced (Text Selection — Future)

1. User selects text in a post
2. Floating "Quote" button appears above selection
3. Click → opens composer with just that selection quoted

Pure DOM selection + Plate.js insertion. No Lens involvement.

---

## Submit Behavior

**"Create Topic" / "Post Reply" button:**
1. Disabled during upload or when editor is empty
2. On click: calls publish function (Phase 6)
3. On success: close composer, navigate to thread, toast
4. On failure: keep composer open, show error toast

**Keyboard:** `Ctrl/Cmd + Enter` = submit. `Escape` = minimize.

---

## Draft Persistence

- Auto-save on debounce as user types (for thread openers)
- Draft bar shows title or "Saved draft" when minimized
- Opening a draft restores the stored `--composer-height`
- Replies: NO draft persistence (local state only, lost on close)

---

## Upload Behavior

- File upload button in toolbar (desktop) or floating button (mobile)
- Upload progress shown in submit panel with percentage + cancel
- During upload: submit button disabled
- Supports drag-and-drop onto editor area
- Uses Fountain's existing Grove upload infrastructure

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| Desktop (>1200px) | Full side-by-side, all controls visible |
| Tablet (≤1200px) | `min-width: 0`, narrower layout |
| Mobile | Fullscreen, no grippie, no fullscreen toggle, toolbar toggle via hamburger, preview as overlay |

---

## MVP vs Full Implementation

**MVP (Phase 5 first pass):**
1. Bottom panel that slides up (no dual-column, just editor)
2. Title + board/category selector in header
3. Plate.js editor with floating toolbar (Fountain already has this)
4. "Create Topic" / "Post Reply" button
5. Three states: closed, open, fullscreen

**Full (Phase 5 second pass):**
1. Preview column (dual-pane)
2. Draft bar (minimized state)
3. Resize handle (grippie)
4. Preview toggle + persistence
5. Text-selection quoting
6. Upload progress in submit panel
7. Mobile overlay preview
8. Keyboard shortcuts

---

## Component Inventory

```
src/hooks/forum/use-composer.ts           — state machine + actions
src/components/forum/composer-provider.tsx — context provider (layout-level)
src/components/forum/composer-panel.tsx    — main panel (fixed bottom)
src/components/forum/composer-header.tsx   — title + board/category/tags
src/components/forum/composer-editor.tsx   — dual-column Plate.js
src/components/forum/composer-toolbar.tsx  — compact bottom toolbar
src/components/forum/composer-draft-bar.tsx— minimized state bar
src/components/forum/composer-grippie.tsx  — resize drag handle
```
