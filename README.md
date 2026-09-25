# opencode-usage

An OpenCode plugin that shows account usage limits in a `usage` tool and a `/usage` TUI dialog. It currently supports OpenAI ChatGPT OAuth accounts only; API keys and other providers do not expose usage through this adapter.

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

GitHub is enough to share this plugin: publish this repository, then users can follow **Install from source** above. npm is an optional package registry for a later one-line OpenCode config entry; it is not required for the GitHub install or for local development.

The package remains `private` because the npm name `opencode-usage` is already in use. Before an npm release, choose an available name (for example, a scope you own) and license, and verify that installing the package loads both the tool and `/usage`. Do not commit OAuth credentials or the parent OpenCode configuration.
