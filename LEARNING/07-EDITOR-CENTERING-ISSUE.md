# Fountain Editor — Centering & Layout Notes

## The Problem

Fountain's `PlateEditor` component has hardcoded centering:
```tsx
// src/components/editor/editor.tsx line 93
<div className="max-w-[65ch] w-full mx-auto">
  <Editor variant={"fullWidth"} autoFocus />
</div>
```

This centers content in a narrow 65-character column — perfect for
article reading but wrong for forum posts where content should be
left-aligned and full-width within the post card.

## What We Tried

1. **CSS class override** `[&_.max-w-\\[65ch\\]]:max-w-none` — didn't work,
   Tailwind bracket escaping doesn't match in selectors.

2. **useEffect DOM manipulation** — queried `[class*="mx-auto"]` elements
   and set inline styles. Partially works but timing-dependent and fragile.

## The Real Fix (Phase 5 or later)

The proper solution is one of:

**Option A: Create a `ForumEditor` wrapper component**
Fork the readOnly rendering path from `editor.tsx` into a new component
that removes the `max-w-[65ch] mx-auto` wrapper. This is the cleanest
approach but requires understanding the full editor component tree.

**Option B: Use the static editor (`static.tsx`)**
Fountain has `getStaticEditor()` in `src/components/editor/static.tsx`
which creates a Slate editor without the centering wrapper. This renders
server-side and doesn't have the layout constraints. However, it needs
a different rendering approach (not the `<Editor>` component).

**Option C: CSS global override**
Add a global CSS rule in `globals.css`:
```css
.forum-post-content .max-w-\[65ch\] {
  max-width: none;
  margin-left: 0;
}
```
This requires testing the exact CSS selector escaping.

## Where This Gets Fixed

- **Phase 5 (Composer)** — when we build the composer, we'll need to
  deeply understand the editor component anyway. That's the right time
  to create a `ForumEditor` variant.
- **Phase 10 (Polish)** — if not fixed in Phase 5, this is a polish item.

## Current State

Content renders correctly (text, headings, formatting all work).
It's just centered instead of left-aligned. Functional, not broken.
