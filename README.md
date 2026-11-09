# Async Generators

A quick dive into asynchronous iterators &amp; generators.

## Development

```bash
pnpm install
pnpm run dev       # watch main.ts
pnpm test          # node:test
pnpm run typecheck # tsc --noEmit
pnpm run lint      # oxlint
pnpm run fmt       # oxfmt
```

Requires Node.js 23.6+ (runs TypeScript directly via Node's built-in type stripping — no build step). TypeScript sources are restricted to [erasable syntax](https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly) only.
