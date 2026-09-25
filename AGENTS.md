# opencode-usage

## Work and verify

- Run `npm ci` here for standalone development; this package owns its lockfile and scripts. Use `npm run typecheck` and `npm test`. The parent `~/.config/opencode` scripts `typecheck:usage` and `test:usage` also work for the local installation.
- For one test file here: `./node_modules/.bin/tsx --test test/openai.test.ts` (replace the filename).
- TypeScript uses bundler resolution with `noEmit`; keep `.js` extensions on relative imports from `.ts`/`.tsx` files.

## Plugin wiring

- Parent `opencode.jsonc` loads `./plugins/opencode-usage`; `package.json` exports `./server` and `./tui` separately. `src/server.ts` registers the `usage` tool; `src/tui.tsx` registers the `/usage` palette command and renders `src/usage-dialog.tsx`. Keep both entrypoints aligned when changing behavior.
- `src/service.ts` handles caching/deduplication and selects adapters. Only OpenAI is implemented (`src/adapters/openai.ts`); adding a provider requires an adapter, not just a display label.
- OpenAI usage requires a ChatGPT OAuth connection, not an API key. `src/auth/opencode.ts` reads `OPENCODE_AUTH_CONTENT` or `${XDG_DATA_HOME:-~/.local/share}/opencode/auth.json`; tests inject fake credentials and requests, so no live account or service is needed.
- After changing plugin/config-time files, restart OpenCode to load the changes.
