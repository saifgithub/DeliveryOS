# CHUNK-02 — Webview foundation: Vite + React + Tailwind + CSP + messenger

**Status:** spec (Prompt 2 output, DOS:O3)
**Phase:** 0, Week 2 first half (2026-06-01)
**Effort:** 3–5 session-days
**Depends on:** [CHUNK-01](./chunk-01-extension-scaffold.md) (extension package + activity bar + tree view exist; `npm run package` produces a `.vsix`).
**Exposes contract to:** CHUNK-05, 06, 07, 08, 09, 10, 12, 13, 14 (every webview-bearing chunk).
**Source-of-truth refs:** [part-1-plan.md § CHUNK-02](../part-1-plan.md), [PRD § 25.2](../../PRD.md), [BUILD-PLAN Phase 0 Week 2](../../BUILD-PLAN.md), research findings #2 (deprecated webview-ui-toolkit) and #7 (Workspace Trust).

---

## 1. Restated goal and scope

### Goal

Convert the single-folder extension scaffold from CHUNK-01 into a **three-package monorepo** (`extension/`, `webview/`, `contracts/`) so React + Tailwind webviews can render inside DeliveryOS. Stand up the load-bearing webview plumbing — Vite build pipeline, HTML factory with CSP and nonce, `vscode-messenger` typed boundary, hybrid Tailwind theming, and `WebviewPanelSerializer` — and prove it end to end with a single throwaway **"hello" panel** that round-trips one typed message with the host.

The "hello" panel is **scaffolding, not a product surface**. Every later UI chunk (PRD editor, Brief composer, Requirements catalogue, etc.) will mount as a new `webview/src/panels/<feature>/` directory, plus a new slice in `contracts/`. This chunk's job is to make that incremental shape feel natural.

### In scope

- Restructure the repo into npm workspaces with `extension/`, `webview/`, `contracts/` packages and a thin root.
- Vite config producing a multi-entry build with per-panel hashed bundles + manifest.
- Tailwind v3 with **hybrid theming**: DeliveryOS palette in `theme.extend.colors` plus a small set of "anchor" tokens bound to VS Code CSS variables.
- HTML factory in the extension that reads `webview/dist/.vite/manifest.json`, generates a fresh nonce per panel open, rewrites asset URIs via `webview.asWebviewUri()`, and emits a CSP-locked HTML string.
- `vscode-messenger` wiring (host side via `Messenger` from `vscode-messenger`; webview side via `vscodeApi` + `vscode-messenger-webview`). One typed round-trip request: `getHelloText` → `"Hello DeliveryOS"` (with project name suffix).
- `WebviewPanelSerializer` registration so the "hello" panel survives `Developer: Reload Window`.
- `deliveryos.openHello` command (registered in `package.json`, wired in `extension/src/extension.ts`).
- `contracts/` package shape: discriminated-union message types organised one file per panel; a re-export barrel; exhaustiveness helper.

### Out of scope (deferred)

- **Radix UI** primitives. The "hello" panel uses plain HTML + Tailwind. Radix lands in CHUNK-05 with the first real product surface.
- **HMR / Vite dev server.** MVP runs a single `vite build`. Iteration cost on raw rebuild is acceptable at the planned pace; the wiring cost of dev mode (proxying the dev server through the webview CSP) is not. Revisit if it becomes a velocity blocker.
- Any specific DeliveryOS product surface (Discover panel, PRD editor, Brief composer, etc.).
- Memory store integration (CHUNK-03).
- Theme switching beyond what the hybrid anchoring provides automatically.
- Streaming / push messages from the extension. CHUNK-02 demonstrates request/response only; notification-style messages are unblocked by `vscode-messenger` and can be used later without re-architecting.

---

## 2. Monorepo structure

### Workspace manager: npm workspaces

**Pick npm workspaces over pnpm.** Justification:

1. **`vsce package` and the vscodeignore story is easier with npm.** `vsce` supports npm and yarn natively; pnpm requires the `--no-dependencies` flag and a flat-bundle dance because `vsce` walks `node_modules`. We pay this cost in CHUNK-04 (packaging) anyway; npm avoids a category of `vsce`/pnpm-symlink bugs.
2. **VS Code's official samples (`vscode-extension-samples`, the webview-vite samples we crib from) use npm.** Lower deviation cost when copy-pasting reference configs.
3. **No measured benefit from pnpm at this size.** Three packages, modest dep graph. Disk and install-time savings from pnpm's content-addressable store are real but not material here.
4. **CI workflow already assumes npm** (CHUNK-04's GitHub Actions runs `npm ci && npm run build && npm run package`).

The cost of npm is the duplicated `node_modules` if a dep is on the boundary of two packages. We accept this.

### File tree

```
/                                        repo root (existing from CHUNK-01)
├── .vscode/
│   ├── launch.json                      Extension Development Host launch config (UPDATED)
│   └── tasks.json                       npm-run-all task definitions (UPDATED)
├── .vscodeignore                        excludes webview/src/, contracts/src/, etc. from .vsix (UPDATED)
├── package.json                         root workspaces manifest (REWRITTEN)
├── package-lock.json                    npm lockfile (regenerated)
├── tsconfig.base.json                   shared compiler options (NEW)
├── README.md                            (UPDATED: monorepo layout note)
├── extension/                           NEW package: the Node-side extension host
│   ├── package.json                     "deliveryos" — the actual published extension name
│   ├── tsconfig.json                    extends ../tsconfig.base.json, outDir: dist
│   ├── src/
│   │   ├── extension.ts                 activate() / deactivate() (UPDATED from CHUNK-01)
│   │   ├── commands/
│   │   │   ├── openHello.ts             registers deliveryos.openHello
│   │   │   └── projectCreate.ts         (existing from CHUNK-01)
│   │   ├── webview/
│   │   │   ├── htmlFactory.ts           Vite-manifest → CSP'd HTML
│   │   │   ├── nonce.ts                 cryptographic nonce generator
│   │   │   ├── messenger.ts             host-side vscode-messenger setup + handlers
│   │   │   ├── panelManager.ts          createOrShow / dispose / track per-panel state
│   │   │   └── helloPanel.ts            opens the hello panel; registers its handlers
│   │   ├── serializers/
│   │   │   └── helloPanelSerializer.ts  WebviewPanelSerializer for hello
│   │   └── tree/
│   │       └── stagesTree.ts            (existing from CHUNK-01)
│   ├── resources/                       icons etc. (existing)
│   └── dist/                            tsc output (gitignored)
├── webview/                             NEW package: Vite + React + Tailwind app(s)
│   ├── package.json                     name: "@deliveryos/webview" (private, not published)
│   ├── tsconfig.json                    extends ../tsconfig.base.json + DOM lib
│   ├── tsconfig.node.json               for vite.config.ts itself
│   ├── vite.config.ts                   multi-entry build + manifest
│   ├── tailwind.config.ts               hybrid theming
│   ├── postcss.config.js                tailwindcss + autoprefixer
│   ├── index.html                       NOT served; placeholder so Vite is happy in dev (unused in MVP)
│   ├── src/
│   │   ├── shared/
│   │   │   ├── styles/
│   │   │   │   └── tailwind.css         @tailwind base / components / utilities + anchor CSS vars
│   │   │   ├── vscode.ts                acquireVsCodeApi() typed wrapper (singleton)
│   │   │   ├── messenger.ts             webview-side vscode-messenger client
│   │   │   └── ui/                      shared primitives (empty in MVP; Button etc. land in CHUNK-05)
│   │   └── panels/
│   │       └── hello/
│   │           ├── index.html           Vite HTML entry — only the per-panel scaffold
│   │           ├── main.tsx             React render bootstrap
│   │           └── HelloApp.tsx         the single React component
│   └── dist/                            Vite output (gitignored), but BUNDLED into .vsix
│       └── .vite/manifest.json          generated by Vite, read by htmlFactory
├── contracts/                           NEW package: shared types ONLY
│   ├── package.json                     name: "@deliveryos/contracts" (private)
│   ├── tsconfig.json                    composite, declaration-only, no runtime
│   ├── src/
│   │   ├── index.ts                     re-exports every panel's slice
│   │   ├── messages.ts                  base Request / Notification discriminator + helpers
│   │   └── panels/
│   │       └── hello.ts                 hello panel's message slice
│   └── dist/                            tsc --declaration output (.d.ts + .js shims)
└── scripts/
    └── build.mjs                        thin orchestrator: contracts → webview → extension
```

### Root `package.json` shape (sketch)

```jsonc
{
  "name": "deliveryos-root",
  "private": true,
  "workspaces": ["contracts", "webview", "extension"],
  "scripts": {
    "build": "node scripts/build.mjs",
    "build:contracts": "npm -w @deliveryos/contracts run build",
    "build:webview": "npm -w @deliveryos/webview run build",
    "build:extension": "npm -w deliveryos run build",
    "package": "npm run build && npm -w deliveryos run package",
    "clean": "rm -rf */dist */tsconfig.tsbuildinfo"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@vscode/vsce": "^3.0.0"
  }
}
```

The root has **no runtime deps**. Each workspace owns its own.

### Per-package responsibilities

- **`extension/`** publishes as the actual VSIX. The `name` field in `extension/package.json` is `deliveryos` (the marketplace identifier). All `contributes`, `activationEvents`, `capabilities` live here (carried over from CHUNK-01 + new entries for `deliveryos.openHello`).
- **`webview/`** is a private build-time artefact. It is NOT published as an npm package. Its `dist/` is what the extension ships.
- **`contracts/`** is **type-only**. Compiled with `tsc --declaration --emitDeclarationOnly` (or `composite: true` for project references). Both `extension/` and `webview/` declare a `"@deliveryos/contracts": "*"` workspace dependency. No runtime cost.

### `.vscodeignore` updates

Must include the published-extension layout, excluding source and test-time files:

```
src/**
**/*.ts
!extension/dist/**/*.js
!webview/dist/**
!contracts/dist/**/*.d.ts
node_modules/**
!node_modules/vscode-messenger/**
!node_modules/vscode-messenger-common/**
**/tsconfig*.json
**/.eslintrc*
**/vite.config.ts
**/tailwind.config.ts
**/postcss.config.js
.git/**
.github/**
docs/**
scripts/**
```

(Final form lands in CHUNK-04 alongside the `vsce package` smoke test.)

---

## 3. File-by-file breakdown

### 3.1 `contracts/`

#### `contracts/package.json`

```jsonc
{
  "name": "@deliveryos/contracts",
  "version": "0.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "watch": "tsc -p tsconfig.json --watch"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

#### `contracts/tsconfig.json`

```jsonc
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"]
  },
  "include": ["src/**/*"]
}
```

#### `contracts/src/messages.ts`

The base types every panel's slice imports. Defines what a `Request<Name, Params, Result>` is, what a `Notification<Name, Params>` is, and the helper `RequestType`/`NotificationType` constants `vscode-messenger` expects.

```ts
import type { RequestType, NotificationType } from "vscode-messenger-common";

