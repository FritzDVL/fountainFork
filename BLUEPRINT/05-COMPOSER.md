# Phase 5: Composer — Discourse-Style Bottom Panel (UPDATED)

## Goal

Build the Discourse-style composer panel that slides up from the bottom.
Users can write threads and replies without leaving the page. By the end,
the composer opens, accepts input, and has a submit button (wired in Phase 6).

## Depends On

Phase 4 ✅ (forum pages exist to host the composer)

## Source Specs

- `PlanExecution/ComposerSpec.md` — original composer design
- `PlanExecution/ComposerDiscourse.md` — reverse-engineered Discourse UX
- `BLUEPRINT/COMPOSER-SPEC.md` — merged final spec

---

## What We Know From the Codebase

### Fountain's Editor Setup
- `PlateEditor` component: `src/components/editor/editor.tsx` (client component)
- Accepts: `value` (JSON string), `readOnly`, `showToolbar`, `showToc`, `collaborative`
- `getEditorPlugins()`: returns all Plate.js plugins (bold, italic, headings, code, images, etc.)
- `getRichElements()`: returns component overrides for rendering
- Centering issue: editor wraps content in `max-w-[65ch] mx-auto` — needs override for forum

### What We Reuse
- `getEditorPlugins()` — same formatting capabilities
- `getRichElements()` — same visual rendering
- `createPlateEditor()` from `@udecode/plate/react`
- Fountain's toolbar buttons: `FloatingToolbarButtons`, `FixedToolbarButtons`

### What We Build New
- The sliding panel (position: fixed, bottom: 0)
- State machine (closed/draft/open/fullscreen)
- Category selector header
- Submit button (calls Phase 6 publish functions)

---

## MVP First, Then Enhance

We build in two passes to get something working fast:

### MVP (this phase):
1. Bottom panel that slides up (no preview column)
2. Title input + category dropdown
3. Plate.js editor (single column, with floating toolbar)
4. Two states: closed and open
5. Submit button placeholder (wired in Phase 6)
6. Close button

### Enhancements (later, can be Phase 5b or Phase 10):
- Preview column (dual-pane)
- Draft bar (minimized state)
- Fullscreen toggle
- Resize handle (grippie)
- Keyboard shortcuts (Cmd+Enter, Escape)
- Mobile fullscreen behavior

---

## Execution Order

### Step 5.1: Composer State Hook
**File:** `src/hooks/forum/use-composer.ts`

Simple React state + context. No localStorage persistence in MVP.

```ts
interface ComposerState {
  status: 'closed' | 'open'
  mode: 'thread' | 'reply'
  prefilledCategory?: string
  threadRef?: {
    rootPublicationId: string
    feed: FeedType
    title: string
  }
}
```

Actions:
- `openNewThread(category?)` — opens panel in thread mode
- `openReply(threadRef)` — opens panel in reply mode
- `close()` — closes panel

### Step 5.2: Composer Provider
**File:** `src/components/forum/composer-provider.tsx`

React context that wraps forum pages. Renders the composer panel at
the layout level so it persists across page navigations.

Must be a client component (`"use client"`).

### Step 5.3: Forum Layout
**File:** `src/app/boards/layout.tsx`

Wraps `/boards/*` and `/thread/*` pages with the ComposerProvider.
This is where the composer panel is rendered — at the layout level,
not inside individual pages.

```tsx
export default function ForumLayout({ children }) {
  return (
    <ComposerProvider>
      {children}
      <ComposerPanel />
    </ComposerProvider>
  );
}
```

NOTE: We also need `src/app/thread/layout.tsx` to wrap thread pages.
Or we create a shared layout. Simplest: put ComposerProvider in both.

### Step 5.4: Composer Panel
**File:** `src/components/forum/composer-panel.tsx`

The main visual component. Client component.

```
┌──────────────────────────────────────────────────────────────┐
│ New Thread                                          [Close]  │
├──────────────────────────────────────────────────────────────┤
│ Title: [________________________________]                    │
│ Board: [Beginners & Help ▾]                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   [Plate.js editor — full width, floating toolbar]           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                          [Create Topic]      │
└──────────────────────────────────────────────────────────────┘
```

CSS:
```css
position: fixed;
bottom: 0;
left: 0;
right: 0;
z-index: 40;
height: 50vh;        /* MVP: fixed 50% height */
background: var(--background);
border-top: 1px solid var(--border);
```

