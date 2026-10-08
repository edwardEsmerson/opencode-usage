# opencode-usage

## Work and verify

- Run `npm ci` here for standalone development; this package owns its lockfile and scripts. Use `npm run typecheck` and `npm test`. The parent `~/.config/opencode` scripts `typecheck:usage` and `test:usage` also work for the local checkout in `~/src/opencode-plugins/opencode-usage`.
- For one test file here: `./node_modules/.bin/tsx --test test/openai.test.ts` (replace the filename).
- TypeScript uses bundler resolution with `noEmit`; keep `.js` extensions on relative imports from `.ts`/`.tsx` files.

## Plugin wiring

- Parent `tui.json` loads this local checkout through its singular `plugin` array. `src/tui.tsx` registers the `/usage` palette command and renders `src/usage-dialog.tsx`; there is no model-callable tool. `package.json` exports the v2 Promise no-op root `src/index.ts`, `./tui`, and the legacy no-op `./server`. Existing singular `plugin` entries in parent `opencode.jsonc` remain compatible but are unnecessary. Optional v2 plural `plugins` entries must point to `src/index.ts` for local loading, not the checkout directory.
- `src/service.ts` handles caching/deduplication and selects adapters. Only OpenAI is implemented (`src/adapters/openai.ts`); adding a provider requires an adapter, not just a display label.
- OpenAI usage requires a ChatGPT OAuth connection, not an API key. `src/auth/opencode.ts` reads `OPENCODE_AUTH_CONTENT` or `${XDG_DATA_HOME:-~/.local/share}/opencode/auth.json`; tests inject fake credentials and requests, so no live account or service is needed.
- After changing plugin/config-time files, restart OpenCode to load the changes.
