# opencode-usage

An OpenCode TUI plugin that shows account usage limits in a `/usage` dialog. It currently supports OpenAI ChatGPT OAuth accounts only; API keys and other providers do not expose usage through this adapter. Version 0.2.0 removes the model-callable `usage` tool.

## Install from npm

With OpenCode 1.18.25 or newer (1.x), add `"opencode-slash-usage"` to the singular `plugin` array in `~/.config/opencode/tui.json`. OpenCode installs the package automatically. Connect OpenAI with `/connect`, restart OpenCode, then run `/usage`.

If you installed from source previously, replace the local path entry instead of listing both. Do not load both copies, or OpenCode may register the plugin twice.

## Install from source

Requires OpenCode 1.18.25 or newer (1.x) with TUI plugin support and Node.js/npm for installing dependencies.

```sh
mkdir -p ~/src/opencode-plugins
git clone https://github.com/edwardEsmerson/opencode-usage.git ~/src/opencode-plugins/opencode-usage
cd ~/src/opencode-plugins/opencode-usage
npm ci
```

Add the absolute path to this checkout to the singular `plugin` array in `~/.config/opencode/tui.json`. For example, use `"/home/solan/src/opencode-plugins/opencode-usage"` for this checkout. Connect OpenAI using `/connect` with a ChatGPT OAuth account, then restart OpenCode. Use `/usage` to open the dialog. The limits are reported by OpenAI and may be shared across models.

## Plugin API compatibility

The v2 plugin API is separate from the OpenCode application version. This package pins `@opencode-ai/plugin` to 1.18.25 and supports OpenCode `>=1.18.25 <2`.

- The package root `src/index.ts` uses `define({ id, setup })` from `@opencode-ai/plugin/v2/promise`. Its setup is a no-op because all usage functionality runs in the TUI.
- `./tui` uses `@opencode-ai/plugin/tui` and registers `/usage`. The SDK has no v2 TUI API. Loading this entrypoint through `tui.json` is required to use the dialog.
- `./server` is a legacy no-op compatibility entrypoint. Existing entries in the singular `plugin` array in `opencode.jsonc` or `opencode.json` still load, but register no tools and can be removed.

Optional v2 loading uses the plural `plugins` array in `opencode.jsonc` or `opencode.json`. For npm, use `"opencode-slash-usage"`. For local development, use the absolute path to `src/index.ts`, such as `"/home/solan/src/opencode-plugins/opencode-usage/src/index.ts"`, not the checkout directory. The [OpenCode 1.18.25 v2 loader](https://github.com/anomalyco/opencode/blob/v1.18.25/packages/core/src/config/plugin/external.ts) imports local paths directly and accepts the Promise plugin's default `id`/`setup` object. This optional no-op registration does not replace TUI installation.

The package exports TypeScript source directly; no build step is required. Quit and restart OpenCode after changing plugin source or loading configuration.

## Develop

```sh
npm ci
npm run typecheck
npm test
```

The tests use fake credentials and responses; they do not call a live account. Entrypoint tests import the package root, `./server`, and `./tui` exports and mock the TUI API. `src/tui.tsx` registers the palette command, and `src/service.ts` selects adapters and caches requests. The OpenAI adapter lives in `src/adapters/openai.ts`.

## Distribution

GitHub hosts the source, and npm distributes it as [`opencode-slash-usage`](https://www.npmjs.com/package/opencode-slash-usage). The similarly named `opencode-usage` package belongs to another project. This plugin is licensed under MIT; do not commit OAuth credentials or the parent OpenCode configuration.
