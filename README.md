# Penbot

Penbot is a Manifest V3 browser extension that transforms only text a user explicitly selects inside an editable field. It provides Grammar, Standard, Fluent, Formal, Answer, and Translate actions through a compact Shadow DOM toolbar. AI work uses the DeepSeek API directly from the extension background worker with the API key stored in extension settings.

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
- Safe cancellation, request timeout, and validated request/response envelopes

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
  -> DeepSeek API directly
  -> https://api.deepseek.com/chat/completions
```

The extension is an npm workspace:

- `extension/src/content`: selection adapters and Shadow DOM React interface
- `extension/src/background`: context menus, command handling, DeepSeek transport, timeout/cancellation
- `extension/src/options` and `extension/src/popup`: settings and browser-action surfaces
- `extension/src/shared`: settings, language data, message validation, request construction, positioning

## Prerequisites and installation

- Node.js 20 or newer
- npm 10 or newer
- A DeepSeek API key for actual transformations

```bash
npm install
```

Create an API key in the DeepSeek platform console under API Keys. Enter it in the extension options page (right-click the extension icon → Options).

## Development

Start the extension dev server:

```bash
npm run dev:extension
```

Build:

```bash
npm run build
```

Output: `extension/dist` — unpacked browser extension.

## Loading the extension

### Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select `extension/dist`.
4. Enter your DeepSeek API key in extension options.

### Edge

Open `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/dist`.

### Brave

Open `brave://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/dist`.

### Firefox

Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `extension/dist/manifest.json`.

## DeepSeek integration

The extension calls DeepSeek's OpenAI-compatible Chat Completions API directly from the background worker:

```text
POST https://api.deepseek.com/chat/completions
model: deepseek-v4-flash
```

Thinking is explicitly disabled for every normal request to reduce latency. It can be enabled in settings for Answer requests. Only the final `message.content` is used; reasoning content is neither read nor exposed.

Translation requests use JSON response mode. All other responses must be non-empty strings.

Store your API key in extension settings only.

## Quality checks and testing

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

Tests mock the DeepSeek transport and never make paid calls.

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
- Runtime messages are accepted only from this extension.
- AI output is treated as plain text, and selected text is delimited as untrusted prompt content.
- The extension does not log full selected text, generated private text, authorization headers, upstream responses, or keys.
- Errors omit upstream bodies, stack traces, prompts, and credentials.

## Known limitations

- Browsers prohibit content scripts on internal pages, extension stores, PDF viewers, and some privileged documents.
- Input controls do not expose a DOM range for selected glyphs, so the toolbar is positioned near the control rather than the exact character bounding box. Contenteditable selections use their precise range rectangle.
- Highly customized editors that replace their DOM during preview, use cross-origin iframes, canvas rendering, or closed Shadow DOM may not expose a safely replaceable selection. Penbot refuses to mutate when it cannot verify the snapshot.
- `beforeinput` cancellation is respected; a site can intentionally block replacement.
- Rich-text selection spanning complex block structures is inserted as plain text to prevent HTML injection. Unrelated surrounding formatting is preserved, but the replacement itself does not synthesize rich formatting.
- Firefox may require a browser-specific packaging/signing step for store distribution even though temporary MV3 loading is supported.

## Browser compatibility

The source uses standard Manifest V3 APIs available in current Chrome, Edge, and Brave, plus the compatible `chrome` namespace exposed by current Firefox. Always test store builds against each target browser's current manifest validator before publishing.
