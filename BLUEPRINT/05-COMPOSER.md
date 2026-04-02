# Phase 5: Composer — Discourse-Style Bottom Panel

## Goal

Build the Discourse-style composer panel that slides up from the bottom
of the screen. This replaces Fountain's full-page editor navigation with
an in-place editing experience. The user can browse the forum while
composing.

## Depends On

Phase 4 (forum pages exist to host the composer)

## Source Specs

- `PlanExecution/ComposerSpec.md` — original composer design
- `PlanExecution/ComposerDiscourse.md` — reverse-engineered Discourse UX

---

## Composer State Machine

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
| `closed` | Not visible | 0 | Discard, successful publish |
| `draft` | Collapsed bar (45px) showing draft title | 45px | Minimize button, click away |
| `open` | Full editor panel | `var(--composer-height)`, min 255px | Click draft bar, "New Thread", "Reply" |
| `fullscreen` | Covers viewport | 100vh - header | Fullscreen toggle |

Transitions: CSS animated (`height 0.2s, transform 0.2s`).

## Steps

### 5.1 Composer State Hook

**File:** `src/hooks/forum/use-composer.ts`

Manages: state (closed/draft/open/fullscreen), height (resizable, persisted
to localStorage), content type (new thread vs reply), pre-filled data
(category, quoted text, thread reference).

```ts
interface ComposerState {
  status: 'closed' | 'draft' | 'open' | 'fullscreen'
  mode: 'thread' | 'reply'
  height: number                    // persisted to localStorage
  threadRef?: {                     // set when replying
    rootPublicationId: string
    feed: FeedType
    title: string
  }
  prefilledCategory?: string        // set from board context
  quotedText?: string               // set from quote-reply
}
```

Exposed actions: `openNewThread(category?)`, `openReply(threadRef, quotedText?)`,
`minimize()`, `expand()`, `toggleFullscreen()`, `close()`, `setHeight(h)`.

### 5.2 Composer Context Provider

**File:** `src/components/forum/composer-provider.tsx`

Wraps the forum layout. Provides `useComposer()` to any child component.
The composer panel itself is rendered at the layout level (not per-page).

### 5.3 Composer Panel Component

**File:** `src/components/forum/composer-panel.tsx`

The main visual component. Fixed to bottom of viewport.

```
┌──────────────────────────────────────────────────────────────┐
│ ▲ Drag handle                        [Minimize] [⤢] [Close] │
├──────────────────────────────────────────────────────────────┤
│ Title: [________________________________]                    │
│ Board: [Beginners & Help ▾]                                  │
├──────────────────────┬───────────────────────────────────────┤
│                      │                                       │
│   EDITOR (Plate.js)  │   PREVIEW (readOnly)                  │
│                      │                                       │
├──────────────────────┴───────────────────────────────────────┤
│ [B I U H1 H2 • — "" <> 🖼 🔗]              [Create Topic]   │
└──────────────────────────────────────────────────────────────┘
```

CSS: `position: fixed; bottom: 0; left: 0; right: 0; z-index: 40`

### 5.4 Composer Header

**File:** `src/components/forum/composer-header.tsx`

Two modes:

**Thread mode:**
```
Title: [________________________________]
Board: [Beginners & Help ▾]
```

**Reply mode:**
```
Replying to: "Welcome to the forum" by alice
```

Category selector uses the same `SECTIONS` config from `categories.ts`.
Pre-selects category if opened from a board page context.

### 5.5 Composer Editor (Dual Column)

**File:** `src/components/forum/composer-editor.tsx`

Left column: Plate.js editor in edit mode (reuses Fountain's `createPlateEditor`
with same plugins from `getEditorPlugins()`).

Right column: Plate.js editor in readOnly mode, synced to left column's
value via React state. Live preview.

```tsx
const [editorValue, setEditorValue] = useState(initialValue)

// Left: edit mode
<PlateEditor value={editorValue} onChange={setEditorValue} />

// Right: preview mode
<PlateEditor value={editorValue} readOnly={true} />
```