When closed: `display: none` or `translate-y: 100%`.
When open: slides up with `transition: transform 0.2s`.

### Step 5.5: Composer Header
**File:** `src/components/forum/composer-header.tsx`

Two modes:

**Thread mode:**
- Title input (text field)
- Category dropdown (uses `LANDING_SECTIONS` from categories.ts)
- Category pre-selected if opened from a board page

**Reply mode:**
- Shows: "Replying to: [thread title]"
- No title input, no category selector

### Step 5.6: Forum Editor (Fixes Centering Issue)
**File:** `src/components/forum/forum-editor.tsx`

A wrapper around Plate.js that:
1. Uses `createPlateEditor` with `getEditorPlugins` (non-collaborative, no YJS)
2. Renders WITHOUT the `max-w-[65ch] mx-auto` centering
3. Shows floating toolbar (Fountain's `FloatingToolbar` + `FloatingToolbarButtons`)
4. Exposes editor value via callback

This component is used in:
- The composer (edit mode)
- Thread detail posts (readOnly mode) — replacing the current `ForumPostContent`

```tsx
// Key difference from Fountain's PlateEditor:
// No centering wrapper, no TocSidebar, no AutoSave, no collaborative
<EditorContainer>
  <Editor variant="fullWidth" />  {/* NO max-w-[65ch] wrapper */}
</EditorContainer>
```

### Step 5.7: Wire "New Thread" Button
Update `src/app/boards/[feed]/page.tsx`:
- Import `useComposer` from the context
- "New Thread" button calls `openNewThread(category)`

Update `src/components/forum/forum-post-card.tsx`:
- Add "Reply" button that calls `openReply(threadRef)`

### Step 5.8: Wire into Thread Detail
Update `src/app/thread/[rootPublicationId]/page.tsx`:
- Replace the "Reply editor placeholder" with actual composer trigger
- "Reply" button on each post opens composer in reply mode

---

## Files to Create (MVP)

```
src/hooks/forum/use-composer.ts              — state + context hook
src/components/forum/composer-provider.tsx    — context provider
src/components/forum/composer-panel.tsx       — sliding bottom panel
src/components/forum/composer-header.tsx      — title + category / reply info
src/components/forum/forum-editor.tsx         — Plate.js without centering
src/app/boards/layout.tsx                     — wraps board pages with composer
src/app/thread/layout.tsx                     — wraps thread pages with composer
```

## Files to Update

```
src/app/boards/[feed]/page.tsx               — "New Thread" button wiring
src/app/thread/[rootPublicationId]/page.tsx  — reply button wiring
src/components/forum/forum-post-card.tsx      — add Reply button
src/components/forum/forum-post-content.tsx   — use ForumEditor instead
```

---

## Acceptance Tests (MVP)

| # | Test | Expected Result |
|---|---|---|
| T5.1 | Click "New Thread" on board page | Composer slides up from bottom |
| T5.2 | Category pre-selected from context | Dropdown shows correct category |
| T5.3 | Type title | Title input works |
| T5.4 | Type in editor | Rich text editing works (bold, headings, etc.) |
| T5.5 | Click Close | Composer disappears |
| T5.6 | Click "Reply" on a post | Composer opens in reply mode |
| T5.7 | Reply mode shows thread title | "Replying to: Welcome to the forum" |
| T5.8 | Submit button visible | "Create Topic" or "Post Reply" |
| T5.9 | Forum content left-aligned | ForumEditor fixes centering issue |
| T5.10 | Page content not hidden | Bottom padding when composer is open |

---

## Technical Notes

### Why not reuse Fountain's PlateEditor directly?

Fountain's `PlateEditor` has:
- Collaborative editing (YJS) — not needed for forum
- AutoSave to drafts table — not needed for replies
- TocSidebar — not needed in composer
- `max-w-[65ch] mx-auto` centering — wrong for forum
- `documentId` from URL path — doesn't apply to composer

We need a stripped-down version that keeps the formatting plugins
but removes the blog-specific features.

### Editor value flow

```
User types in composer
  → Plate.js stores as JSON internally
  → On submit: extract JSON via editor.children
  → Convert to ForumDraft { title, contentJson, contentMarkdown }
  → Pass to publishThread() or publishReply() (Phase 6)
```

The markdown conversion uses Fountain's existing serializer
(checked in Phase 6 when we wire publishing).
