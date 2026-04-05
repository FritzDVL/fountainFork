# Editor Centering — SOLVED

## The Problem (from Phase 4)

Forum post content was centered with extra padding instead of being
left-aligned under the author name.

## Root Cause

Two layers of centering in Fountain's editor:

1. **Outer wrapper** in `editor.tsx` line 93:
   `<div className="max-w-[65ch] w-full mx-auto">`

2. **Editor variant padding** in `ui/editor.tsx`:
   `fullWidth: "min-h-full px-6 sm:px-16 text-base md:px-24"`

The `fullWidth` variant adds `px-6` (24px), `sm:px-16` (64px), and
`md:px-24` (96px) of horizontal padding. This is designed for article
reading but wrong for forum posts.

## The Fix

Created `ForumEditor` component (`src/components/forum/forum-editor.tsx`)
that uses the same Plate.js setup but overrides the padding:

```tsx
<Editor variant="fullWidth" className="!px-0 !sm:px-0 !md:px-0" />
```

The `!` prefix in Tailwind means `!important`, which overrides the
variant's built-in padding.

The `ForumEditor` also skips:
- The `max-w-[65ch] mx-auto` wrapper (not in our component tree)
- Collaborative editing (YJS)
- AutoSave
- TocSidebar

## Where ForumEditor is Used

- `forum-post-content.tsx` — renders thread/reply content (readOnly)
- `composer-panel.tsx` — the composer editor (edit mode)

## Key Lesson

When reusing a component library's variants, check the CSS they apply.
The variant name `fullWidth` sounds right but it still had article-width
padding. Always inspect the actual CSS values.