/**
 * Convention: every request has a string discriminator `kind`, a `params` shape,
 * and a `result` shape. Notifications are fire-and-forget (no result).
 *
 * Each panel slice defines:
 *   - a string-literal union of its request names
 *   - a `RequestMap` mapping each name to { params; result }
 *   - exported RequestType<Params, Result> constants for use with the messenger
 */

export type DiscriminatedRequest<K extends string, P, R> = {
  kind: K;
  params: P;
  result: R;
};

/** Exhaustiveness helper — throws at compile time if a union member is missed. */
export const assertNever = (x: never): never => {
  throw new Error(`Unexpected discriminant: ${JSON.stringify(x)}`);
};

export type { RequestType, NotificationType };
```

#### `contracts/src/panels/hello.ts`

One file per panel — the canonical "where does this message live" answer. Adding a future panel means **add a new file under `panels/`**; never edit another panel's slice.

```ts
import { RequestType } from "vscode-messenger-common";

/* ── Request: getHelloText ─────────────────────────────── */
export interface GetHelloTextParams {
  /** Optional project name to suffix into the greeting. */
  projectName?: string;
}
export interface GetHelloTextResult {
  text: string;
  /** Server-side timestamp, for proving the round trip. */
  timestamp: number;
}
export const GetHelloText: RequestType<GetHelloTextParams, GetHelloTextResult> = {
  method: "hello/getHelloText",
};

/* ── Future: notifications, more requests, etc. ───────────
   Add new exports HERE. Never edit another panel's file.
   ──────────────────────────────────────────────────────── */
```

#### `contracts/src/index.ts`

```ts
export * from "./messages";
export * as Hello from "./panels/hello";
// Future: export * as Discover from "./panels/discover";
//         export * as Prd from "./panels/prd";
//         …one barrel re-export per panel.
```

The namespaced re-export (`export * as Hello`) is deliberate: each panel's identifiers (`GetHelloText`, `GetHelloTextParams`, etc.) are short and likely to collide across panels. Namespacing makes the consumer site read as `Hello.GetHelloText`, which is the same shape every later chunk uses.

---

### 3.2 `webview/`

#### `webview/package.json`

```jsonc
{
  "name": "@deliveryos/webview",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@deliveryos/contracts": "*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "vscode-messenger-webview": "^0.4.5",
    "vscode-messenger-common": "^0.4.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "typescript": "^5.5.0"
  }
}
```

Version pins are indicative — CHUNK-02 should lock them to whatever is current and stable on 2026-06-01.

#### `webview/vite.config.ts`

The load-bearing config. Multi-entry build with manifest, no HTML output (the extension's HTML factory replaces it), assets emitted under a flat per-panel layout that's easy for `localResourceRoots` to allow.

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  /**
   * Use `base: './'` so all generated asset URLs are relative; the host's
   * htmlFactory rewrites them to `webview.asWebviewUri()` form, but relative
   * paths in the manifest make that rewrite a string operation, not a URL parse.
   */
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    /**
     * Enable the manifest so the host can look up the hashed entry filenames
     * for each panel without scanning the directory.
     */
    manifest: ".vite/manifest.json",
    /**
     * One Rollup input per panel. CHUNK-05 etc. add their own entry here.
     */
    rollupOptions: {
      input: {
        hello: resolve(__dirname, "src/panels/hello/index.html"),
      },
      output: {
        /**
         * Group by panel so localResourceRoots can grant access to
         * `webview/dist/assets/<panel>/` per opened panel.
         * Each entry's chunk filenames carry the entry name as a prefix
         * for trivial human readability when debugging.
         */
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    /**
     * Disable sourcemaps for the .vsix; re-enable in CI if/when CHUNK-04
     * wires source uploads for crash diagnostics. For local debugging, run
     * `vite build --sourcemap` from the workspace.
     */
    sourcemap: false,
    target: "es2022",
    minify: "esbuild",
  },
});
```

#### `webview/tsconfig.json`

