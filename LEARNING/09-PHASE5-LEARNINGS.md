# Phase 5 Learnings

## 1. .ts vs .tsx (see LEARNING/08-TS-VS-TSX-EXTENSIONS.md)
Files with JSX must use `.tsx`. The composer hook had JSX for the
context provider and needed renaming from `.ts` to `.tsx`.

## 2. No category dropdown needed in composer
The original plan had a category/board selector dropdown in the
composer header. This was wrong — when a user clicks "New Thread"
from a specific board page, the board is already known from context.
No dropdown needed. Only Research (Phase 8) will have category + tag
selection.

## 3. Editor padding override
Fountain's `Editor` component `fullWidth` variant applies `px-6 sm:px-16 md:px-24`.
Override with `className="!px-0"` using Tailwind's `!important` prefix.
See LEARNING/07-EDITOR-CENTERING-ISSUE.md for full details.

## 4. Composer provider must be at layout level
The composer panel persists across page navigations. It's rendered in
layout files (`boards/layout.tsx`, `thread/layout.tsx`), not in
individual pages. This way the composer stays open when navigating
between thread list and thread detail.

## 5. "Create Topic" button doesn't publish yet
The submit button logs to console. Actual publishing is Phase 6.
This is by design — Phase 5 is the UI shell, Phase 6 wires the backend.
