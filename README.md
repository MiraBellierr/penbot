# Penbot

Penbot is a Manifest V3 browser extension that transforms only text a user explicitly selects inside an editable field. It provides Grammar, Standard, Fluent, Formal, Answer, and Translate actions through a compact Shadow DOM toolbar. All AI work is performed by a separate Node.js backend using DeepSeek-V4-Flash; the DeepSeek API key never enters the extension bundle.

## Features

- Exact selection replacement for text/search inputs, textareas, and contenteditable editors
- Grammar correction and standard, fluent, or formal rewriting
- Answer mode with Copy Reply and Insert Reply (no default overwrite)
- Translation with source detection/manual selection, romanization, and an English rendering
- Editable previews, explicit confirmation, cancellation, regeneration, and previous/next variation navigation
- Native `beforeinput`, `input`, and `change` events for compatibility with controlled inputs
- Changed-selection checks before any mutation
- Automatic toolbar, context-menu actions, and `Alt+Shift+P` command
- Searchable language inputs and persisted target-language preference
- System/light/dark themes and a responsive, style-isolated UI
- Safe cancellation, request timeout, rate limiting, CORS allowlisting, and validated request/response envelopes

## Screenshots

> Screenshot placeholder: floating action toolbar beside a textarea selection.

> Screenshot placeholder: Japanese translation preview with romanization and English text.

> Screenshot placeholder: Penbot settings page.

## Architecture

```text
Editable selection
  -> content SelectionManager
     -> InputSelectionAdapter or ContentEditableSelectionAdapter
  -> isolated React toolbar/preview
  -> validated runtime message
  -> MV3 background service worker
  -> POST {BACKEND_URL}/api/transform
  -> Express validation/rate limit/timeout layer
  -> TransformPromptBuilder
  -> DeepSeekService (OpenAI-compatible SDK)
  -> https://api.deepseek.com/chat/completions
```

The content script retains a live selection snapshot only in page memory. It sends the selected string and chosen options to the background worker only after the user chooses an action. The worker calls the configured backend. The backend validates the request, constructs a hardened prompt, calls `deepseek-v4-flash`, validates the output, and returns plain text/structured translation fields. Generated content is assigned through React text values or DOM text nodes—never `innerHTML`.

The extension and server are separate npm workspaces:

- `extension/src/content`: selection adapters and Shadow DOM React interface
- `extension/src/background`: context menus, command handling, backend transport, timeout/cancellation
- `extension/src/options` and `extension/src/popup`: settings and browser-action surfaces
- `extension/src/shared`: settings, language data, message validation, request construction, positioning
- `server/src/services`: DeepSeek transport and central prompt construction
- `server/src/schemas`: Zod input and translation-output validation
- `server/src/controllers`, `routes`, and `middleware`: HTTP boundary and operational controls

## Prerequisites and installation

- Node.js 20 or newer
- npm 10 or newer
- A DeepSeek API key for actual transformations

```bash
npm install
```

Create an API key in the DeepSeek platform console under API Keys. Copy the environment template into the server workspace and replace only the placeholder value:

```powershell
Copy-Item .env.example server/.env
```

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_ENABLE_THINKING_FOR_ANSWERS=false
PORT=8787
ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID
REQUEST_TIMEOUT_MS=30000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60
```

The model setting is configurable for deployment, but this project deliberately defaults to and presents `deepseek-v4-flash`. Deprecated DeepSeek model names are not used.

## Development

Start the backend and extension watcher in separate terminals:

```bash
npm run dev:server
npm run dev:extension
```

The default backend URL in extension settings is `http://localhost:8787`. For a remote backend, enter its HTTPS origin in Settings. The browser will request optional host permission for that origin. Update `ALLOWED_ORIGINS` on the server to the installed extension origin, comma-separating multiple Chrome/Edge/Brave/Firefox development IDs when needed.

Build both deployables:

```bash
npm run build
```

Outputs:

- `extension/dist`: unpacked browser extension
- `server/dist`: compiled backend

Run the compiled server with `npm run start -w server`.

## Loading the extension

### Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select `extension/dist`.
4. Copy the extension ID into the backend `ALLOWED_ORIGINS` value as `chrome-extension://ID`, restart the backend, and save the backend URL in Penbot Settings.

### Edge

Open `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/dist`. Edge uses a `chrome-extension://` origin for the CORS allowlist.

### Brave

Open `brave://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/dist`. Brave also uses a `chrome-extension://` origin.