```jsonc
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../contracts" }]
}
```

#### `webview/tailwind.config.ts`

Hybrid theming. DeliveryOS palette in `theme.extend.colors`. A small set of **anchor tokens** that reference VS Code CSS variables for chrome-level elements.

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  /**
   * Disable dark-mode toggling; VS Code's CSS vars already track the host
   * theme. We anchor a small set of tokens; everything else is palette-based.
   */
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        /* ── DeliveryOS owned palette (independent of host theme) ── */
        dos: {
          ink: "#0F172A",        // primary text on light surfaces
          surface: "#FFFFFF",    // primary surface
          accent: "#6D5BD0",     // headline accent (matches activity-bar icon)
          danger: "#DC2626",     // forbidden-changes red
          success: "#16A34A",    // verification green
          warn: "#D97706",       // attention amber
          muted: "#64748B",      // secondary text
        },
        /* ── Anchor tokens (track host theme via CSS vars) ──
         * Used ONLY for chrome that should blend with the editor: panel
         * background, focus rings, divider borders. NEVER for primary
         * product surfaces (those use the dos.* palette).
         */
        vscode: {
          bg: "var(--vscode-editor-background)",
          fg: "var(--vscode-editor-foreground)",
          panel: "var(--vscode-sideBar-background)",
          border: "var(--vscode-panel-border)",
          focusBorder: "var(--vscode-focusBorder)",
          inputBorder: "var(--vscode-input-border)",
          inputBg: "var(--vscode-input-background)",
          inputFg: "var(--vscode-input-foreground)",
        },
      },
      fontFamily: {
        /**
         * Anchor body font to the editor's font so webview text doesn't look
         * alien next to native UI. Display fonts (headings) can opt out.
         */
        sans: ["var(--vscode-font-family)", "ui-sans-serif", "system-ui"],
        mono: ["var(--vscode-editor-font-family)", "ui-monospace", "monospace"],
      },
      fontSize: {
        /** Match the host's font size; users with reduced-font setups get respected. */
        vsbody: "var(--vscode-font-size)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Anchor token policy** (lock this rule, every later chunk follows it):

| Token category | Strategy | Examples |
|---|---|---|
| Panel chrome (outer background, dividers, focus rings) | **Anchor** to VS Code vars | `bg-vscode-bg`, `border-vscode-border`, `focus:ring-vscode-focusBorder` |
| Form inputs (text boxes the user types into) | **Anchor** to VS Code input vars | `bg-vscode-inputBg text-vscode-inputFg border-vscode-inputBorder` |
| Body font family + size | **Anchor** | `font-sans text-vsbody` |
| Headings, primary surfaces, accent colours | **DeliveryOS palette** (do NOT anchor) | `text-dos-ink bg-dos-surface`, accent buttons use `bg-dos-accent` |
| Status colours (pass/fail/forbidden) | **DeliveryOS palette** (do NOT anchor) | `text-dos-danger`, `text-dos-success` |

Rationale: the user must read "this is DeliveryOS" from chrome positioning and accent colour. Anchoring everything to host vars makes the extension dissolve into the editor — which the PRD § 25.2 explicitly rejects ("full visual control independent of host theme"). But anchoring the *chrome edges* (focus ring, panel border, input fields) gives accessibility-by-default and respects the user's contrast settings.

#### `webview/postcss.config.js`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

#### `webview/src/shared/styles/tailwind.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/**
 * Body defaults — anchor to host theme so the webview looks at home.
 * The dos.* palette overrides per-component as needed.
 */
:root {
  color-scheme: var(--vscode-colorScheme, light dark);
}
body {
  @apply bg-vscode-bg text-vscode-fg font-sans text-vsbody m-0 p-0;
}
*:focus-visible {
  @apply outline-none ring-2 ring-vscode-focusBorder rounded-sm;
}
```

#### `webview/src/shared/vscode.ts`

Singleton wrapper around `acquireVsCodeApi()`. The webview can only call this once per page lifetime, so we cache it.

```ts
import type { WebviewApi } from "vscode-webview";

let cached: WebviewApi<unknown> | undefined;

export function vscode(): WebviewApi<unknown> {
  if (!cached) {
    // @ts-expect-error provided by VS Code at runtime
    cached = acquireVsCodeApi();
  }
  return cached!;
}
```

(`@types/vscode-webview` provides the `WebviewApi` type.)

#### `webview/src/shared/messenger.ts`

```ts
import { Messenger } from "vscode-messenger-webview";
import { vscode } from "./vscode";

/**
 * Singleton webview-side messenger. Import this from every panel's main.tsx.
 * It's idempotent — the underlying `vscode-messenger-webview` Messenger
 * dedupes handlers when given the same vscode API instance.
 */
export const messenger = new Messenger(vscode());
messenger.start();
```

#### `webview/src/panels/hello/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DeliveryOS — Hello</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

This file is **not served to the webview** — Vite uses it as the entry-graph root to discover `main.tsx` and emit the manifest. The host's HTML factory generates the actual HTML.

#### `webview/src/panels/hello/main.tsx`

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "../../shared/styles/tailwind.css";
import { HelloApp } from "./HelloApp";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("DeliveryOS: missing #root element in hello panel");
ReactDOM.createRoot(rootEl).render(<HelloApp />);
```

#### `webview/src/panels/hello/HelloApp.tsx`

```tsx
import { useEffect, useState } from "react";
import { Hello } from "@deliveryos/contracts";
import { messenger } from "../../shared/messenger";
import { HOST_EXTENSION } from "vscode-messenger-common";

export function HelloApp() {
  const [text, setText] = useState<string>("…loading");
  const [stamp, setStamp] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    messenger
      .sendRequest(Hello.GetHelloText, HOST_EXTENSION, { projectName: "DeliveryOS" })
      .then((res) => {
        if (cancelled) return;
        setText(res.text);
        setStamp(res.timestamp);
      })
      .catch((err) => setText(`error: ${(err as Error).message}`));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen p-8 bg-vscode-bg text-vscode-fg">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-dos-accent">DeliveryOS</h1>
        <p className="text-sm text-dos-muted">Hello panel — webview smoke test</p>
      </header>
      <section className="max-w-prose p-4 rounded-md border border-vscode-border bg-dos-surface text-dos-ink">
        <p className="text-base">{text}</p>
        {stamp !== null && (
          <p className="mt-2 text-xs text-dos-muted">
            Host responded at {new Date(stamp).toISOString()}
          </p>
        )}
      </section>
    </main>
  );
}
```

---

### 3.3 `extension/`

#### `extension/package.json` (relevant additions)

Carries over from CHUNK-01. Adds the webview command + dependency on the messenger lib.

```jsonc
{
  "name": "deliveryos",
  "displayName": "DeliveryOS",
  "version": "0.0.2",
  "engines": { "vscode": "^1.85.0" },
  "main": "./dist/extension.js",
  "activationEvents": ["onStartupFinished"],
  "capabilities": {
    "untrustedWorkspaces": { "supported": false, "description": "DeliveryOS reads and writes workspace files." },
    "virtualWorkspaces": { "supported": false, "description": "DeliveryOS requires a local filesystem." }
  },
  "contributes": {
    "commands": [
      { "command": "deliveryos.project.create", "title": "DeliveryOS: Create project" },
      { "command": "deliveryos.openHello", "title": "DeliveryOS: Open Hello (dev smoke test)" }
    ],
    "viewsContainers": { /* …from CHUNK-01… */ },
    "views": { /* …from CHUNK-01… */ },
    "viewsWelcome": [ /* …from CHUNK-01… */ ]
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "watch": "tsc -p tsconfig.json --watch",
    "package": "vsce package --no-dependencies"
  },
  "dependencies": {
    "@deliveryos/contracts": "*",
    "vscode-messenger": "^0.4.5",
    "vscode-messenger-common": "^0.4.5"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/vscode": "^1.85.0",
    "@vscode/vsce": "^3.0.0",
    "typescript": "^5.5.0"
  }
}
```

Note `vsce package --no-dependencies`: workspace-relative deps confuse `vsce`'s default bundler. We rely on `.vscodeignore` plus a build step that copies the small set of needed `node_modules/` over (lands in CHUNK-04). The two runtime deps (`vscode-messenger`, `vscode-messenger-common`) are small enough to bundle via `esbuild` in a future tightening; for MVP they're declared and shipped.

#### `extension/src/webview/nonce.ts`

```ts
import { randomBytes } from "node:crypto";

