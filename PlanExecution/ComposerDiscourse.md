# Discourse Composer — UX Behavior Spec

> Reverse-engineered from Discourse source (Ember.js/Ruby) for porting to React/Plate.js.
> Generated: 2026-04-02

---

## 1. Panel State Machine

The composer is a fixed-bottom panel with 4 mutually exclusive states:

| State | Visual | Height | Trigger |
|---|---|---|---|
| `closed` | Not visible | `0` | Discard, successful save |
| `draft` | Collapsed bar (45px), tertiary background, shows draft title | `45px` | Minimize button (↓), click away |
| `open` | Full editor panel | `var(--composer-height)`, min 255px, max `100vh - header` | Click draft bar, reply button, new topic |
| `fullscreen` | Takes over viewport | 100% | Fullscreen toggle button |

Transitions are CSS-animated: `height 0.2s, max-width 0.2s, transform 0.2s`.

The `draft` state is a clickable bar — clicking anywhere on it transitions to `open`. It shows the topic title being replied to (or "Saved draft") with an expand button.

---

## 2. Sliding Panel Mechanics

- The panel is `position: fixed; bottom: 0` with `z-index` above content but below modals.
- A **grippie** drag handle at the top allows vertical resize. Drag events store the height in `keyValueStore` (localStorage) and set `--composer-height` CSS variable.
- The main page content gets `padding-bottom: var(--composer-height)` with a 250ms transition so content doesn't get hidden behind the composer.
- On mobile: the composer goes full-screen (`height: 100dvh`, `top: 0`), no grippie, no fullscreen toggle.

---

## 3. Layout Structure (Open State)

```
┌─────────────────────────────────────────────┐
│ [grippie drag handle]                        │
├─────────────────────────────────────────────┤
│ Reply To: [action title]    [⤢] [↓] [✕]    │  ← reply-to bar
├─────────────────────────────────────────────┤
│ [Title input]                                │  ← only when canEditTitle
│ [Category chooser ▾] [Tag chooser ▾]        │  ← conditional
├──────────────────────┬──────────────────────┤
│                      │                      │
│   Markdown Editor    │   Live Preview       │  ← side-by-side, flex: 1 each
│   (textarea)         │   (rendered HTML)    │
│                      │                      │
├──────────────────────┴──────────────────────┤
│ [Submit] [Discard]              [« toggle]   │  ← submit panel
└─────────────────────────────────────────────┘
```

The dual-column layout is a flexbox row:
- **Left:** textarea column (flex: 1) — toolbar + textarea
- **Right:** preview wrapper (flex: 1, margin-left: 16px) — rendered HTML

---

## 4. Preview Toggle Behavior

- **Desktop:** a `«` toggle button in the submit panel rotates 180° when preview is hidden.
- When preview is **hidden**: the composer narrows to `max-width: 740px` (centered), the preview column is removed.
- When preview is **shown**: composer goes full width (up to `$reply-area-max-width`).
- State is persisted in `keyValueStore` as `composer.showPreview`.
- **Mobile:** no side-by-side. A "preview" button shows a full-screen overlay of the rendered content. A pencil icon returns to editing.

---

## 5. Composer Actions (What Opens the Composer)

| Action | Title editable | Category/Tags | Recipients | Pre-filled content |
|---|---|---|---|---|
| `createTopic` | ✅ | ✅ | ❌ | Category template if set |
| `reply` | ❌ | ❌ | ❌ | Empty (or quote) |
| `edit` | ✅ (if first post) | ✅ (if first post) | ❌ | Original post raw |
| `privateMessage` | ✅ | ❌ | ✅ (user selector) | Empty |
| `createSharedDraft` | ✅ | ✅ | ❌ | Empty |

---

## 6. Quote-Reply Insertion

Flow:

1. User selects text on a post → a floating "Quote" button appears.
2. Clicking "Quote" calls `composer.focusComposer({ insertText: quote })`.
3. If composer is **closed** → opens with `REPLY` action targeting that topic.
4. If composer is **already open** → appends the quote to the current content.
5. The quote is formatted as:

```markdown
[quote="username, post:3, topic:42, full:true"]
Selected text here
[/quote]
```

6. The "Import Quote" toolbar button fetches the full raw content of the post being replied to and inserts it as a block quote.

---

## 7. Title Input Behavior

- Only shown when `canEditTitle` is true (new topic, PM, editing first post).
- **URL auto-detection:** if the title is an absolute URL, it attempts to onebox it, auto-fills the post body with the URL, and replaces the title with the onebox heading.
- **Validation:** shows inline error tips for missing, too short, or too long titles (after blur, not during focus).
- Max length enforced unless featured links are enabled (to allow pasting long URLs).

---

## 8. Category Chooser

- A dropdown select component.
- **Shown when:** not a PM, and site has more than 1 category.
- Can be disabled (e.g., when editing a post where user can't change category).
- Supports scoped categories (pre-filtered) and read-only categories.
- Changing category applies the category's **topic template** to the body (if body is empty or matches the previous template).
- **Validation:** shows error if category is required but missing.

---

## 9. Tag Chooser

- A multi-select with search.
- **Shown when:** tagging is enabled and user has permission.
- Respects `minimum_required_tags` from the selected category.
- Can be disabled independently of category.
- Positioned next to category chooser in the `title-and-category` row.

---

## 10. Private Message User Selector

- A user/group/email chooser component.
- Shown only for `privateMessage` action, replaces the category/tag row.
- Supports `allowEmails` based on user permissions.
- Includes a "Send as warning" checkbox for staff.
- Auto-focuses when the composer opens in PM mode.

---

## 11. Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl/Cmd + Enter` | Submit (save/reply) |
| `Alt + Enter` (iPad) | Submit |
| `Escape` | Minimize to draft (if open), close messages first if any |

---

## 12. Draft Persistence

- Drafts auto-save on a debounce as the user types.
- Draft status shown in submit panel: conflict indicator (another user editing), error icon, or "saved" text.
- Draft bar (collapsed state) shows the topic title or "Saved draft".
- Opening a draft restores the stored `--composer-height`.

---

## 13. Upload Behavior

- File upload button in toolbar (desktop) or floating button (mobile).
- Upload progress shown in submit panel with percentage and cancel button.
- During upload: submit button is disabled, mobile preview button is hidden.
- Supports drag-and-drop onto the editor area.

---

## 14. Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| Desktop (>1200px) | Full side-by-side, all controls visible |
| Tablet (≤1200px) | `min-width: 0` on composer, narrower layout |
| Mobile | Full-screen composer, no grippie, no fullscreen toggle, toolbar hidden by default (toggle via hamburger), preview is a separate full-screen overlay, file upload as floating button |

---

## Source Files Analyzed

| File | Purpose |
|---|---|
| `app/components/composer-container.gjs` | Top-level orchestrator, template layout |
| `app/components/composer-body.js` | Panel element, CSS class bindings, keyboard events |
| `app/components/composer-editor.gjs` | Editor + preview, upload handling, mentions |
| `app/components/composer-title.gjs` | Title input, URL detection, validation |
| `app/components/composer-toggles.gjs` | Minimize/fullscreen/toolbar toggle buttons |
| `app/components/composer-user-selector.gjs` | PM recipient picker |
| `app/models/composer.js` | State machine, action constants, serializers |
| `app/services/composer.js` | Service layer: open/close/toggle/quote/save |
| `stylesheets/common/base/compose.scss` | Panel positioning, states, responsive |
| `stylesheets/common/d-editor.scss` | Editor/preview dual-column flex layout |
