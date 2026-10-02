# opencode-usage

An OpenCode plugin that shows account usage limits in a `usage` tool and a `/usage` TUI dialog. It currently supports OpenAI ChatGPT OAuth accounts only; API keys and other providers do not expose usage through this adapter.

## Install from npm

With OpenCode 1.18.25 or newer (1.x), add `"opencode-slash-usage"` to the `plugin` array in `~/.config/opencode/opencode.jsonc` (or `opencode.json`). OpenCode installs the package automatically. Connect OpenAI with `/connect`, restart OpenCode, then run `/usage` or ask the assistant to use the `usage` tool.

If you installed from source previously, replace the local `"./plugins/opencode-usage"` entry instead of listing both. Also remove the local copy from `~/.config/opencode/plugins/` if it is being auto-discovered, to avoid loading the plugin twice.

## Install from source

Requires OpenCode with plugin server/TUI entrypoint support and Node.js/npm for installing dependencies. In your global OpenCode configuration:

```sh
git clone https://github.com/edwardEsmerson/opencode-usage.git ~/.config/opencode/plugins/opencode-usage
cd ~/.config/opencode/plugins/opencode-usage
npm ci
```

Add `"./plugins/opencode-usage"` to the `plugin` array in `~/.config/opencode/opencode.jsonc` (or `opencode.json`). Connect OpenAI using `/connect` with a ChatGPT OAuth account, then restart OpenCode. Use `/usage` to open the dialog or ask the assistant to call the `usage` tool. The limits are reported by OpenAI and may be shared across models.

## Develop

```sh
npm ci
npm run typecheck
npm test
```

The tests use fake credentials and responses; they do not call a live account. `src/server.ts` registers the tool, `src/tui.tsx` registers the palette command, and `src/service.ts` selects adapters and caches requests. The OpenAI adapter lives in `src/adapters/openai.ts`.

## Distribution

GitHub hosts the source, and npm distributes it as [`opencode-slash-usage`](https://www.npmjs.com/package/opencode-slash-usage). The similarly named `opencode-usage` package belongs to another project. This plugin is licensed under MIT; do not commit OAuth credentials or the parent OpenCode configuration.