/**
 * Generate a 24-byte base64url nonce per webview load.
 * VS Code's docs recommend at least 128 bits of entropy; 24 bytes = 192 bits.
 * A NEW nonce is required on every panel open AND every serializer restore.
 */
export function nonce(): string {
  return randomBytes(24).toString("base64url");
}
```

#### `extension/src/webview/htmlFactory.ts`

The single source of HTML truth for every panel. Reads the Vite manifest once per process (cached), looks up the requested entry, returns CSP-locked HTML.

```ts
import * as vscode from "vscode";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { nonce as makeNonce } from "./nonce";

/* ── Vite manifest shape (subset we use) ────────────────── */
interface ViteManifestEntry {
  file: string;          // hashed entry JS, e.g. "assets/hello-Br3vTQ.js"
  css?: string[];        // hashed CSS files
  isEntry?: boolean;
}
type ViteManifest = Record<string, ViteManifestEntry>;

let cachedManifest: ViteManifest | undefined;

async function loadManifest(extensionUri: vscode.Uri): Promise<ViteManifest> {
  if (cachedManifest) return cachedManifest;
  const manifestPath = path.join(
    extensionUri.fsPath,
    "..", "webview", "dist", ".vite", "manifest.json",
    // ↑ path is relative to extension/dist/extension.js; resolved at runtime.
  );
  const raw = await fs.readFile(manifestPath, "utf8");
  cachedManifest = JSON.parse(raw) as ViteManifest;
  return cachedManifest;
}

/**
 * Build the HTML for a panel. Called on createWebviewPanel AND on
 * WebviewPanelSerializer.deserializeWebviewPanel (fresh nonce each time).
 */
export async function renderPanelHtml(opts: {
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  /** Vite manifest key — must match a `rollupOptions.input` name. */
  entry: string;
  /** Visible <title> for the webview document. */
  title: string;
}): Promise<string> {
  const { webview, extensionUri, entry, title } = opts;
  const manifest = await loadManifest(extensionUri);

  /**
   * Vite manifest keys are RELATIVE PATHS to the entry HTML, NOT the
   * Rollup-input name. e.g. for input `hello: "src/panels/hello/index.html"`,
   * the manifest key is `"src/panels/hello/index.html"`.
   */
  const entryKey = `src/panels/${entry}/index.html`;
  const entryRecord = manifest[entryKey];
  if (!entryRecord) {
    throw new Error(`DeliveryOS: vite manifest missing entry "${entryKey}"`);
  }

  const distRoot = vscode.Uri.joinPath(extensionUri, "..", "webview", "dist");
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distRoot, entryRecord.file));
  const cssUris = (entryRecord.css ?? []).map((href) =>
    webview.asWebviewUri(vscode.Uri.joinPath(distRoot, href)),
  );

  const nonce = makeNonce();
  const cspSource = webview.cspSource;

  const csp = [
    `default-src 'none'`,
    `img-src ${cspSource} https: data:`,
    `style-src ${cspSource} 'unsafe-inline'`,
    `font-src ${cspSource}`,
    `script-src 'nonce-${nonce}'`,
    `connect-src ${cspSource}`,
  ].join("; ");

  return /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    ${cssUris.map((u) => `<link rel="stylesheet" href="${u}" />`).join("\n    ")}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}
```

#### `extension/src/webview/messenger.ts`

Single host-side `Messenger` shared across panels. Each panel registers its handlers; the messenger routes by request method.

```ts
import * as vscode from "vscode";
import { Messenger } from "vscode-messenger";
import { Hello } from "@deliveryos/contracts";

/**
 * Construct ONE host messenger per extension activation; subscribe each
 * webview panel via `messenger.registerWebviewPanel(panel)` at create-time.
 */
export class HostMessenger {
  readonly messenger = new Messenger({ ignoreHiddenViews: false });

  registerHelloHandlers(): void {
    this.messenger.onRequest(Hello.GetHelloText, async (params) => {
      const project = params?.projectName ?? "DeliveryOS";
      return {
        text: `Hello, ${project}.`,
        timestamp: Date.now(),
      };
    });
  }

  attachPanel(panel: vscode.WebviewPanel): void {
    this.messenger.registerWebviewPanel(panel);
  }
}
```

#### `extension/src/webview/panelManager.ts`

Tracks one panel instance per panel type (a "show-or-focus" semantic, standard for VS Code webview UX). The hello panel reuses this pattern; every later chunk imports the same manager.

```ts
import * as vscode from "vscode";

interface ManagedPanel {
  panel: vscode.WebviewPanel;
  viewType: string;
}

const live = new Map<string, ManagedPanel>();

export function trackPanel(panel: vscode.WebviewPanel, viewType: string): void {
  live.set(viewType, { panel, viewType });
  panel.onDidDispose(() => {
    if (live.get(viewType)?.panel === panel) live.delete(viewType);
  });
}

export function existingPanel(viewType: string): vscode.WebviewPanel | undefined {
  return live.get(viewType)?.panel;
}
```

#### `extension/src/webview/helloPanel.ts`

```ts
import * as vscode from "vscode";
import { renderPanelHtml } from "./htmlFactory";
import { existingPanel, trackPanel } from "./panelManager";
import type { HostMessenger } from "./messenger";

export const HELLO_VIEW_TYPE = "deliveryos.hello";
export const HELLO_TITLE = "DeliveryOS: Hello";

export async function openHelloPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): Promise<void> {
  const existing = existingPanel(HELLO_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    HELLO_VIEW_TYPE,
    HELLO_TITLE,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, "..", "webview", "dist"),
      ],
    },
  );

  panel.webview.html = await renderPanelHtml({
    webview: panel.webview,
    extensionUri: context.extensionUri,
    entry: "hello",
    title: HELLO_TITLE,
  });

  host.attachPanel(panel);
  trackPanel(panel, HELLO_VIEW_TYPE);
}
```

#### `extension/src/serializers/helloPanelSerializer.ts`

```ts
import * as vscode from "vscode";
import { renderPanelHtml } from "../webview/htmlFactory";
import { trackPanel } from "../webview/panelManager";
import { HELLO_VIEW_TYPE, HELLO_TITLE } from "../webview/helloPanel";
import type { HostMessenger } from "../webview/messenger";

/**
 * Registered against HELLO_VIEW_TYPE so that a reload-while-open re-creates
 * the panel with a FRESH nonce and re-attaches the messenger.
 *
 * Per the part-1-plan risk note: nonce regeneration on serializer restore
 * is non-negotiable; reusing a stale nonce undermines CSP.
 */