**Desktop:** side-by-side (flex row, each flex-1).
**Mobile:** single column (editor only). Preview via toggle button.

Preview toggle: `«` button in submit panel. Persisted to localStorage.
When hidden, composer narrows to `max-width: 740px` centered.

### 5.6 Composer Toolbar

**File:** `src/components/forum/composer-toolbar.tsx`

Compact toolbar at BOTTOM of editor column (not top like Fountain):
```
B  I  U  H1  H2  •  —  ""  <>  🖼  🔗  📎
```

Same Plate.js plugins as Fountain — reuses existing toolbar button components.

### 5.7 Draft Bar (Minimized State)

When minimized, shows a thin bar:
```
┌──────────────────────────────────────────────────────────────┐
│ New Thread: "How do I create a Lens account?"    [▲ Expand]  │
└──────────────────────────────────────────────────────────────┘
```

Click anywhere → transitions to `open` state.

### 5.8 Resize Handle (Grippie)

Top edge of the panel has a drag handle. Drag events:
- Store height in localStorage as `composer.height`
- Set CSS variable `--composer-height`
- Main page content gets `padding-bottom: var(--composer-height)` with transition

### 5.9 Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl/Cmd + Enter` | Submit (publish thread or reply) |
| `Escape` | Minimize to draft |

### 5.10 Mobile Behavior

- Composer goes fullscreen (`height: 100dvh`, `top: 0`)
- No grippie, no fullscreen toggle
- Preview is a separate full-screen overlay (toggle via button)
- Toolbar hidden by default (toggle via hamburger icon)

---

## Integration Points

### Opening the Composer

The composer is opened by calling actions from `useComposer()`:

- "New Thread" button on board page → `openNewThread(category)`
- "Reply" button on thread post → `openReply(threadRef)`
- Quote-reply (future) → `openReply(threadRef, quotedText)`

### Submitting

The submit button calls the publish functions from Phase 6:
- Thread mode → `publishThread()`
- Reply mode → `publishReply()`

Phase 5 creates the UI shell. Phase 6 wires the actual publishing.

### Page Content Padding

When composer is open, the main page content needs bottom padding
so it doesn't get hidden behind the panel:

```css
main {
  padding-bottom: var(--composer-height, 0);
  transition: padding-bottom 250ms;
}
```

---

## MVP vs Full

**MVP (build first):**
- Bottom panel with Plate.js editor (single column, no preview)
- Title + category selector
- Three states: closed, open, fullscreen
- Submit button (wired in Phase 6)

**Full (add after MVP works):**
- Preview column (dual-pane)
- Draft bar (minimized state)
- Resize handle
- Preview toggle + persistence
- Mobile overlay preview
- Keyboard shortcuts

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T5.1 | Click "New Thread" on board page | Composer slides up from bottom |
| T5.2 | Category pre-selected from context | Dropdown shows correct category |
| T5.3 | Type in editor | Content appears in real-time |
| T5.4 | Click Minimize | Composer collapses to draft bar |
| T5.5 | Click draft bar | Composer expands back to open |
| T5.6 | Click Fullscreen toggle | Composer covers entire viewport |
| T5.7 | Click Close | Composer disappears |
| T5.8 | Resize via drag handle | Height changes, persists on reload |
| T5.9 | Preview column shows formatted content | Bold, headings render in preview |
| T5.10 | Mobile: composer is fullscreen | No grippie, no side-by-side |
| T5.11 | Cmd+Enter | Triggers submit action |
| T5.12 | Escape | Minimizes to draft bar |
| T5.13 | Browse forum while composer is minimized | Pages navigate normally |
| T5.14 | Page content has bottom padding | Content not hidden behind panel |

## Files Created

```
src/hooks/forum/use-composer.ts
src/components/forum/composer-provider.tsx
src/components/forum/composer-panel.tsx
src/components/forum/composer-header.tsx
src/components/forum/composer-editor.tsx
src/components/forum/composer-toolbar.tsx
src/components/forum/composer-draft-bar.tsx
```