### Firefox

Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `extension/dist/manifest.json`. Add the displayed `moz-extension://` origin to `ALLOWED_ORIGINS`. Temporary add-ons are removed when Firefox restarts; signed distribution is required for permanent normal installation.

## DeepSeek integration

The backend uses the `openai` Node SDK solely as the transport for DeepSeek's OpenAI-compatible Chat Completions API:

```text
POST https://api.deepseek.com/chat/completions
model: deepseek-v4-flash
```

Thinking is explicitly disabled for every normal request to reduce latency. Setting `DEEPSEEK_ENABLE_THINKING_FOR_ANSWERS=true` enables it only for Answer requests with high reasoning effort. Even then, the backend returns only final `message.content`; reasoning content is neither read nor exposed.

Translation requests use JSON response mode. The parsed object must exactly match the translation Zod schema before it can reach the browser. All other responses must be non-empty strings.

Never place `DEEPSEEK_API_KEY` in `manifest.ts`, Vite environment variables, extension storage, frontend code, or a browser request. Browser extensions are distributed client code and cannot keep secrets. In production, terminate HTTPS at a reverse proxy, restrict CORS to known extension origins, retain rate limits, and add deployment-level client authentication if the backend is not otherwise private.

## Quality checks and testing

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

Tests mock the DeepSeek transport and never make paid calls. They cover provider settings, thinking modes, every prompt, injection resistance, translation parsing, empty/invalid output, cancellation, rate limiting, request validation, exact selection replacement, rich-text formatting preservation, multiline content, selection restoration, Answer insertion, native event dispatch, storage, regeneration history, response validation, restricted fields, and popup positioning.

An intentionally skipped live DeepSeek check can be enabled explicitly (this makes a paid API request):

```powershell
$env:RUN_DEEPSEEK_INTEGRATION_TESTS='true'
npm test -- server/test/deepseek.integration.test.ts
```

It uses environment configuration and calls DeepSeek only when explicitly enabled. The normal unit and integration suites remain fully mocked.

## How replacement works

For an input or textarea, the adapter stores the original value and exact selection offsets. Before applying, it verifies the value and selected substring are unchanged, uses the element prototype's native value setter, emits editing events, and moves the caret to the inserted text's end.

For contenteditable, the adapter clones the DOM `Range`, verifies its text and root are still connected, deletes only the range contents, inserts a plain text node, preserves surrounding nodes and inline formatting, emits editing events, and positions the caret after the new node. Cancel and Escape restore the saved selection where safe.

## Keyboard shortcuts

The default is `Alt+Shift+P`. Change it at:

- Chrome/Brave: `chrome://extensions/shortcuts`
- Edge: `edge://extensions/shortcuts`
- Firefox: **Add-ons and themes → Manage Extension Shortcuts**

## Privacy and security

- Only explicitly selected text is processed; no page body, browsing history, or surrounding context is collected.
- No transformation runs until the user chooses an action.
- Password, payment-card, security-code, and one-time-code fields are rejected.
- Live DOM nodes and selections stay in page memory and are never written to browser storage.
- Runtime messages are accepted only from this extension and validated at both browser and server boundaries.
- AI output is treated as plain text, and selected text is delimited as untrusted prompt content.
- The server does not log full selected text, generated private text, authorization headers, upstream responses, or keys.
- Errors omit upstream bodies, stack traces, prompts, and credentials.

## Known limitations

- Browsers prohibit content scripts on internal pages, extension stores, PDF viewers, and some privileged documents.
- Input controls do not expose a DOM range for selected glyphs, so the toolbar is positioned near the control rather than the exact character bounding box. Contenteditable selections use their precise range rectangle.
- Highly customized editors that replace their DOM during preview, use cross-origin iframes, canvas rendering, or closed Shadow DOM may not expose a safely replaceable selection. Penbot refuses to mutate when it cannot verify the snapshot.
- `beforeinput` cancellation is respected; a site can intentionally block replacement.
- Rich-text selection spanning complex block structures is inserted as plain text to prevent HTML injection. Unrelated surrounding formatting is preserved, but the replacement itself does not synthesize rich formatting.
- Firefox may require a browser-specific packaging/signing step for store distribution even though temporary MV3 loading is supported.

## Browser compatibility

The source uses standard Manifest V3 APIs available in current Chrome, Edge, and Brave, plus the compatible `chrome` namespace exposed by current Firefox. Optional host permissions are requested only for a user-configured remote backend. Always test store builds against each target browser's current manifest validator before publishing.