export function helloPanelSerializer(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.WebviewPanelSerializer {
  return {
    async deserializeWebviewPanel(panel) {
      panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "..", "webview", "dist"),
        ],
      };
      panel.webview.html = await renderPanelHtml({
        webview: panel.webview,
        extensionUri: context.extensionUri,
        entry: "hello",
        title: HELLO_TITLE,
      });
      host.attachPanel(panel);
      trackPanel(panel, HELLO_VIEW_TYPE);
    },
  };
}
```

#### `extension/src/commands/openHello.ts`

```ts
import * as vscode from "vscode";
import { openHelloPanel } from "../webview/helloPanel";
import type { HostMessenger } from "../webview/messenger";

export function registerOpenHelloCommand(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.Disposable {
  return vscode.commands.registerCommand("deliveryos.openHello", () =>
    openHelloPanel(context, host),
  );
}
```

#### `extension/src/extension.ts` (updates from CHUNK-01)

```ts
import * as vscode from "vscode";
import { registerOpenHelloCommand } from "./commands/openHello";
import { HostMessenger } from "./webview/messenger";
import { helloPanelSerializer } from "./serializers/helloPanelSerializer";
import { HELLO_VIEW_TYPE } from "./webview/helloPanel";
// …existing CHUNK-01 imports: stagesTree, projectCreate…

export function activate(context: vscode.ExtensionContext): void {
  const host = new HostMessenger();
  host.registerHelloHandlers();

  context.subscriptions.push(
    registerOpenHelloCommand(context, host),
    vscode.window.registerWebviewPanelSerializer(
      HELLO_VIEW_TYPE,
      helloPanelSerializer(context, host),
    ),
    // …existing CHUNK-01 subscriptions…
  );
}

export function deactivate(): void {
  /* messenger + panels cleaned up via subscriptions */
}
```

---

### 3.4 Root + tooling

#### `tsconfig.base.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

#### `scripts/build.mjs`

```js
import { execSync } from "node:child_process";
const run = (cmd) => execSync(cmd, { stdio: "inherit" });
run("npm -w @deliveryos/contracts run build");
run("npm -w @deliveryos/webview run build");
run("npm -w deliveryos run build");
```

The order matters: contracts → webview → extension (webview depends on contracts; extension depends on both).

#### `.vscode/launch.json` (updated)

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch DeliveryOS Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}/extension"],
      "outFiles": ["${workspaceFolder}/extension/dist/**/*.js"],
      "preLaunchTask": "npm: build"
    }
  ]
}
```

#### `.vscode/tasks.json` (updated)

```jsonc
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: build",
      "type": "shell",
      "command": "npm run build",
      "group": { "kind": "build", "isDefault": true },
      "problemMatcher": ["$tsc"]
    }
  ]
}
```

---

## 4. Key interfaces and types

### 4.1 The contracts package shape

The canonical "where do webview ↔ extension message types live" is `contracts/`. Three rules every later chunk follows:

1. **One file per panel** under `contracts/src/panels/`. A panel never imports another panel's slice. (If two panels need to share a type — e.g. a Requirement summary that appears on both the Requirements catalogue and the Brief composer — it lives in a `contracts/src/shared/` file alongside `messages.ts`.)
2. **Discriminated unions for requests and notifications.** Every request is declared as a `RequestType<Params, Result>` constant. Every notification is a `NotificationType<Params>` constant. The `method` string is namespaced as `<panel>/<verb>` (e.g. `hello/getHelloText`, `prd/getDraft`).
3. **`index.ts` re-exports each panel as a namespace** (`export * as Hello`). Consumers write `Hello.GetHelloText` — the namespace makes the contracts surface searchable and impossible to typo (TypeScript surfaces all members of a namespace under one identifier).

Future-proofing: when a panel needs a streaming feed from the host (CHUNK-13's diff results, for example), the slice gains a `NotificationType` export, and the messenger handler uses `messenger.sendNotification(...)`. No change to the structure.

### 4.2 vscode-messenger typed surface

`vscode-messenger` is the canonical typed-message lib for VS Code webviews (~2k stars, actively maintained as of late 2025; the toolkit it competes with is the deprecated `webview-ui-toolkit`).

Surface used in CHUNK-02:

| Side | Class | Method | Use |
|---|---|---|---|
| Host (extension) | `Messenger` (from `vscode-messenger`) | `registerWebviewPanel(panel)` | Bind a panel to the messenger's transport. |
| Host | `Messenger` | `onRequest(RequestType, handler)` | Register a typed handler. |
| Host | `Messenger` | `sendNotification(NotificationType, receivers, params)` | Push to a panel (deferred; not used in CHUNK-02). |
| Webview | `Messenger` (from `vscode-messenger-webview`) | `start()` | Activate the webview-side transport. |
| Webview | `Messenger` | `sendRequest(RequestType, HOST_EXTENSION, params)` | Call a host handler. |
| Both | `vscode-messenger-common` | `RequestType<P, R>`, `NotificationType<P>` | Type-only carriers. |

API stability call: the `vscode-messenger` 0.4.x line is the API surface CHUNK-02 commits to. Any breaking change in 0.5+ requires a contracts-package shim before propagating. **Lock the version with `^0.4.5`** (caret) in `webview/package.json` and `extension/package.json` and revisit in CHUNK-04's verification pass.

### 4.3 CSP nonce factory signature

```ts
nonce(): string         // 192-bit base64url, generated per panel open + per restore
```

Used exactly once per `renderPanelHtml()` invocation. Never persisted, never reused, never logged.

### 4.4 `WebviewPanelSerializer` base shape

```ts
interface DOSPanelSerializerArgs {
  context: vscode.ExtensionContext;
  host: HostMessenger;
}
type DOSPanelSerializerFactory = (args: DOSPanelSerializerArgs) => vscode.WebviewPanelSerializer;
```

The hello panel's serializer is the reference implementation. Every later panel chunk provides a `<feature>PanelSerializer.ts` that matches this shape. Common pattern:

1. `panel.webview.options = { enableScripts: true, localResourceRoots: [...] }` (the deserializer receives a bare panel — re-set the options).
2. `panel.webview.html = await renderPanelHtml({...})` with a **fresh nonce** (the htmlFactory generates one each call).
3. `host.attachPanel(panel)` to re-bind the messenger.
4. `trackPanel(panel, VIEW_TYPE)` to re-track for show-or-focus.

---

## 5. VS Code APIs used

| API | Where | Why |
|---|---|---|
| `vscode.window.createWebviewPanel(viewType, title, column, options)` | `helloPanel.ts` | Create the panel. `viewType` matches the serializer registration. |
| `vscode.WebviewPanelOptions.enableScripts: true` | `helloPanel.ts` | Webviews are script-disabled by default. |
| `vscode.WebviewPanelOptions.localResourceRoots` | `helloPanel.ts`, serializer | Allow-list `webview/dist/`. Granular per-panel is overkill at MVP — the whole `webview/dist/` is fine since all entries live there. |
| `vscode.WebviewPanelOptions.retainContextWhenHidden: false` | `helloPanel.ts` | Default. We use `WebviewPanelSerializer` for true persistence rather than the more memory-hungry `retainContext`. |
| `Webview.asWebviewUri(uri)` | `htmlFactory.ts` | Rewrite `file://` URIs to `https://...vscode-cdn.net/...` form (the only scheme webviews can load resources from). |
| `Webview.cspSource` | `htmlFactory.ts` | The string token to include in CSP `img-src` / `style-src` / `connect-src` for self-origin assets. Differs per panel — must come from the panel's webview, not a static string. |
| `vscode.window.registerWebviewPanelSerializer(viewType, serializer)` | `extension.ts` | Survive `Developer: Reload Window`. |
| `vscode.commands.registerCommand(id, handler)` | `commands/openHello.ts` | Register the `deliveryos.openHello` command surfaced in `package.json`. |
| `vscode.Uri.joinPath(uri, ...segments)` | throughout | Cross-platform path joins on `Uri`. |
| `context.extensionUri` | throughout | Root of the installed extension. **NOT** the workspace folder. |
| `webview.postMessage(any)` / `webview.onDidReceiveMessage(any)` | indirect | `vscode-messenger` wraps these — we never call them directly. |

