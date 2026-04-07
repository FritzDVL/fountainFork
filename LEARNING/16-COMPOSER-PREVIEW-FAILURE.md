# Composer Preview — What Went Wrong and Why

## The Goal

Add a live preview column to the composer: editor on the left, rendered
preview on the right, updating as the user types. This is how Discourse
works.

## What We Tried

### Attempt 1: Second `<ForumEditor readOnly>`

Rendered a second `<Plate>` instance in readOnly mode, passing the
editor's current value as the `value` prop.

**Result:** Infinite render loop. Error:
```
useValue has rendered 100000 times in the same render.
It is very likely to have fallen into an infinite loop.
```

**Why it failed:**
Plate.js uses jotai (a state management library) internally. Each
`<Plate>` component creates a jotai store. When two `<Plate>` instances
exist on the same page, certain hooks (`useEditorRef`, `BlockSelection`)
pick up the wrong store or trigger cross-store updates.

The `onChange` callback fires → updates React state → re-renders the
preview → preview creates a new Plate editor → which triggers more
jotai atom updates → infinite loop.

This is a known limitation of Plate.js. It was designed for one editor
per page (like Fountain's article editor at `/w/[id]`).

### Attempt 2: Debounced onChange + deep clone

Added a 300ms debounce on the `onChange` handler and deep-cloned the
value with `JSON.parse(JSON.stringify(val))`.

**Result:** Reduced the frequency but didn't fix the root cause. The
second `<Plate>` instance still caused jotai store conflicts. "Ghost"
elements appeared — duplicate toolbars, phantom cursors, selection
artifacts.

### Attempt 3: Static renderer (`EditorStatic` + `getStaticEditor`)

Used Fountain's existing static rendering pipeline:
- `getStaticEditor(value)` creates a plain Slate editor (no React)
- `EditorStatic` renders it as pure HTML (no hooks, no jotai)

**Result:** Still problems. The static renderer itself works fine in
isolation (Fountain uses it for article previews), but when combined
with the live editor in the same component tree, the debounced state
updates still cause excessive re-renders of the entire composer panel.

The issue is that `setPreviewValue()` triggers a re-render of the
entire `ComposerPanel` component, which re-renders the editor column
too, which can cause the editor to lose focus or re-initialize.

## Root Cause Analysis

The fundamental problem is **React re-rendering**:

```
User types → Plate onChange fires
  → setPreviewValue(newValue)     ← this triggers re-render
  → ComposerPanel re-renders
  → Editor column re-renders      ← editor may lose state
  → Preview column re-renders     ← this is what we want
  → Plate detects DOM changes
  → onChange fires again           ← potential loop
```

Plate.js editors are stateful DOM objects. They don't like being
re-rendered by React. Fountain avoids this by:
1. Having only ONE editor per page
2. Never putting editor state in React state
3. Using Plate's internal state management exclusively

Our composer violates rule #3 by pulling editor content into React
state (`previewValue`) to feed the preview.

## Solutions (ranked by complexity)

### Solution A: No preview column (RECOMMENDED for now)

Just remove it. The composer works perfectly without it. Users can
see their formatting via the toolbar buttons (bold shows as bold in
the editor itself). Discourse's preview is nice but not essential.

**Effort:** Already done (preview disabled).
**Risk:** None.
**Tradeoff:** Less fancy, but stable.

### Solution B: Preview via iframe

Render the preview in an `<iframe>` with its own React root. The
iframe is a completely separate DOM and JavaScript context. No shared
jotai stores, no shared React tree, no re-render conflicts.

Communication: post the editor value to the iframe via `postMessage`.
The iframe receives it and renders with `EditorStatic`.

**Effort:** Medium (need iframe setup, message passing, styling).
**Risk:** Low (complete isolation).
**Tradeoff:** Slightly complex setup, but bulletproof isolation.

### Solution C: Preview in a Web Worker + HTML string

Serialize the editor content to HTML in a Web Worker (off main thread),
then render the HTML string with `dangerouslySetInnerHTML`.

**Effort:** Medium.
**Risk:** Low.
**Tradeoff:** Loses Plate-specific rendering (custom elements like
embeds won't look right). Basic formatting (bold, italic, headings,
lists) would work fine.

### Solution D: Separate React root via `createRoot`

Create a second React root for the preview column using
`ReactDOM.createRoot()`. This gives it its own React tree, separate
from the main app. No shared context, no shared re-renders.

**Effort:** Medium.
**Risk:** Medium (two React roots can have subtle issues with shared
providers like theme context).
**Tradeoff:** Clean isolation but needs careful provider setup.

### Solution E: Fix the re-render with proper memoization

Wrap the editor in `React.memo`, use `useRef` instead of `useState`
for the preview value, and update the preview via a separate
`requestAnimationFrame` callback that doesn't trigger React re-renders.

**Effort:** High (deep Plate.js internals knowledge needed).
**Risk:** High (fragile, may break on Plate updates).
**Tradeoff:** Most "correct" solution but hardest to get right.

## Recommendation

**Go with Solution A (no preview) for launch.** The composer is
functional and stable without it. The preview is a nice-to-have,
not a must-have.

If we want preview later, **Solution B (iframe)** is the safest
approach. It's the same technique VS Code uses for its preview panels —
complete isolation via iframe boundaries.

## What We Learned

1. **Plate.js is designed for one editor per page.** Two `<Plate>`
   instances on the same page cause jotai store conflicts.

2. **Don't put Plate editor content in React state.** The editor
   manages its own state internally. Pulling it into React state
   creates re-render loops.

3. **Fountain's static renderer works but needs isolation.** It's
   fine for server-rendered pages (article view) but problematic
   when used alongside a live editor in the same React tree.

4. **Discourse uses a completely different approach.** Their editor
   is a plain `<textarea>` (not a rich text editor). The preview is
   rendered HTML from a markdown parser. Two completely independent
   systems with no shared state. Our Plate.js approach is fundamentally
   different and doesn't map cleanly to Discourse's dual-column pattern.

## Current State

Preview is **disabled by default** (`showPreview = false`). The eye
icon in the composer top bar can toggle it on, but it's off for safety.
The minimize/maximize/resize features work fine — they don't involve
the preview.

All preview-related code is still in `composer-panel.tsx` (the static
renderer import, the debounced onChange, the preview column JSX). It
can be cleaned up or kept for future iframe implementation.
