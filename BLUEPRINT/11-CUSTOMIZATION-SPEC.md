# 11 — Customization Spec: Fountain Fork → Society Protocol Forum

## 1. Landing Page → Boards

**Current:** `/` renders `LandingPageClient` — a marketing page explaining Fountain with curated posts.  
**Target:** `/` should render the Boards page content (forum board sections + language boards).

**Files to change:**
- `src/app/page.tsx` — replace the landing page with the boards page logic
- The `/boards` route can remain as-is (or redirect to `/`)

---

## 2. Favicon

**Current:** `public/favicon.ico` — Fountain's icon.  
**Target:** Replace with Society Protocol's favicon.

**Action required:** Provide a favicon file (`.ico`, `.png`, or `.svg`). Drop it into `public/` and update the metadata in `src/app/layout.tsx` if the filename changes.

---

## 3. Footer Links & Branding

**Current:** `src/components/navigation/global-footer.tsx` contains:
- "© 2026 Fountain Labs"
- Links to: Policy, Terms, Contact (info@fountain.ink), GitHub (fountain-ink), Twitter (@fountaindotink), Hey (fountain), Telegram (fountaindotink)

**Target:** Replace all with Society Protocol equivalents:
- Copyright text
- Contact email
- Social links (Twitter/X, Telegram, etc.)
- Remove or replace GitHub, Hey links

**Action required:** Provide social links, contact email, and org name.

---

## 4. Post Page — Sections After Article Content

**Current:** `src/app/p/[user]/[post]/page.tsx` renders these sections after the article body:

| # | Section | Component | Description |
|---|---------|-----------|-------------|
| 1 | PostActionsBar | `post-actions-bar.tsx` | Like/collect/share buttons |
| 2 | UserPostCard | `user-post-card.tsx` | Author card with bio, follow button, follower count |
| 3 | PostTags | `post-tags.tsx` | Tag pills |
| 4 | PostMetadata | `post-metadata.tsx` | Tabs showing content URI, license, storage type (Grove/IPFS/Arweave) |
| 5 | CommentPreview | `comment-preview.tsx` | Comment section |
| 6 | FloatingActionBar | `post-floating-actions-bar.tsx` | Floating action buttons |
| 7 | ReadMore | `blog-read-more-section.tsx` | "More from [author]" grid of up to 6 posts |

**Action required:** Decide for each section — keep, remove, or modify.

---

## 5. Layout Metadata & Analytics

**Current in `src/app/layout.tsx`:**
- Title: `"Fountain"`
- Description: `"where your writing journey begins..."`
- Analytics script: `stats.kualta.dev` with website ID `42c57186-3cbd-4221-91e1-083ccb710ae8`

**Target:** Update title, description, remove or replace analytics script.

**Action required:** Provide desired site title, description, and analytics info (if any).

---

## Pending Decisions

- [ ] Provide favicon file
- [ ] Provide org name, social links, contact email for footer
- [ ] Provide site title and description
- [ ] Decide on each post-page section (keep/remove/modify)
- [ ] Decide if `/boards` should redirect to `/` or keep both routes
- [ ] Decide on analytics (remove / replace with own)