Of note: **no proposed APIs**. The webview surface is fully stable since 1.46 (2020). Compatible with all target editors (VS Code 1.85+, Cursor, Windsurf, Antigravity, VSCodium).

---

## 6. CSP policy

### The string

```
default-src 'none';
img-src ${cspSource} https: data:;
style-src ${cspSource} 'unsafe-inline';
font-src ${cspSource};
script-src 'nonce-${nonce}';
connect-src ${cspSource};
```

### Per-token rationale

| Directive | Value | Why |
|---|---|---|
| `default-src` | `'none'` | Deny by default. Every load must opt in. Catches missed directives at build time. |
| `img-src` | `${cspSource} https: data:` | `${cspSource}` for bundled images; `https:` so users can paste image URLs in future PRD/brief editor surfaces; `data:` for inline SVG icons (Lucide renders inline). |
| `style-src` | `${cspSource} 'unsafe-inline'` | Tailwind emits a `<style>` injection from `tailwindcss/postcss` at build time, plus per-React-render inline styles for dynamic sizing. `'unsafe-inline'` is the standard webview-ui workaround — the alternative is hashing every dynamic style which doesn't scale. Mitigated by `script-src` nonce (the actual attack surface). |
| `font-src` | `${cspSource}` | Tailwind's anchor to `var(--vscode-font-family)` doesn't load any external fonts; in MVP we don't ship custom fonts. Tightened to self-only. |
| `script-src` | `'nonce-${nonce}'` | The load-bearing directive. NO `'unsafe-inline'`, NO `'unsafe-eval'`. React 18's production build doesn't need `eval`. Each script tag must carry the matching `nonce=` attribute. A fresh nonce is generated per HTML render (open AND deserialize). |
| `connect-src` | `${cspSource}` | The messenger uses `postMessage`, not `fetch`; in CHUNK-02 we don't need network. Locked down. Loosened in CHUNK-04 if the version-check pings `api.github.com` from the webview (it won't — that's host-side). |

### What's deliberately NOT in the CSP

