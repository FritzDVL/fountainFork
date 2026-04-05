# Core Lesson: How the App Already Solves It

## The Rule

Before building ANY new feature, ask:
**"Does Fountain already do something similar? How does it work?"**

Trace the existing code path. Reuse the same functions, patterns, and
plugins. Don't reinvent what's already working.

## Why This Matters

We're building on a Fountain.ink fork. The MAIN REASON to use this
codebase is to repurpose it. Every feature we need has a parallel in
Fountain:

| We need | Fountain already does |
|---|---|
| Publish a thread | Publishes articles (`publish-post.ts`) |
| Serialize to markdown | Autosave does it (`editor-autosave.tsx` line 37) |
| Upload to Grove | `storageClient.uploadAsJson()` |
| Build metadata | `article()` + `getPostAttributes()` |
| Get user info | `getUserAccount()` |
| Render content readOnly | `<Editor readOnly value={json} />` |
| Rich text editing | `getEditorPlugins()` + `getRichElements()` |

## What Went Wrong in Phase 6

We needed markdown serialization for the Lens `content` field.

**Wrong approach:** Tried to build it ourselves, passed empty string,
Lens rejected it.

**Right approach:** Looked at how Fountain's autosave already does it:
```ts
// From editor-autosave.tsx line 37
const { api } = useEditorPlugin(MarkdownPlugin);
const contentMarkdown = api.markdown.serialize({ value: editor.children });
```

This was already working in the codebase. We just needed to use it.

## The Checklist (Use Before Every Phase)

Before writing new code for any feature:

1. **Search the codebase** for similar functionality
   ```bash
   grep -r "keyword" src/ --include="*.ts" --include="*.tsx"
   ```

2. **Trace the existing code path** — follow the function calls from
   UI → service → API → database

3. **Identify what to reuse** — same functions, same patterns, same imports

4. **Identify what to change** — only the parts specific to the forum
   (different feed address, different Supabase table, different UI wrapper)

5. **Build the minimum new code** — the delta between Fountain's flow
   and what the forum needs

## Examples of Future Reuse

| Phase | Fountain feature to study |
|---|---|
| Phase 7 (Voting) | `post-reactions.tsx` — how Fountain handles Lens reactions |
| Phase 7 (Moderation) | `admin/` pages — how Fountain checks admin status |
| Phase 8 (Research) | `feed-*.tsx` — how Fountain filters and displays feeds |
| Phase 9 (Recovery) | `get-arweave-content.ts` — how Fountain fetches content |
| Phase 10 (Deploy) | `next.config.js` — how Fountain configures production builds |
