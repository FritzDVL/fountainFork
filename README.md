<p align="center">
<img alt="Fountain Banner" width="700px" src="https://github.com/user-attachments/assets/f6fe2688-6f64-4db6-aa01-a6dad326742b" />
<h3 align="center">A batteries-included, self-hostable web3 alternative to Medium, Substack, and Mirror. </h3>
<h4 align="center">Own your content and audience through decentralized publishing</h4>


</p>

## Stack

The Fountain app is entirely self-hostable and is built using the following tools:

- [Lens Protocol](https://lens.xyz/docs/protocol) - Decentralized social protocol
- [Grove](https://lens.xyz/docs/storage) - Decentralized storage 
- [Next.js](https://nextjs.org/) - React framework for the frontend
- [Plate.js](https://platejs.org/) - Customizable editor framework
- [Y.js](https://yjs.dev/) - Collaborative sync layer for the editor
- [Supabase](https://supabase.io/) - Off-chain storage
- [Listmonk](https://listmonk.app/) - Mailing list manager

> **Note:** The Fountain app is still in early development, self-hosting documentation is coming soon.

## Coming Soon

- Docs portal (Q2)
- Deployment SDKs (Q2)

## Getting Started

### Installation
- Using [Bun](https://bun.sh/) (v1.2.5 or higher)

```bash
# Clone the repository
git clone https://github.com/fountain-ink/app.git
cd app

# Install dependencies
bun install

# Create a .env file (and edit the variables)
cp .env.example .env

# Start the development server
bun run dev

# Run the collaboration server (for yjs sync)
bun run collab

# Run the notifications server (WIP)
bun run notifications
```

### Building for Production

```bash
# Build the application
bun run build

# Start the production server
bun run start
```

## License

AGPLv3 - See [LICENSE](LICENSE) for more information.


## Fountain.ink codebase directory list

Directory structure:
└── fountain-ink-app/
    ├── README.md
    ├── biome.json
    ├── CLAUDE.md
    ├── components.json
    ├── LICENSE
    ├── next.config.js
    ├── package.json
    ├── postcss.config.cjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── .env.example
    ├── emails/
    │   ├── newsletter-email-test.tsx
    │   └── newsletter-email.tsx
    ├── public/
    │   └── robots.txt
    ├── src/
    │   ├── env.js
    │   ├── middleware.ts
    │   ├── app/
    │   │   ├── error.tsx
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── sitemap.ts
    │   │   ├── about/
    │   │   │   └── page.tsx
    │   │   ├── admin/
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx
    │   │   │   ├── banned/
    │   │   │   │   └── page.tsx
    │   │   │   ├── contests/
    │   │   │   │   ├── page.tsx
    │   │   │   │   └── [id]/
    │   │   │   │       └── page.tsx
    │   │   │   ├── controls/
    │   │   │   │   └── page.tsx
    │   │   │   ├── feedback/
    │   │   │   │   └── page.tsx
    │   │   │   ├── lookup/
    │   │   │   │   ├── layout.tsx
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── blogs/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── drafts/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   └── users/
    │   │   │   │       └── page.tsx
    │   │   │   └── stats/
    │   │   │       └── page.tsx
    │   │   ├── api/
    │   │   │   ├── admin/
    │   │   │   │   ├── ban/
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── blogs/
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── contests/
    │   │   │   │   │   ├── route.ts
    │   │   │   │   │   └── [id]/
    │   │   │   │   │       ├── route.ts
    │   │   │   │   │       └── winners/
    │   │   │   │   │           └── route.ts
    │   │   │   │   ├── curate/
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── drafts/
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── feedback/
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── stats/
    │   │   │   │   │   └── route.ts
    │   │   │   │   └── users/
    │   │   │   │       └── route.ts
    │   │   │   ├── auth/
    │   │   │   │   └── login/
    │   │   │   │       └── route.ts
    │   │   │   ├── ban/
    │   │   │   │   └── check/
    │   │   │   │       └── route.ts
    │   │   │   ├── blogs/
    │   │   │   │   ├── route.ts
    │   │   │   │   ├── [blog]/
    │   │   │   │   │   └── route.ts
    │   │   │   │   └── sync/
    │   │   │   │       └── route.ts
    │   │   │   ├── contests/
    │   │   │   │   ├── route.ts
    │   │   │   │   └── [slug]/
    │   │   │   │       └── winners/
    │   │   │   │           └── route.ts
    │   │   │   ├── curate/
    │   │   │   │   └── route.ts
    │   │   │   ├── drafts/
    │   │   │   │   └── route.ts
    │   │   │   ├── email/
    │   │   │   │   └── route.ts
    │   │   │   ├── feedback/
    │   │   │   │   └── route.ts
    │   │   │   ├── iframe/
    │   │   │   │   └── route.ts
    │   │   │   ├── import/
    │   │   │   │   ├── mirror.ts
    │   │   │   │   ├── paragraph.ts
    │   │   │   │   ├── route.ts
    │   │   │   │   └── t2.ts
    │   │   │   ├── metadata/
    │   │   │   │   └── route.ts
    │   │   │   ├── newsletter/
    │   │   │   │   ├── utils.ts
    │   │   │   │   └── [blog]/
    │   │   │   │       ├── route.ts
    │   │   │   │       ├── campaign/
    │   │   │   │       │   └── route.ts
    │   │   │   │       ├── subscribe/
    │   │   │   │       │   └── route.ts
    │   │   │   │       └── subscribers/
    │   │   │   │           ├── route.ts
    │   │   │   │           └── all/
    │   │   │   │               └── route.ts
    │   │   │   ├── notifications/
    │   │   │   │   └── route.ts
    │   │   │   ├── posts/
    │   │   │   │   ├── route.ts
    │   │   │   │   └── slug/
    │   │   │   │       ├── route.ts
    │   │   │   │       ├── check/
    │   │   │   │       │   └── route.ts
    │   │   │   │       └── lookup/
    │   │   │   │           └── route.ts
    │   │   │   └── settings/
    │   │   │       └── route.ts
    │   │   ├── b/
    │   │   │   └── [blog]/
    │   │   │       ├── loading.tsx
    │   │   │       ├── page.tsx
    │   │   │       └── [slug]/
    │   │   │           └── page.tsx
    │   │   ├── bookmarks/
    │   │   │   └── page.tsx
    │   │   ├── chat/
    │   │   │   └── page.tsx
    │   │   ├── contests/
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx
    │   │   │   └── [week]/
    │   │   │       └── page.tsx
    │   │   ├── featured/
    │   │   │   └── page.tsx
    │   │   ├── home/
    │   │   │   ├── loading.tsx
    │   │   │   └── page.tsx
    │   │   ├── notifications/
    │   │   │   └── page.tsx
    │   │   ├── p/
    │   │   │   └── [user]/
    │   │   │       └── [post]/
    │   │   │           ├── layout.tsx
    │   │   │           ├── page.tsx
    │   │   │           └── template.tsx
    │   │   ├── policy/
    │   │   │   └── page.tsx
    │   │   ├── search/
    │   │   │   ├── loading.tsx
    │   │   │   └── page.tsx
    │   │   ├── send/
    │   │   │   └── page.tsx
    │   │   ├── settings/
    │   │   │   ├── layout.tsx
    │   │   │   ├── app/
    │   │   │   │   └── page.tsx
    │   │   │   ├── b/
    │   │   │   │   └── [blog]/
    │   │   │   │       └── page.tsx
    │   │   │   ├── blogs/
    │   │   │   │   └── page.tsx
    │   │   │   ├── newsletter/
    │   │   │   │   └── page.tsx
    │   │   │   └── profile/
    │   │   │       └── page.tsx
    │   │   ├── tos/
    │   │   │   └── page.tsx
    │   │   ├── u/
    │   │   │   └── [user]/
    │   │   │       ├── layout.tsx
    │   │   │       ├── loading.tsx
    │   │   │       ├── page.tsx
    │   │   │       ├── template.tsx
    │   │   │       ├── about/
    │   │   │       │   └── page.tsx
    │   │   │       ├── bookmarks/
    │   │   │       │   └── page.tsx
    │   │   │       └── drafts/
    │   │   │           └── page.tsx
    │   │   ├── w/
    │   │   │   └── [id]/
    │   │   │       └── page.tsx
    │   │   └── wrap/
    │   │       └── page.tsx
    │   ├── components/
    │   │   ├── admin/
    │   │   │   ├── admin-auth-check.tsx
    │   │   │   ├── admin-navigation.tsx
    │   │   │   ├── contest-create-modal.tsx
    │   │   │   └── feedback-detail-modal.tsx
    │   │   ├── auth/
    │   │   │   ├── account-select-button.tsx
    │   │   │   ├── account-select-menu.tsx
    │   │   │   ├── auth-manager.tsx
    │   │   │   ├── auth-wallet-button.tsx
    │   │   │   ├── onboarding-modal.tsx
    │   │   │   └── onboarding-profile-setup.tsx
    │   │   ├── blog/
    │   │   │   ├── blog-card.tsx
    │   │   │   ├── blog-create-modal.tsx
    │   │   │   ├── blog-dropdown-menu.tsx
    │   │   │   ├── blog-header.tsx
    │   │   │   ├── blog-newsletter-card.tsx
    │   │   │   ├── blog-read-more-section.tsx
    │   │   │   ├── blog-select-menu.tsx
    │   │   │   ├── blog-sync-button.tsx
    │   │   │   ├── blog-tag-navigation.tsx
    │   │   │   └── blog-theme.tsx
    │   │   ├── bookmark/
    │   │   │   └── bookmark-list.tsx
    │   │   ├── chat/
    │   │   │   ├── chat-user-info.tsx
    │   │   │   ├── embeddable-realtime-chat.tsx
    │   │   │   └── realtime-chat.tsx
    │   │   ├── comment/
    │   │   │   ├── comment-preview.tsx
    │   │   │   ├── comment-reactions.tsx
    │   │   │   ├── comment-reply-area.tsx
    │   │   │   ├── comment-sheet.tsx
    │   │   │   └── comment-view.tsx
    │   │   ├── draft/
    │   │   │   ├── draft-create-button.tsx
    │   │   │   ├── draft-import-dialog.tsx
    │   │   │   ├── draft-list.tsx
    │   │   │   ├── draft-menu.tsx
    │   │   │   ├── draft-share-modal.tsx
    │   │   │   ├── draft-view.tsx
    │   │   │   └── draft.ts
    │   │   ├── editor/
    │   │   │   ├── editor.tsx
    │   │   │   ├── elements.tsx
    │   │   │   ├── plugins.tsx
    │   │   │   ├── static.tsx
    │   │   │   ├── addons/
    │   │   │   │   ├── editor-autosave.tsx
    │   │   │   │   ├── editor-options-dropdown.tsx
    │   │   │   │   ├── editor-read-time.tsx
    │   │   │   │   └── foreign-content/
    │   │   │   │       └── editor-content-preview.tsx
    │   │   │   ├── plugins/
    │   │   │   │   ├── autoformat-rules.tsx
    │   │   │   │   ├── blockquote-normalize-plugin.ts
    │   │   │   │   ├── iframe-plugin.ts
    │   │   │   │   ├── leading-block-plugin.ts
    │   │   │   │   ├── normalize-plugin.ts
    │   │   │   │   └── title-plugin.ts
    │   │   │   └── transforms/
    │   │   │       └── insert-iframe.ts
    │   │   ├── feed/
    │   │   │   ├── feed-articles.tsx
    │   │   │   ├── feed-bookmarks.tsx
    │   │   │   ├── feed-curated.tsx
    │   │   │   ├── feed-favorites.tsx
    │   │   │   ├── feed-latest.tsx
    │   │   │   ├── feed-search.tsx
    │   │   │   ├── feed-view-toggle.tsx
    │   │   │   └── feed.tsx
    │   │   ├── icons/
    │   │   │   ├── bell.tsx
    │   │   │   ├── bug.tsx
    │   │   │   ├── custom-icons.tsx
    │   │   │   ├── home.tsx
    │   │   │   ├── landing-images.tsx
    │   │   │   ├── light-bulb.tsx
    │   │   │   ├── link.tsx
    │   │   │   ├── logout.tsx
    │   │   │   ├── menu.tsx
    │   │   │   ├── message-circle.tsx
    │   │   │   ├── message-more.tsx
    │   │   │   ├── moon.tsx
    │   │   │   ├── pen-tool.tsx
    │   │   │   ├── settings.tsx
    │   │   │   ├── square-pen.tsx
    │   │   │   ├── sun.tsx
    │   │   │   ├── switch-profile.tsx
    │   │   │   ├── table-icons.tsx
    │   │   │   └── user.tsx
    │   │   ├── misc/
    │   │   │   ├── date-label.tsx
    │   │   │   ├── email-subscription.tsx
    │   │   │   ├── error-page.tsx
    │   │   │   ├── evm-address.tsx
    │   │   │   ├── feedback-form.tsx
    │   │   │   ├── global-modals.tsx
    │   │   │   ├── image-uploader.tsx
    │   │   │   ├── landing-page.tsx
    │   │   │   ├── loading-spinner.tsx
    │   │   │   ├── markdown.tsx
    │   │   │   ├── smooth-scroll.tsx
    │   │   │   ├── truncated-text.tsx
    │   │   │   └── web3-providers.tsx
    │   │   ├── navigation/
    │   │   │   ├── animated-item.tsx
    │   │   │   ├── article-layout.tsx
    │   │   │   ├── feed-layout.tsx
    │   │   │   ├── feed-navigation.tsx
    │   │   │   ├── global-footer.tsx
    │   │   │   ├── gradient-blur.tsx
    │   │   │   ├── header-search.tsx
    │   │   │   ├── header.tsx
    │   │   │   ├── page-transition.tsx
    │   │   │   ├── search-layout.tsx
    │   │   │   └── tab-navigation.tsx
    │   │   ├── newsletter/
    │   │   │   ├── newsletter-create-button.tsx
    │   │   │   ├── newsletter-delete-dialog.tsx
    │   │   │   ├── newsletter-import-subscribers-modal.tsx
    │   │   │   ├── newsletter-subscribe-dialog.tsx
    │   │   │   ├── subscriber-data-table.tsx
    │   │   │   └── subscriber-management.tsx
    │   │   ├── notifications/
    │   │   │   ├── notification-button.tsx
    │   │   │   ├── notification-view.tsx
    │   │   │   ├── notifications-context.tsx
    │   │   │   └── notifications-feed.tsx
    │   │   ├── post/
    │   │   │   ├── post-action-button.tsx
    │   │   │   ├── post-actions-bar.tsx
    │   │   │   ├── post-article-feed.tsx
    │   │   │   ├── post-collect-dialog.tsx
    │   │   │   ├── post-comment-view.tsx
    │   │   │   ├── post-contest-wrapper.tsx
    │   │   │   ├── post-deleted-view.tsx
    │   │   │   ├── post-floating-actions-bar.tsx
    │   │   │   ├── post-menu.tsx
    │   │   │   ├── post-metadata.tsx
    │   │   │   ├── post-reactions.tsx
    │   │   │   ├── post-skeleton-boundary.tsx
    │   │   │   ├── post-skeleton.tsx
    │   │   │   ├── post-tags.tsx
    │   │   │   └── post-view.tsx
    │   │   ├── publish/
    │   │   │   ├── publish-details-tab.tsx
    │   │   │   ├── publish-dialog.tsx
    │   │   │   ├── publish-distribution-tab.tsx
    │   │   │   └── publish-monetization-tab.tsx
    │   │   ├── seo/
    │   │   │   └── structured-data.tsx
    │   │   ├── settings/
    │   │   │   ├── settings-app.tsx
    │   │   │   ├── settings-badge.tsx
    │   │   │   ├── settings-blog.tsx
    │   │   │   ├── settings-newsletter.tsx
    │   │   │   └── settings-profile.tsx
    │   │   ├── theme/
    │   │   │   ├── theme-buttons.tsx
    │   │   │   ├── theme-context.tsx
    │   │   │   └── theme-toggle.tsx
    │   │   ├── tip/
    │   │   │   └── tip-popover.tsx
    │   │   ├── token/
    │   │   │   ├── token-send-page.tsx
    │   │   │   ├── token-wrap-dialog.tsx
    │   │   │   └── token-wrap-page.tsx
    │   │   ├── ui/
    │   │   │   ├── accordion.tsx
    │   │   │   ├── ai-chat-editor.tsx
    │   │   │   ├── ai-leaf.tsx
    │   │   │   ├── ai-menu-items.tsx
    │   │   │   ├── ai-menu.tsx
    │   │   │   ├── ai-toolbar-button.tsx
    │   │   │   ├── alert-dialog.tsx
    │   │   │   ├── alert.tsx
    │   │   │   ├── align-dropdown-menu.tsx
    │   │   │   ├── animated-chevron.tsx
    │   │   │   ├── aspect-ratio.tsx
    │   │   │   ├── avatar.tsx
    │   │   │   ├── badge.tsx
    │   │   │   ├── block-context-menu.tsx
    │   │   │   ├── block-menu-items.tsx
    │   │   │   ├── block-menu.tsx
    │   │   │   ├── block-selection.tsx
    │   │   │   ├── blockquote-element.tsx
    │   │   │   ├── breadcrumb.tsx
    │   │   │   ├── button.tsx
    │   │   │   ├── calendar.tsx
    │   │   │   ├── caption.tsx
    │   │   │   ├── card.tsx
    │   │   │   ├── carousel.tsx
    │   │   │   ├── chart.tsx
    │   │   │   ├── checkbox.tsx
    │   │   │   ├── code-block-combobox.tsx
    │   │   │   ├── code-block-element.tsx
    │   │   │   ├── code-leaf.tsx
    │   │   │   ├── code-line-element.tsx
    │   │   │   ├── code-syntax-leaf.tsx
    │   │   │   ├── collapsible.tsx
    │   │   │   ├── color-constants.ts
    │   │   │   ├── color-dropdown-menu-items.tsx
    │   │   │   ├── color-dropdown-menu.tsx
    │   │   │   ├── color-input.tsx
    │   │   │   ├── color-picker.tsx
    │   │   │   ├── colors-custom.tsx
    │   │   │   ├── column-element.tsx
    │   │   │   ├── column-group-element.tsx
    │   │   │   ├── command.tsx
    │   │   │   ├── confirm-button.tsx
    │   │   │   ├── connection-badge.tsx
    │   │   │   ├── context-menu.tsx
    │   │   │   ├── cursor-overlay.tsx
    │   │   │   ├── date-element.tsx
    │   │   │   ├── dialog.tsx
    │   │   │   ├── draggable-insert-handler.tsx
    │   │   │   ├── draggable.tsx
    │   │   │   ├── drawer.tsx
    │   │   │   ├── dropdown-menu.tsx
    │   │   │   ├── editor.tsx
    │   │   │   ├── element-popover.tsx
    │   │   │   ├── emoji-dropdown-menu.tsx
    │   │   │   ├── emoji-icons.tsx
    │   │   │   ├── emoji-input-element.tsx
    │   │   │   ├── emoji-picker-content.tsx
    │   │   │   ├── emoji-picker-navigation.tsx
    │   │   │   ├── emoji-picker-preview.tsx
    │   │   │   ├── emoji-picker-search-and-clear.tsx
    │   │   │   ├── emoji-picker-search-bar.tsx
    │   │   │   ├── emoji-picker.tsx
    │   │   │   ├── emoji-toolbar-dropdown.tsx
    │   │   │   ├── equation-element.tsx
    │   │   │   ├── fixed-toolbar-buttons.tsx
    │   │   │   ├── fixed-toolbar.tsx
    │   │   │   ├── floating-toolbar-buttons.tsx
    │   │   │   ├── floating-toolbar.tsx
    │   │   │   ├── form.tsx
    │   │   │   ├── ghost-text.tsx
    │   │   │   ├── heading-element.tsx
    │   │   │   ├── highlight-leaf.tsx
    │   │   │   ├── hover-card.tsx
    │   │   │   ├── hr-element.tsx
    │   │   │   ├── iframe-element.tsx
    │   │   │   ├── image-element.tsx
    │   │   │   ├── image-preview.tsx
    │   │   │   ├── indent-list-toolbar-button.tsx
    │   │   │   ├── indent-todo-marker.tsx
    │   │   │   ├── indent-todo-toolbar-button.tsx
    │   │   │   ├── indent-toolbar-button.tsx
    │   │   │   ├── inline-combobox.tsx
    │   │   │   ├── inline-equation-element.tsx
    │   │   │   ├── inline-equation-toolbar-button.tsx
    │   │   │   ├── input-otp.tsx
    │   │   │   ├── input.tsx
    │   │   │   ├── insert-dropdown-menu.tsx
    │   │   │   ├── kbd-leaf.tsx
    │   │   │   ├── label.tsx
    │   │   │   ├── line-height-dropdown-menu.tsx
    │   │   │   ├── link-element.tsx
    │   │   │   ├── link-floating-toolbar.tsx
    │   │   │   ├── link-toolbar-button.tsx
    │   │   │   ├── list-element.tsx
    │   │   │   ├── list-item.tsx
    │   │   │   ├── list-toolbar-button.tsx
    │   │   │   ├── mark-toolbar-button.tsx
    │   │   │   ├── media-embed-element.tsx
    │   │   │   ├── media-placeholder-element.tsx
    │   │   │   ├── media-placeholder-popover.tsx
    │   │   │   ├── media-popover.tsx
    │   │   │   ├── media-toolbar-button.tsx
    │   │   │   ├── mention-element.tsx
    │   │   │   ├── mention-input-element.tsx
    │   │   │   ├── menu.tsx
    │   │   │   ├── menubar.tsx
    │   │   │   ├── metadata-display.tsx
    │   │   │   ├── mobile-popover.tsx
    │   │   │   ├── more-dropdown-menu.tsx
    │   │   │   ├── motion-highlight.tsx
    │   │   │   ├── navigation-menu.tsx
    │   │   │   ├── outdent-toolbar-button.tsx
    │   │   │   ├── pagination.tsx
    │   │   │   ├── paragraph-element.tsx
    │   │   │   ├── placeholder.tsx
    │   │   │   ├── popover.tsx
    │   │   │   ├── progress.tsx
    │   │   │   ├── radio-group.tsx
    │   │   │   ├── remote-cursor-overlay.tsx
    │   │   │   ├── resizable.tsx
    │   │   │   ├── resizeable-panel.tsx
    │   │   │   ├── save-badge.tsx
    │   │   │   ├── scroll-area.tsx
    │   │   │   ├── search-highlight-leaf.tsx
    │   │   │   ├── select.tsx
    │   │   │   ├── selection-overlay.tsx
    │   │   │   ├── separator.tsx
    │   │   │   ├── sheet.tsx
    │   │   │   ├── sidebar.tsx
    │   │   │   ├── skeleton.tsx
    │   │   │   ├── slash-input-element.tsx
    │   │   │   ├── slide-tabs.tsx
    │   │   │   ├── slider.tsx
    │   │   │   ├── sonner.tsx
    │   │   │   ├── subtitle-element.tsx
    │   │   │   ├── switch.tsx
    │   │   │   ├── table-cell-element.tsx
    │   │   │   ├── table-dropdown-menu.tsx
    │   │   │   ├── table-element.tsx
    │   │   │   ├── table-row-element.tsx
    │   │   │   ├── table.tsx
    │   │   │   ├── tabs.tsx
    │   │   │   ├── textarea.tsx
    │   │   │   ├── title-element.tsx
    │   │   │   ├── toast.tsx
    │   │   │   ├── toaster.tsx
    │   │   │   ├── toc-element.tsx
    │   │   │   ├── toc-sidebar.tsx
    │   │   │   ├── todo-list-element.tsx
    │   │   │   ├── toggle-element.tsx
    │   │   │   ├── toggle-group.tsx
    │   │   │   ├── toggle-toolbar-button.tsx
    │   │   │   ├── toggle.tsx
    │   │   │   ├── toolbar.tsx
    │   │   │   ├── tooltip.tsx
    │   │   │   ├── turn-into-dropdown-menu.tsx
    │   │   │   └── static/
    │   │   │       ├── blockquote-element-static.tsx
    │   │   │       ├── callout-element-static.tsx
    │   │   │       ├── checkbox-static.tsx
    │   │   │       ├── code-block-element-static.tsx
    │   │   │       ├── code-leaf-static.tsx
    │   │   │       ├── code-line-element-static.tsx
    │   │   │       ├── code-syntax-leaf-static.tsx
    │   │   │       ├── column-element-static.tsx
    │   │   │       ├── column-group-element-static.tsx
    │   │   │       ├── comment-leaf-static.tsx
    │   │   │       ├── date-element-static.tsx
    │   │   │       ├── editor-static.tsx
    │   │   │       ├── equation-element-static.tsx
    │   │   │       ├── heading-element-static.tsx
    │   │   │       ├── hr-element-static.tsx
    │   │   │       ├── image-element-static.tsx
    │   │   │       ├── indent-todo-marker-static.tsx
    │   │   │       ├── inline-equation-element-static.tsx
    │   │   │       ├── link-element-static.tsx
    │   │   │       ├── media-audio-element-static.tsx
    │   │   │       ├── media-file-element-static.tsx
    │   │   │       ├── media-video-element-static.tsx
    │   │   │       ├── mention-element-static.tsx
    │   │   │       ├── paragraph-element-static.tsx
    │   │   │       ├── table-cell-element-static.tsx
    │   │   │       ├── table-element-static.tsx
    │   │   │       ├── table-row-element-static.tsx
    │   │   │       ├── title-element-static.tsx
    │   │   │       ├── toc-element-static.tsx
    │   │   │       └── toggle-element-static.tsx
    │   │   └── user/
    │   │       ├── user-author-view.tsx
    │   │       ├── user-avatar.tsx
    │   │       ├── user-bio.tsx
    │   │       ├── user-blogs-list.tsx
    │   │       ├── user-card.tsx
    │   │       ├── user-cover.tsx
    │   │       ├── user-follow.tsx
    │   │       ├── user-following.tsx
    │   │       ├── user-handle.tsx
    │   │       ├── user-lazy-username.tsx
    │   │       ├── user-location.tsx
    │   │       ├── user-menu.tsx
    │   │       ├── user-name.tsx
    │   │       ├── user-navigation.tsx
    │   │       ├── user-post-card.tsx
    │   │       ├── user-search-list.tsx
    │   │       ├── user-search.tsx
    │   │       ├── user-site.tsx
    │   │       └── user-socials.tsx
    │   ├── contexts/
    │   │   ├── action-bar-context.tsx
    │   │   ├── feed-context.tsx
    │   │   └── post-actions-context.tsx
    │   ├── hooks/
    │   │   ├── use-admin-post-actions.ts
    │   │   ├── use-admin-status.ts
    │   │   ├── use-async-toasts.ts
    │   │   ├── use-at-bottom.ts
    │   │   ├── use-auto-scroll.ts
    │   │   ├── use-ban-filter.ts
    │   │   ├── use-blog-settings.ts
    │   │   ├── use-blog-storage.ts
    │   │   ├── use-bookmarks.ts
    │   │   ├── use-cached-account.ts
    │   │   ├── use-chat.ts
    │   │   ├── use-click-outside.ts
    │   │   ├── use-comments.ts
    │   │   ├── use-cookie-storage.ts
    │   │   ├── use-copy-to-clipboard.ts
    │   │   ├── use-debounce-callback.ts
    │   │   ├── use-debounce-pending-click.ts
    │   │   ├── use-debounce.ts
    │   │   ├── use-dimensions.ts
    │   │   ├── use-document-storage.ts
    │   │   ├── use-double-tap.ts
    │   │   ├── use-effect-after-first.ts
    │   │   ├── use-email.ts
    │   │   ├── use-enter-submit.ts
    │   │   ├── use-event-listener.ts
    │   │   ├── use-feed-view-mode.ts
    │   │   ├── use-filter-skills.ts
    │   │   ├── use-get-data.ts
    │   │   ├── use-get-window-height.ts
    │   │   ├── use-hover.ts
    │   │   ├── use-iframe-state.ts
    │   │   ├── use-image-preload.ts
    │   │   ├── use-infinite-feed.ts
    │   │   ├── use-initial-state.ts
    │   │   ├── use-intersection-observer.ts
    │   │   ├── use-is-touch-device.ts
    │   │   ├── use-is-touch.ts
    │   │   ├── use-isomorphic-layout-effect.ts
    │   │   ├── use-lens-clients.ts
    │   │   ├── use-local-storage.ts
    │   │   ├── use-lock-body.ts
    │   │   ├── use-lock-scroll.ts
    │   │   ├── use-long-press.ts
    │   │   ├── use-media-query.ts
    │   │   ├── use-mobile.tsx
    │   │   ├── use-mounted.ts
    │   │   ├── use-object-version.ts
    │   │   ├── use-on-click-outside.ts
    │   │   ├── use-on-screen.ts
    │   │   ├── use-origin.tsx
    │   │   ├── use-pipe-ref.ts
    │   │   ├── use-post-actions-buttons.tsx
    │   │   ├── use-post-actions.ts
    │   │   ├── use-publish-draft.ts
    │   │   ├── use-reconnect-wallet.ts
    │   │   ├── use-resizable-panel.ts
    │   │   ├── use-safe-memo.ts
    │   │   ├── use-save-profile-settings.ts
    │   │   ├── use-scroll-anchor.ts
    │   │   ├── use-scroll-direction.ts
    │   │   ├── use-scroll.ts
    │   │   ├── use-scrolled.ts
    │   │   ├── use-selection.tsx
    │   │   ├── use-settings.ts
    │   │   ├── use-sidebar.tsx
    │   │   ├── use-storage.ts
    │   │   ├── use-sync-value-effect.ts
    │   │   ├── use-tailwind.tsx
    │   │   ├── use-toast.ts
    │   │   ├── use-unmount.ts
    │   │   ├── use-upload-file.ts
    │   │   ├── use-viewport.ts
    │   │   └── use-yjs-state.ts
    │   ├── lib/
    │   │   ├── css-examples.ts
    │   │   ├── environment.ts
    │   │   ├── extract-metadata.ts
    │   │   ├── extract-subtitle.ts
    │   │   ├── get-arweave-content.ts
    │   │   ├── get-base-url.ts
    │   │   ├── get-random-uid.ts
    │   │   ├── get-share-url.ts
    │   │   ├── global-window.ts
    │   │   ├── licenses.ts
    │   │   ├── load-embed-js.tsx
    │   │   ├── transforms.ts
    │   │   ├── utils.ts
    │   │   ├── auth/
    │   │   │   ├── admin-middleware.ts
    │   │   │   ├── app-token.ts
    │   │   │   ├── clear-cookies.ts
    │   │   │   ├── get-app-token.ts
    │   │   │   ├── get-session.ts
    │   │   │   ├── get-token-claims.ts
    │   │   │   ├── get-user-profile.ts
    │   │   │   ├── is-admin.ts
    │   │   │   ├── is-guest-user.ts
    │   │   │   ├── sign-app-token.ts
    │   │   │   ├── sign-guest-token.ts
    │   │   │   ├── validate-token.ts
    │   │   │   ├── verify-auth-request.ts
    │   │   │   └── verify-token.ts
    │   │   ├── db/
    │   │   │   ├── client.ts
    │   │   │   ├── database.ts
    │   │   │   ├── middleware.ts
    │   │   │   ├── server.ts
    │   │   │   └── service.ts
    │   │   ├── lens/
    │   │   │   ├── app.ts
    │   │   │   ├── client.ts
    │   │   │   ├── storage-client.ts
    │   │   │   └── storage.ts
    │   │   ├── listmonk/
    │   │   │   ├── client.ts
    │   │   │   └── newsletter.ts
    │   │   ├── plate/
    │   │   │   ├── create-draft.ts
    │   │   │   ├── create-html-draft.ts
    │   │   │   ├── default-content.ts
    │   │   │   ├── plate-types.ts
    │   │   │   └── trim-empty-nodes.ts
    │   │   ├── publish/
    │   │   │   ├── create-newsletter-campaign.ts
    │   │   │   ├── create-post-record.ts
    │   │   │   ├── delete-cloud-draft.ts
    │   │   │   ├── get-feed-address.ts
    │   │   │   ├── get-post-actions.ts
    │   │   │   ├── get-post-attributes.ts
    │   │   │   ├── get-post-content.ts
    │   │   │   ├── publish-post-edit.ts
    │   │   │   └── publish-post.ts
    │   │   ├── scripts/
    │   │   │   ├── db-backup.ts
    │   │   │   ├── db-generate-types.ts
    │   │   │   ├── db-reset-local.ts
    │   │   │   ├── db-restore.ts
    │   │   │   ├── db-test-connection.ts
    │   │   │   └── get-articles-gql.js
    │   │   ├── seo/
    │   │   │   ├── canonical.ts
    │   │   │   ├── constants.ts
    │   │   │   ├── metadata.ts
    │   │   │   └── structured-data.ts
    │   │   ├── settings/
    │   │   │   ├── events.ts
    │   │   │   ├── get-blog-data.ts
    │   │   │   ├── get-blogs-by-owner.ts
    │   │   │   ├── get-user-email.ts
    │   │   │   ├── get-user-settings.ts
    │   │   │   └── user-settings.ts
    │   │   ├── slug/
    │   │   │   ├── check-slug-availability.ts
    │   │   │   └── get-post-by-slug.ts
    │   │   ├── upload/
    │   │   │   └── upload-file.ts
    │   │   └── utils/
    │   │       ├── ban-filter.ts
    │   │       ├── fetch-curated-posts.ts
    │   │       ├── find-blog-by-id.ts
    │   │       ├── get-post-url.ts
    │   │       ├── image-optimization.ts
    │   │       ├── is-evm-address.ts
    │   │       └── resolve-url.ts
    │   ├── srv/
    │   │   ├── collaboration.ts
    │   │   └── notifications/
    │   │       ├── README.md
    │   │       ├── server.ts
    │   │       └── types.ts
    │   ├── stores/
    │   │   ├── account-cache-store.ts
    │   │   └── ui-store.ts
    │   └── styles/
    │       ├── article.css
    │       ├── globals.css
    │       ├── google-fonts.ts
    │       ├── prose.ts
    │       ├── themes.ts
    │       └── walletconnect.ts
    ├── supabase/
    │   ├── config.toml
    │   └── migrations/
    │       ├── 20250607083909_remote_schema.sql
    │       ├── 20250607090724_remote_schema.sql
    │       ├── 20250607150729_add_comprehensive_rls_policies.sql
    │       ├── 20250607151037_cleanup_duplicate_policies.sql
    │       ├── 20250607154500_fix_ownership_and_add_rls_admin.sql
    │       ├── 20250607155500_remaining_rls_policies.sql
    │       ├── 20250607180000_add_admin_rls_policies.sql
    │       ├── 20250607180001_fix_admin_function_security.sql
    │       ├── 20250607204827_chat_messages.sql
    │       ├── 20250607205729_fix_chat_rls_policies.sql
    │       ├── 20250607212538_ensure_chat_realtime.sql
    │       └── 20250607220000_add_contests.sql
    └── .github/
        └── ISSUE_TEMPLATE/
            ├── bug.md
            └── feature.md