- No `frame-src` — webviews can't be iframed within other webviews in the MVP.
- No `worker-src` — no Web Workers in the hello panel. Add later if a panel needs one (e.g. CHUNK-12's diff renderer).
- No `'unsafe-eval'` in `script-src`. If a future dep needs it (e.g. some `vite-plugin-monaco-editor` paths), we'll evaluate then. None of the MVP deps need it.

### Verification

The "done when" includes "zero CSP errors in webview devtools". Manual smoke per CHUNK-04 also re-checks across all five target editors.

---

## 7. Tailwind hybrid theming — anchor vs. own

This is one of the load-bearing design calls of the chunk. The rule is restated here in canonical form so later chunks reference it:

### Anchored tokens (track VS Code CSS vars)

```
bg-vscode-bg           ← --vscode-editor-background
text-vscode-fg         ← --vscode-editor-foreground
bg-vscode-panel        ← --vscode-sideBar-background
border-vscode-border   ← --vscode-panel-border
ring-vscode-focusBorder← --vscode-focusBorder
bg-vscode-inputBg      ← --vscode-input-background
text-vscode-inputFg    ← --vscode-input-foreground
border-vscode-inputBorder← --vscode-input-border
font-sans              ← --vscode-font-family
font-mono              ← --vscode-editor-font-family
text-vsbody            ← --vscode-font-size
```

Use these for **chrome that should blend** with the editor: outer panel background, dividers, focus rings, form inputs the user types into, body font.

### DeliveryOS-owned tokens (independent of host theme)

```
text-dos-ink           # #0F172A
bg-dos-surface         # #FFFFFF
text-dos-accent        # #6D5BD0   (matches activity-bar icon)
text-dos-danger        # #DC2626   (forbidden-changes red)
text-dos-success       # #16A34A   (verification green)
text-dos-warn          # #D97706
text-dos-muted         # #64748B
```

Use these for: headings, primary content surfaces, accent buttons, status badges, the diff feature's pass/fail colours. **These do NOT change with the host theme.** A user on a Solarized Dark VS Code theme will still see the DeliveryOS purple accent — that's the visual brand the PRD § 25.2 calls for.

### Why hybrid, not "pure DeliveryOS palette"

Three reasons:

1. **Accessibility.** If a user has a high-contrast theme installed, the chrome inherits it automatically. Replacing it with a fixed `#FFFFFF` panel background would fail WCAG for them.
2. **Focus rings.** VS Code users expect the host's focus ring colour to apply throughout the editor. Diverging it inside a webview confuses keyboard-navigation flow.
3. **Cognitive seam.** The editor's font family and size carry through. The "this is the editor" feeling at the chrome level + "this is DeliveryOS" at the content level gives the right hierarchy.

### Why not "pure VS Code anchored"

Because the PRD § 25.2 explicitly chooses "full visual control independent of host theme" for the rich UI. A user opening DeliveryOS should feel like they're in DeliveryOS. Accent colour, brand tone, and badge colours are part of the proof-of-work positioning ("a harness around your harness" needs a visual identity).

---

## 8. Vite manifest → HTML factory wiring

### The flow

```
vite build
  → emits webview/dist/.vite/manifest.json mapping
      "src/panels/<name>/index.html" → { file: "assets/<name>-<hash>.js", css: [...] }
  → emits hashed JS + CSS in webview/dist/assets/

extension activates
  → on `deliveryos.openHello`:
      1. createWebviewPanel(viewType, title, column, {
           enableScripts: true,
           localResourceRoots: [webview/dist]
         })
      2. renderPanelHtml({ webview, extensionUri, entry: "hello", title })
           a. loadManifest()  (cached after first call)
           b. lookup manifest["src/panels/hello/index.html"]
           c. for each css entry → webview.asWebviewUri()
           d. for the file entry → webview.asWebviewUri()
           e. generate fresh nonce()
           f. compose HTML with CSP meta + nonce-stamped <script> + <link> tags
      3. panel.webview.html = (composed HTML)
      4. host.attachPanel(panel)         → messenger routes to/from this panel
      5. trackPanel(panel, viewType)     → show-or-focus tracking
```

### Manifest key choice

Vite's manifest keys are **paths relative to the project root**, not the Rollup-input names. With `rollupOptions.input = { hello: "src/panels/hello/index.html" }`, the manifest key is `src/panels/hello/index.html`. We construct that key from the `entry` arg (`src/panels/${entry}/index.html`). Future panels follow the same naming convention; the htmlFactory needs zero changes when adding a panel.

### Why per-panel HTML and not one shared index

Each panel gets its own React bundle (different roots, different state). Multi-entry Vite + per-panel HTML is the standard pattern. A future "lazy load" path (one shell, dynamic-import panels) is possible but premature.

### Nonce regeneration policy

A new nonce is generated **every time `renderPanelHtml()` is called**, which means:

- Every `openHelloPanel()` (initial open) → new nonce.
- Every `deserializeWebviewPanel()` (window reload, hot panel restore) → new nonce.
- Every `panel.webview.html = ...` reassignment (we don't do this in CHUNK-02, but later panels with a "refresh content" affordance would) → new nonce.

The nonce is **never** stored on the panel or in extension state. The risk this defends against (research-finding #2 echoes the general guidance): a stale or guessable nonce undermines `script-src 'nonce-...'`.

---

## 9. Step-by-step implementation outline

A sketch sized for the 3–5 session-day budget. Each session is ~3 hours.

### Session 1 — Workspace restructure + contracts package

1. Move existing CHUNK-01 code from repo-root into `extension/`.
2. Create `extension/package.json` from the old root; carve out workspaces from root `package.json`.
3. Create `contracts/` package with `messages.ts` + `panels/hello.ts` + `index.ts`.
4. Wire `tsconfig.base.json` + per-package `tsconfig.json` with project references.
5. Confirm `npm install` works and `npm -w @deliveryos/contracts run build` emits `.d.ts`.
6. Smoke: `npm -w deliveryos run build` still compiles, `vsce package --no-dependencies` still emits a `.vsix` (no webview yet — same as CHUNK-01's `.vsix`).

### Session 2 — Webview package boot

1. Create `webview/package.json`, `vite.config.ts`, `tsconfig.json`, `postcss.config.js`.
2. Add `webview/src/panels/hello/index.html`, `main.tsx`, `HelloApp.tsx` (initially just `<div>hello</div>`).
3. Add `webview/src/shared/styles/tailwind.css`, `tailwind.config.ts`.
4. `npm -w @deliveryos/webview run build`. Inspect `webview/dist/.vite/manifest.json` and confirm the `hello` entry exists.

### Session 3 — HTML factory + open command

1. Implement `extension/src/webview/nonce.ts` and `htmlFactory.ts`.
2. Implement `extension/src/webview/panelManager.ts` and `helloPanel.ts`.
3. Implement `extension/src/commands/openHello.ts`; register in `extension.ts`.
4. Run the extension via F5 (Extension Development Host). Execute `DeliveryOS: Open Hello`. Confirm a panel opens, the React app renders, no CSP errors in the webview devtools (`Developer: Open Webview Developer Tools`).
5. Pause: at this point the panel works one-way. No messenger yet.

### Session 4 — Messenger + round trip

1. Add `vscode-messenger`, `vscode-messenger-webview`, `vscode-messenger-common` deps to the right workspaces.
2. Implement `extension/src/webview/messenger.ts` (`HostMessenger`).
3. Wire `host.registerHelloHandlers()` in `activate()`.
4. Wire `host.attachPanel(panel)` in `helloPanel.ts`.
5. In `HelloApp.tsx`, call `messenger.sendRequest(Hello.GetHelloText, HOST_EXTENSION, {...})` in a `useEffect`.
6. Run; confirm the panel renders `"Hello, DeliveryOS."` plus the timestamp.

### Session 5 — Serializer + polish

1. Implement `helloPanelSerializer.ts`.
2. Register it in `activate()`.
3. Test: open the panel, `Developer: Reload Window`, confirm the panel restores and the messenger round trip still works.
4. Tighten `.vscodeignore`.
5. Smoke-package: `npm run package`, install the `.vsix` into a clean VS Code instance, run the command, confirm everything works.
6. Update README with the new monorepo layout note.
7. Commit.

### If a session slips

The cleanest cut-points are between sessions 3 and 4 (panel renders but doesn't roundtrip) or between 4 and 5 (works but doesn't survive reload). Either is shippable in a worst case — the headline contract (a panel renders a React app from inside a `.vsix`) is satisfied after session 3. Subsequent chunks need 4+5 to be complete though, so don't punt.

---

## 10. Test plan

### 10.1 Manual smoke (load-bearing)

The "done when" list, restated as a checklist:

- [ ] `npm install` at the root completes without errors.
- [ ] `npm run build` produces `extension/dist/extension.js`, `webview/dist/assets/hello-*.js`, `webview/dist/.vite/manifest.json`, `contracts/dist/index.d.ts`.
- [ ] `npm run package` produces `deliveryos-0.0.2.vsix` (or similar) in `extension/`.
- [ ] `code --install-extension extension/deliveryos-0.0.2.vsix` installs cleanly.
- [ ] After reload, the activity bar icon from CHUNK-01 is still there.
- [ ] `Developer: Show Running Extensions` lists `deliveryos` with no errors.
- [ ] Running `DeliveryOS: Open Hello (dev smoke test)` opens a panel titled "DeliveryOS: Hello".
- [ ] The panel renders the React app with `"Hello, DeliveryOS."` and an ISO timestamp.
- [ ] `Developer: Open Webview Developer Tools` → Console tab shows **zero CSP errors** (no `Refused to load…` messages).
- [ ] `Developer: Open Webview Developer Tools` → Elements tab shows the `<meta http-equiv="Content-Security-Policy">` with the expected directive list.
- [ ] `Developer: Open Webview Developer Tools` → Network tab shows the CSS and JS load from the `vscode-cdn.net` origin via the rewritten URIs.
- [ ] Run the command a second time: the existing panel is focused (no second panel created).
- [ ] Run `Developer: Reload Window`: the hello panel reappears (serializer), the round trip still works, the nonce in the HTML has changed (compare before/after in devtools).
- [ ] Close the panel; `existingPanel(HELLO_VIEW_TYPE)` returns `undefined` (verified by re-opening: the panel mounts fresh).

### 10.2 Automated tests

**Intentionally minimal at this layer.** Adding `@vscode/test-electron` for ext-host integration tests is meaningful work and not worth the cost in CHUNK-02. Two cheap unit tests are worth writing:

- `htmlFactory.test.ts` — unit-test the HTML composition: given a mock manifest + mock webview (with stub `asWebviewUri`/`cspSource`), assert the generated HTML contains the expected `<link>`s, the nonce'd `<script>`, the CSP meta tag, and that two calls produce **different nonces**.
- `nonce.test.ts` — assert `nonce()` returns 32-char base64url strings (24 bytes encoded), 100 calls produce 100 unique values.

Both tests use Node's built-in `node:test` runner; no test framework dependency.

### 10.3 Per-editor smoke (deferred)

CHUNK-04 carries the full multi-editor matrix (VS Code, Cursor, Windsurf, VSCodium, Antigravity). CHUNK-02 verifies on VS Code only; the multi-editor smoke is the load-bearing assurance that the webview works everywhere, and it lands in the next chunk by design.

---

## 11. Risks, edge cases and open questions

### Risk: `vscode-messenger` API stability

**Severity:** medium.

The library is small (a few hundred lines), but its 0.x major-version line means breaking changes can happen. Mitigations:

- Pin to `^0.4.5` (caret) and snapshot the API surface in `contracts/src/messages.ts` so any breaking change surfaces as a TS compile error rather than a runtime regression.
- Wrap the messenger behind `HostMessenger` (host) / `messenger` (webview shared) so a future swap to a different transport (or hand-rolled `postMessage`) is a one-file change.
- Re-evaluate during CHUNK-04 if 0.5 has shipped and broken the surface.

### Risk: nonce regeneration on serializer restore

**Severity:** high (correctness of the CSP story).

Failing to regenerate the nonce on `deserializeWebviewPanel` would mean a long-lived browsing session retains a stale nonce — undermining `script-src 'nonce-...'`. Mitigation: `renderPanelHtml()` generates a new nonce on every call by construction. The serializer test in §10.1 explicitly compares pre/post nonces. Code-review checklist item: "Does every panel's serializer call `renderPanelHtml()` rather than caching its HTML?"

### Risk: Vite + nonce wiring is fiddly the first time

**Severity:** medium.

The classic failure modes:

- Forgetting `enableScripts: true` → silent script blocking.
- Forgetting `localResourceRoots` → assets load from `vscode-resource:` and CSP rejects them.
- Using `Webview.asWebviewUri()` from the wrong webview instance (e.g. the panel's `webview` vs. a stale reference) → returns wrong host token, CSP rejects.
- Forgetting the `nonce=` attribute on the actual `<script>` tag → CSP rejects.

Reference: the Microsoft sample `vscode-extension-samples/webview-view-sample` and the community sample `microsoft/vscode-webview-ui-toolkit-samples/hello-world-react-vite` (the toolkit is deprecated per research-finding #2, but the Vite wiring in those samples is correct and reusable). Read them once before starting Session 3.

### Risk: Tailwind's `'unsafe-inline'` in `style-src`

**Severity:** low (acknowledged trade-off).

Tailwind v3 emits a stylesheet at build time (good — that's `${cspSource}`). But React component libraries and ad-hoc `style={...}` props inject inline styles. We need `'unsafe-inline'` for the latter. The attack surface from inline `<style>` is limited because:

- All scripts are nonce-gated (`script-src 'nonce-...'` with no `'unsafe-inline'`).
- The webview is sandboxed by VS Code; even a stylesheet XSS can't reach the host or the workspace filesystem.

Note this trade-off in code review; revisit if a tighter `style-src` hash-allow-list approach becomes practical (it isn't today).

### Edge case: workspace not open when panel opens

If `deliveryos.openHello` runs with no workspace folder, the hello panel still opens fine (it doesn't read from disk). Future panels that DO need a workspace must guard explicitly — the harness pattern is to register a `when` clause on the command (`"when": "workspaceFolderCount != 0"`) in `package.json`. Out of scope for CHUNK-02 (the hello panel is a dev smoke test, not a product surface).

### Edge case: vite manifest path resolution at runtime

The htmlFactory resolves the manifest path relative to `context.extensionUri.fsPath` (`extension/dist/extension.js` at runtime) and walks up to `webview/dist/.vite/manifest.json`. This assumes the published `.vsix` preserves the monorepo structure. The `.vscodeignore` rules in §2 keep both `extension/dist/**` and `webview/dist/**` in the package; verify with `unzip -l extension/deliveryos-0.0.2.vsix | grep manifest` during CHUNK-04 smoke.

### Open question: should the contracts package be runtime or types-only?

Recommendation: **runtime** (compile to `dist/index.js` shims) so that `RequestType`/`NotificationType` constants are real values. The alternative (types-only with `vscode-messenger` constants declared inline at each call site) hurts ergonomics for no real saving — the runtime shim is ~50 bytes per request.

### Open question: should HelloApp ship in the final `.vsix`?

For CHUNK-02 itself: yes (the smoke test depends on the command being usable). For CHUNK-04 + onward: keep the `deliveryos.openHello` command **as a dev-only command** behind a `when: "deliveryos.devMode"` context. The user-facing distribution should not expose a "Hello" command in the palette. The `devMode` flag flips on if `extension/package.json#version` is a `-dev` tag or via a setting. Deferred to CHUNK-04.

---

## 12. Explicit dependencies

### Inbound (this chunk depends on)

- **CHUNK-01** — provides `extension/package.json` skeleton, activity bar, tree view, the `deliveryos.project.create` command, the build pipeline producing a `.vsix`. CHUNK-02 carries those forward; the only behavioural change is the addition of `deliveryos.openHello` and (under the hood) the move from a single-folder repo to npm workspaces.

### Outbound (this chunk exposes contracts for)

Every later chunk that has a webview consumes the foundation laid here. The contracts are:

1. **`contracts/` package shape.** One file per panel under `panels/`. Namespaced re-export in `index.ts`. `RequestType` / `NotificationType` constants. Method strings namespaced `<panel>/<verb>`. **Used by:** CHUNK-05 (Discover), CHUNK-06 (PRD), CHUNK-07 (Requirements), CHUNK-08 (Test Designer), CHUNK-09 (Brief composer), CHUNK-10 (Profile selector), CHUNK-12 (Result capture paste mode), CHUNK-13 (Diff results), CHUNK-14 (Verification dashboard).
2. **`htmlFactory.renderPanelHtml()`** — every new panel calls this. Adding a panel = (a) add a Vite entry in `vite.config.ts`'s `rollupOptions.input`, (b) add `webview/src/panels/<name>/{index.html,main.tsx,App.tsx}`, (c) call `renderPanelHtml({ entry: "<name>", title: "<title>", ... })` from the panel's open command.
3. **`HostMessenger`** — every new panel adds a `host.register<Panel>Handlers()` method that registers its request handlers. The single shared messenger routes by method name.
4. **`WebviewPanelSerializer` pattern** — every new panel ships a `<panel>PanelSerializer.ts` matching the hello panel's shape, and registers it in `activate()`.
5. **`panelManager.{trackPanel, existingPanel}`** — every new panel uses these for show-or-focus.
6. **Tailwind config + anchor-token rules** — the colour and font conventions in §7. Every panel uses `dos.*` for content and `vscode.*` for chrome. No panel adds CSS files outside `shared/styles/`.
7. **CSP policy** — the directive set in §6 is the single CSP for all panels. No panel relaxes it without RFC-and-revisit. CHUNK-12's diff renderer in particular must not need `'unsafe-eval'`; CHUNK-15's demo rehearsal panel must not need extra origins.

### Shared cross-chunk contracts honoured

Per `part-1-plan.md § Shared cross-chunk contracts`:

- **Memory schema** (CHUNK-03) — out of scope here; the hello panel is stateless.
- **Webview message contracts** — DEFINED HERE. CHUNK-02 establishes the shape; later chunks add their slice without redefining the base.
- **Execution Brief markdown schema** (CHUNK-09) — out of scope here.
- **Harness Profile schema** (CHUNK-10) — out of scope here.
- **Handoff directory layout** (CHUNK-11) — out of scope here.
- **`.deliveryos/` memory directory layout** (CHUNK-03) — out of scope here.
- **Managed delimiter block syntax** (CHUNK-10) — out of scope here.

---

## 13. Done-when (canonical, lift from part-1-plan.md)

- `npm run build` produces both `extension/dist/` and `webview/dist/`.
- `.vsix` includes both.
- Running `deliveryos.openHello` opens a panel that renders a React app, fetches a string from the host via `vscode-messenger`, and displays it.
- Closing and reopening the panel restores its state (via serializer).
- CSP violations: zero in the developer tools console.

Plus the test plan in §10.

---

## 14. Acknowledged deviations from part-1-plan.md

None. This spec expands on the CHUNK-02 entry in `part-1-plan.md` without changing scope. The only addition not explicitly named in the parent doc is the `panelManager` show-or-focus pattern, which is sized at ~20 lines and is the standard VS Code webview UX. It belongs in CHUNK-02 because every later panel needs it; landing it in CHUNK-05 instead would mean refactoring CHUNK-02's hello panel a few weeks later.
