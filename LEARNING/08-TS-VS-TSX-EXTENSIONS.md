# File Extensions: .ts vs .tsx

## Rule

Any file that contains JSX (HTML-like tags in code) MUST use `.tsx` extension.
Files with only pure TypeScript (no tags) use `.ts`.

## Example

```ts
// ❌ WRONG — this is use-composer.ts but has JSX
return (
  <ComposerContext.Provider value={...}>
    {children}
  </ComposerContext.Provider>
);
// Error: Expected '>', got 'value'

// ✅ RIGHT — rename to use-composer.tsx
// Same code, just different file extension
```

## How to tell if you need .tsx

If the file has any `<Component>` or `<div>` or `<span>` tags → `.tsx`
If it's only functions, types, constants, no tags → `.ts`

## What happened

`src/hooks/forum/use-composer.ts` contained a React context provider
with JSX. Next.js compiler rejected it because `.ts` files don't
support JSX syntax. Renaming to `.tsx` fixed it instantly.
