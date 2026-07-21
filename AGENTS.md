# AGENTS.md

Penbot: Manifest V3 browser extension using DeepSeek directly.

## Workspaces

- `extension/` — browser extension (React 19, @crxjs/vite-plugin, Vite)
- Root `package.json` has npm workspaces `["extension"]`

## Commands

```bash
npm install                          # install all workspaces
npm run dev:extension                # vite dev server

# Quality checks
npm run format:check                 # prettier --check
npm run lint                         # eslint --max-warnings=0
npm run typecheck                    # tsc --noEmit
npm test                             # vitest run (all tests)
npm run test:integration             # vitest run extension/src/content/selection/selection.test.ts

npm run build                        # builds extension
```

### Run a single test file

```bash
npx vitest run path/to/test.ts
```

## Environment

DeepSeek API key is configured in extension settings, stored in browser storage.

## Architecture constraints

- **Selection text only.** Only user-selected text in editable fields is captured. Password/payment/security fields are rejected (see `isRestrictedField`).
- **Plain text output only.** AI responses are inserted via text nodes or React text values — never `innerHTML`.
- **Shadow DOM isolation.** The extension toolbar UI renders in a shadow DOM (content script) to avoid page style conflicts.

## Testing

- **All tests mock DeepSeek** — no real API calls.
- DOM tests must have `// @vitest-environment jsdom` at line 1 of the file.
- Test files: `extension/src/**/*.test.ts(x)` (3 files: `selection.test.ts`, `FloatingAssistant.test.tsx`, `shared.test.ts`).
- No vitest config file — uses default conventions.
- Tests mock browser globals (`chrome.*`) with `vi.stubGlobal` — no shared setup file, each test file is self-sufficient.
- React component tests also stub `requestAnimationFrame`, `cancelAnimationFrame`, and `IS_REACT_ACT_ENVIRONMENT`.

## Manual testing

`test-extension.html` provides pre-seeded input, textarea, and contenteditable elements for manual smoke testing.

## TypeScript

- Strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `useUnknownInCatchVariables`.
- `consistent-type-imports` enforced (use `import type` for type-only imports).
- Extension: `Bundler` resolution, `react-jsx`, `allowImportingTsExtensions`.

## Linting

- `@typescript-eslint/no-misused-promises` with `checksVoidReturn: false`.
- Unsafe-* rules relaxed for test files.
- React hooks plugin enabled for `extension/src/**`.

## Formatting

- `prettier --check .` with: semicolons, single quotes, trailing commas (`all`).
