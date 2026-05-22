# CHUNK-01 — Extension scaffold + activity-bar + static stage tree

**Phase:** Phase 0, Week 1 (2026-05-25).
**Effort:** 4–6 session-days.
**Dependencies (upstream):** none. This is the foundation.
**Exposes (downstream):** the extension activation point, the `deliveryos.stages` tree view, the `deliveryos.project.create` command, the build pipeline, and the in-memory project record stub — all of which CHUNK-02 (webview), CHUNK-03 (memory persistence), and CHUNK-04 (multi-editor verification) build on.

This spec is the per-chunk expansion of the row in [`docs/planning/part-1-plan.md` § CHUNK-01](../part-1-plan.md). It honours the shared cross-chunk contracts listed at the bottom of that file.

---

## 1. Restated goal and scope

### Goal

Create a TypeScript VS Code extension project that contributes an activity-bar icon and a sidebar tree view showing the four default stages (DISCOVER → DEFINE → EXECUTE → VERIFY) as static tree items. Wire the build pipeline so that `npm run package` produces a `deliveryos-0.0.1.vsix` that installs cleanly into VS Code via `code --install-extension`.

This is the foundation chunk. It does not persist anything, does not render any rich UI, does not talk to any harness. It does just enough to prove that DeliveryOS *exists* inside the editor.

### In scope

- TypeScript project skeleton: `package.json`, `tsconfig.json`, `.vscodeignore`, `.gitignore`, `src/extension.ts`.
- `package.json` contributions:
  - `engines.vscode: "^1.85.0"`.
  - `activationEvents: ["onStartupFinished"]` (per research finding §11).
  - `capabilities.untrustedWorkspaces.supported: false` and `capabilities.virtualWorkspaces.supported: false` (per research finding §7).
  - `contributes.viewsContainers.activitybar` with a single container `deliveryos`.
  - `contributes.views` with a single tree view `deliveryos.stages` under that container.
  - `contributes.viewsWelcome` markdown shown when no project is active — links to the `deliveryos.project.create` command.
  - `contributes.commands` declaring `deliveryos.project.create` and `deliveryos.stages.refresh`.
- `TreeDataProvider<StageNode | ArtefactNode>` implementation:
  - Four static stage children (DISCOVER, DEFINE, EXECUTE, VERIFY).
  - Lazy artefact children per stage (empty in this chunk; the contract is shaped so CHUNK-05 onwards can fill them).
- A stub `ProjectRegistry` that holds the active project record in memory only. Real persistence lands in CHUNK-03.
- `deliveryos.project.create` command: opens `vscode.window.showInputBox`, stores a `ProjectRecord` in the in-memory registry, fires the tree view's `onDidChangeTreeData` so the welcome view collapses and the stages render.
- A Lucide-style icon for the activity bar — `rocket` (defer custom icon design; using a stock Codicon-style SVG that mirrors Lucide's `rocket`).
- Build pipeline: `tsc` → `dist/extension.js`; `@vscode/vsce package` → `deliveryos-0.0.1.vsix`.
- `npm run` script wiring: `compile`, `watch`, `package`, `clean`.
- A README skeleton (single page, install command + screenshot placeholder).

### Out of scope (deferred to later chunks)

- Any webview, React, Vite, Tailwind, or messenger wiring → **CHUNK-02**.
- SQLite (`sql.js`) memory store, schema, links table, Intent Memory write on project create → **CHUNK-03**. The project record stays in memory for this chunk.
- Multi-editor sideload verification (Cursor, Windsurf, VSCodium, Antigravity), install scripts, GitHub Release scaffolding, version-check notification → **CHUNK-04**.
- Harness profiles, brief generation, handoff directory, terminal integration, result watcher → CHUNK-09 onwards.
- Discovery interview, PRD editor, requirements catalogue, Test Designer, Execution Brief composer → CHUNK-05 onwards.
- Configurable mid-stages (Security Review, Compliance, Legal, etc.) — the four default stages are hardcoded in this chunk. Mid-stages are a Phase 2+ feature anyway (per PRD § 9, only the four defaults are in the trimmed MVP).
- Per-project persistence beyond this VS Code session. Closing the window forgets the project.
- Unit / integration tests. Manual smoke test is the verification bar at this layer.

---

## 2. File-by-file breakdown

All paths are relative to the extension package root (the directory that holds `package.json`). The monorepo `extension/` / `webview/` split arrives in CHUNK-02. For this chunk, the package root **is** the repo root; CHUNK-02 will refactor it into `extension/` as part of the workspace move.

| Path | Purpose | New / Modified |
|------|---------|----------------|
| `package.json` | Extension manifest. Declares engines, activation event, capabilities, contributes (views, commands, viewsWelcome), npm scripts, dependencies. | new |
| `tsconfig.json` | TypeScript compiler config. Targets ES2022, CommonJS module (VS Code extension host runs Node + requires CJS), `outDir: dist`, `rootDir: src`, strict mode on. | new |
| `.vscodeignore` | Excludes `src/`, `node_modules/` source maps, tests, and dev artefacts from the packaged `.vsix`. | new |
| `.gitignore` | Excludes `dist/`, `node_modules/`, `*.vsix`. | new |
| `README.md` | One-page install + click-through instructions. Placeholder for screenshot. | new |
| `LICENSE` | MIT (matches the project's planned open-source posture). | new |
| `media/icon-rocket.svg` | The activity-bar icon. Lucide `rocket` SVG, monochrome, sized for VS Code's 24px activity-bar slot. | new |
| `media/deliveryos-logo.png` | Extension icon (shown in Extensions sidebar). 128×128 PNG; can be a placeholder. | new |
| `src/extension.ts` | The `activate` / `deactivate` entry points. Wires the tree view, the welcome view context key, and the command registrations. | new |
| `src/projectRegistry.ts` | In-memory `ProjectRegistry` class. Holds the active project record and fires a `EventEmitter<void>` on change. Defines the `ProjectRecord` interface (stub — CHUNK-03 replaces it with a persisted version). | new |
| `src/stages/stageDefinitions.ts` | The four default stages as a frozen const array. Each entry has `id`, `displayName`, `description`, `iconId`. Imported by the tree provider. | new |
| `src/stages/stageTreeProvider.ts` | `StageTreeProvider implements vscode.TreeDataProvider<StageNode \| ArtefactNode>`. Returns the four stages as root children; returns artefact children per stage (empty array in this chunk). Refreshes when the project registry fires its change event. **Future-rename note (per M03 fix path):** CHUNK-02 introduces the monorepo split and renames this file to `extension/src/tree/stageTreeProvider.ts`. The path stays as-is in CHUNK-01 (pre-monorepo); CHUNK-02 owns the move. All later chunks (CHUNK-05, 06, 07, 08, 09, 11, 12, 14) contribute child-builder functions into that single canonical file. | new |
| `src/stages/stageTreeNodes.ts` | Type definitions for `StageNode` and `ArtefactNode` (discriminated union) and the `vscode.TreeItem` adapters that render each node. | new |
| `src/commands/projectCreate.ts` | The `deliveryos.project.create` command handler. Pops `showInputBox` (project name + optional description), stores the result in `ProjectRegistry`, sets the `deliveryos.hasProject` context key. | new |
| `src/commands/stagesRefresh.ts` | The `deliveryos.stages.refresh` command handler. Calls `stageTreeProvider.refresh()`. Useful during development and for a manual refresh button later. | new |
| `src/contextKeys.ts` | Centralises the context-key string constants (`deliveryos.hasProject`). Avoids string-typos across the tree provider and the welcome view. | new |

**Note on the icon.** Use the Lucide `rocket` SVG (currentColor stroke, no fill). VS Code activity-bar icons are masked monochrome — only the alpha channel matters. The SVG should be 24×24, single path, `stroke="currentColor" fill="none"`. The Lucide source is permissively licensed (ISC). `media/deliveryos-logo.png` (the Extensions-sidebar icon) is also a placeholder for this chunk — **CHUNK-16 (Phase 4 polish) owns the final bespoke DeliveryOS icon design** and replaces both files in one pass. Don't redesign in this chunk; the placeholder is intentional.

---

## 3. Key interfaces and types

These types live in `src/projectRegistry.ts` and `src/stages/stageTreeNodes.ts`. They are the contract surface this chunk exposes to CHUNK-02 (webview will read the active project) and CHUNK-03 (memory store will replace the in-memory implementation while preserving the interface).

### 3.1 `ProjectRecord` (stub — CHUNK-03 promotes this to a real Intent Memory)

```ts
// src/projectRegistry.ts

export interface ProjectRecord {
  /** ULID or UUIDv7. CHUNK-03 will reuse this as the Intent Memory id. */
  id: string;
  /** Human title typed by the user in the input box. */
  name: string;
  /** Optional one-line description. */
  description?: string;
  /** Wall-clock creation time. */
  createdAt: number;
}

export interface IProjectRegistry {
  readonly onDidChange: vscode.Event<void>;
  getActive(): ProjectRecord | undefined;
  setActive(record: ProjectRecord): void;
  clear(): void;
}

export class InMemoryProjectRegistry implements IProjectRegistry {
  // Implementation detail: holds a single optional record and an EventEmitter<void>.
}
```

**Contract note.** CHUNK-03 may either implement a `PersistedProjectRegistry` that satisfies the same `IProjectRegistry` interface (swapping the storage backend without changing `extension.ts` or the tree provider) OR rebind the `deliveryos.project.create` command handler directly to call `MemoryStore.createIntent(...)` (skipping the registry indirection). **DOS:O4 iteration-3 audit picked the direct-rebind path** as the simpler shape for the trimmed MVP — CHUNK-03 § 2.11 owns the rebind. The `IProjectRegistry` interface stays defined here so CHUNK-01 can still run standalone with the in-memory stub; CHUNK-03 retires it on first persistence write.

### 3.2 Stage and artefact tree nodes

```ts
// src/stages/stageTreeNodes.ts

export type StageId = 'discover' | 'define' | 'execute' | 'verify';

export interface StageNode {
  readonly kind: 'stage';
  readonly stageId: StageId;
  readonly displayName: string;
  readonly description: string;
}

export interface ArtefactNode {
  readonly kind: 'artefact';
  readonly stageId: StageId;
  readonly artefactId: string;
  readonly displayName: string;
  readonly artefactKind: string; // 'intent' | 'requirement' | 'brief' | … — populated by later chunks.
}

export type StageTreeNode = StageNode | ArtefactNode;
```

The discriminated union with `kind` makes `getTreeItem` a single switch and future chunks add new artefact kinds by extending the union, not by branching on stage id strings.

### 3.3 The tree data provider

```ts
// src/stages/stageTreeProvider.ts

export class StageTreeProvider
  implements vscode.TreeDataProvider<StageTreeNode>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<StageTreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly registry: IProjectRegistry) {
    registry.onDidChange(() => this.refresh());
  }

  refresh(node?: StageTreeNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  getTreeItem(element: StageTreeNode): vscode.TreeItem { /* … */ }

  getChildren(element?: StageTreeNode): vscode.ProviderResult<StageTreeNode[]> {
    if (!this.registry.getActive()) return [];          // welcome view will show.
    if (!element) return STAGE_DEFS.map(toStageNode);   // root children = 4 stages.
    if (element.kind === 'stage') return [];            // artefacts empty for this chunk.
    return [];                                           // artefact leaf → no further children.
  }
}
```

The `getChildren` early-return on no-active-project is what causes `viewsWelcome` to render: VS Code shows the welcome content when a tree view returns an empty root.

### 3.4 The `deliveryos.project.create` command

```ts
// src/commands/projectCreate.ts

export interface ProjectCreateArgs {
  /** Optional pre-seeded name (used in tests / programmatic invocation; ignored in MVP). */
  name?: string;
  description?: string;
}

export type ProjectCreateResult =
  | { ok: true; record: ProjectRecord }
  | { ok: false; reason: 'cancelled' };

export function registerProjectCreate(
  context: vscode.ExtensionContext,
  registry: IProjectRegistry,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'deliveryos.project.create',
    async (args?: ProjectCreateArgs): Promise<ProjectCreateResult> => {
      const name = args?.name ?? await vscode.window.showInputBox({
        prompt: 'Name your DeliveryOS project',
        placeHolder: 'e.g. Bug Triage Assistant',
        ignoreFocusOut: true,
        validateInput: (v) => v.trim().length === 0 ? 'Name is required' : undefined,
      });
      if (!name) return { ok: false, reason: 'cancelled' };

      const record: ProjectRecord = {
        id: generateId(),
        name: name.trim(),
        description: args?.description,
        createdAt: Date.now(),
      };
      registry.setActive(record);
      await vscode.commands.executeCommand('setContext', 'deliveryos.hasProject', true);
      return { ok: true, record };
    },
  );
}
```

The command returns a discriminated union so CHUNK-03 (which will subscribe to the result to persist an Intent Memory entry) gets typed feedback without re-reading the registry.

### 3.5 Stage definitions (frozen)

```ts
// src/stages/stageDefinitions.ts

export const STAGE_DEFS = Object.freeze([
  { id: 'discover', displayName: 'DISCOVER',
    description: 'Raw idea → interview → draft PRD',
    iconId: 'lightbulb' },
  { id: 'define',   displayName: 'DEFINE',
    description: 'Requirements → design → test spec → brief',
    iconId: 'checklist' },
  { id: 'execute',  displayName: 'EXECUTE',
    description: 'Handoff to coding harness → result capture',
    iconId: 'rocket' },
  { id: 'verify',   displayName: 'VERIFY',
    description: 'Verify → memory update → release evidence',
    iconId: 'verified' },
] as const) satisfies ReadonlyArray<{
  id: StageId; displayName: string; description: string; iconId: string;
}>;
```

`iconId` values are VS Code Codicon identifiers (`vscode.ThemeIcon`) — these render in the tree row gutter. They are not the activity-bar icon, which is the SVG declared in `package.json`.

---

## 4. VS Code APIs used

| API | Where | Why |
|-----|-------|-----|
| `vscode.window.createTreeView('deliveryos.stages', { treeDataProvider, showCollapseAll: true })` | `extension.ts` activate | Creates the tree view bound to our provider. Holding the `TreeView` reference (vs. `registerTreeDataProvider`) gives access to `reveal`, `selection`, and visibility events — CHUNK-05 will need these. |
| `vscode.window.registerTreeDataProvider` | (alternative — not used) | Simpler API, but loses the `TreeView` handle. Prefer `createTreeView`. |
| `vscode.commands.registerCommand` | `commands/projectCreate.ts`, `commands/stagesRefresh.ts` | Registers the two MVP commands. |
| `vscode.commands.executeCommand('setContext', 'deliveryos.hasProject', true)` | inside the create handler | Toggles the `when`-clause that flips `viewsWelcome` off and the tree contents on. |
| `vscode.window.showInputBox` | inside the create handler | The minimal MVP input. CHUNK-05 replaces this with a webview for raw idea capture. |
| `vscode.EventEmitter<T>` + `vscode.Event<T>` | `projectRegistry.ts`, `stageTreeProvider.ts` | Standard tree-data-provider refresh pattern. |
| `vscode.TreeItem` + `vscode.TreeItemCollapsibleState` | `stageTreeNodes.ts` | Stages collapse-by-default; artefacts (when they exist in later chunks) will be leaves with `None`. |
| `vscode.ThemeIcon('rocket')` etc. | `stageTreeNodes.ts` | Renders Codicons in the gutter; theme-aware. |
| `vscode.ExtensionContext.subscriptions.push(...)` | `extension.ts` | Standard disposable hygiene. |
| `vscode.workspace.workspaceFolders` | `extension.ts` (read only — log if undefined) | Capability-declaration belt-and-braces: even though `untrustedWorkspaces` and `virtualWorkspaces` are `false`, defensively no-op the create command when no folder is open and surface a message. |

### Contributes (declarative, in `package.json`)

- `viewsContainers.activitybar[*]` — registers the DeliveryOS container with its activity-bar icon.
- `views[deliveryos][*]` — registers the `deliveryos.stages` tree view under that container.
- `viewsWelcome[*]` — declares the empty-state markdown.
- `commands[*]` — declares both commands so they appear in the command palette.
- `capabilities` — declares the workspace-trust posture.

---

## 5. `package.json` contributions — concrete sketch

```jsonc
{
  "name": "deliveryos",
  "displayName": "DeliveryOS",
  "description": "A meta-harness for AI-assisted software delivery. Sits above Claude Code / Codex / Cursor as the SDLC memory and orchestration layer.",
  "version": "0.0.1",
  "publisher": "deliveryos",
  "license": "MIT",
  "icon": "media/deliveryos-logo.png",
  "engines": { "vscode": "^1.85.0" },

  "categories": ["Other"],
  "keywords": ["sdlc", "ai", "claude-code", "codex", "harness", "memory"],

  "activationEvents": [
    "onStartupFinished"
  ],

  "main": "./dist/extension.js",

  "capabilities": {
    "untrustedWorkspaces": {
      "supported": false,
      "description": "DeliveryOS reads and writes .deliveryos-handoff/ and .deliveryos/, runs terminals against the workspace, and reads source files for Codebase Memory. It cannot safely run on untrusted code."
    },
    "virtualWorkspaces": {
      "supported": false,
      "description": "DeliveryOS requires a local filesystem to write the handoff directory and the memory store. Virtual workspaces (GitHub repos, remote tunnels without a local checkout) are not supported."
    }
  },

  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "deliveryos",
          "title": "DeliveryOS",
          "icon": "media/icon-rocket.svg"
        }
      ]
    },
    "views": {
      "deliveryos": [
        {
          "id": "deliveryos.stages",
          "name": "Stages",
          "contextualTitle": "DeliveryOS",
          "icon": "media/icon-rocket.svg"
        }
      ]
    },
    "viewsWelcome": [
      {
        "view": "deliveryos.stages",
        "contents": "**Welcome to DeliveryOS**\n\nA harness around your harness.\n\nDeliveryOS turns a raw idea into a verified release through four stages: DISCOVER → DEFINE → EXECUTE → VERIFY.\n\n[Create a project](command:deliveryos.project.create)\n\nLearn more in the [README](https://github.com/saifgithub/DeliveryOS#readme).",
        "when": "!deliveryos.hasProject"
      }
    ],
    "commands": [
      {
        "command": "deliveryos.project.create",
        "title": "DeliveryOS: Create Project",
        "category": "DeliveryOS",
        "icon": "$(add)"
      },
      {
        "command": "deliveryos.stages.refresh",
        "title": "DeliveryOS: Refresh Stage Tree",
        "category": "DeliveryOS",
        "icon": "$(refresh)"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "deliveryos.stages.refresh",
          "when": "view == deliveryos.stages",
          "group": "navigation"
        }
      ]
    }
  },

  "scripts": {
    "clean":   "rimraf dist *.vsix",
    "compile": "tsc -p ./",
    "watch":   "tsc -watch -p ./",
    "package": "npm run clean && npm run compile && vsce package --no-dependencies",
    "vscode:prepublish": "npm run compile"
  },

  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node":   "^20.0.0",
    "typescript":    "^5.4.0",
    "rimraf":        "^5.0.0",
    "@vscode/vsce":  "^3.0.0"
  }
}
```

### Notes on the JSON

- `activationEvents: ["onStartupFinished"]` — explicit, per research finding §11. Implicit activation from contributed commands and views also applies (VS Code 1.74+). Avoid `*`.
- `capabilities` — both fields are required by research finding §7. The strings are user-facing if VS Code surfaces them in the trust warning, so they explain *why*.
- `viewsWelcome[*].when` — the `!deliveryos.hasProject` context key is set in `projectCreate.ts` after a successful create. CHUNK-03 will additionally set it on activation if a persisted project is found.
- `menus.view/title` — adds the refresh button to the tree view's title bar. Trivial wins for development DX.
- `vsce package --no-dependencies` — the trimmed MVP has zero runtime deps in this chunk. CHUNK-02 will switch to `--dependencies` once `vscode-messenger` lands.
- No `extensionDependencies`, no `extensionKind` — both ship-in-a-single-process for now; CHUNK-04 reviews the multi-editor matrix.

---

## 6. Build pipeline

### `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2022"],
    "sourceMap": true,
    "strict": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", ".vscode-test"]
}
```

Rationale: extensions run in the VS Code Electron host as CommonJS; ES2022 is the safe target across all five sideload editors (VS Code 1.85+, Cursor, Windsurf, VSCodium, Antigravity all bundle modern V8). Strict mode catches the largest class of "extension fails to activate" errors before they leave the dev loop.

### `.vscodeignore`

```
.vscode/**
.gitignore
.eslintrc*
node_modules/**
src/**
**/*.map
**/*.ts
!dist/**/*.js
tsconfig.json
docs/**
*.vsix
```

Only `dist/`, `media/`, `package.json`, `README.md`, and `LICENSE` need to be in the `.vsix`.

### npm scripts (already shown in §5)

- `npm run compile` → `dist/extension.js` plus type maps.
- `npm run watch` → incremental compile for dev.
- `npm run package` → clean, compile, run `@vscode/vsce package`, output `deliveryos-0.0.1.vsix` to the repo root.

### `@vscode/vsce`

- Pinned to `^3.0.0` (the post-2024 rewrite; it's the modern packager and is what the GitHub Action in CHUNK-04 will use too).
- `--no-dependencies` flag is safe in this chunk because we have no runtime deps. CHUNK-02 (Vite + React) and CHUNK-03 (`sql.js`) flip this to bundling via `--dependencies` or to a bundler (esbuild) — that decision is made in CHUNK-02.

---

## 7. Step-by-step implementation outline

Sized for a single dev at 5–10 hrs/week. Each numbered step is roughly half a session (~90 min).

1. **Initialise the package.** `npm init -y`. Edit `package.json` down to a minimal shape; add `engines.vscode`, `main`, `categories`. Run `npx vsce ls` once to confirm we have the toolchain.
2. **TypeScript wiring.** Add `typescript`, `@types/vscode`, `@types/node` as devDeps. Add `tsconfig.json` per §6. Add `npm run compile`. Create `src/extension.ts` with an empty `activate()` that calls `console.log('DeliveryOS activated')`. Compile → confirm `dist/extension.js` exists.
3. **First package & smoke install.** Add `@vscode/vsce`, `rimraf` devDeps. Add the `package` script. Run `npm run package`. Run `code --install-extension deliveryos-0.0.1.vsix`. Open VS Code, open Output → "Extension Host" log, confirm the `activate` message fires.
4. **Activity-bar icon + empty tree view.** Add `media/icon-rocket.svg`. Add the `viewsContainers.activitybar` and `views` contributions per §5. Implement a stub `StageTreeProvider` that returns an empty array. Register it in `activate()` via `vscode.window.createTreeView`. Repackage → reinstall → confirm the rocket icon appears in the activity bar and clicking it reveals an empty "Stages" view.
5. **Static stage nodes.** Implement `src/stages/stageDefinitions.ts` and `src/stages/stageTreeNodes.ts`. Update `StageTreeProvider.getChildren()` to return the four stages at the root. Each stage gets a Codicon (`lightbulb` / `checklist` / `rocket` / `verified`) and a description. Repackage → reinstall → confirm the four rows render in order.
6. **Capabilities + activation event.** Add `capabilities.untrustedWorkspaces` and `capabilities.virtualWorkspaces` (both `supported: false`) plus `activationEvents: ["onStartupFinished"]` to `package.json`. Repackage → reinstall. Open a workspace flagged as untrusted (toggle via the trust UI) and confirm the extension is disabled with the explanatory message. **Ordering note (added DOS:O4 iteration-3):** pre-including `activationEvents: ["onStartupFinished"]` at step 1 is also acceptable — and is in fact preferable when verifying step 3's smoke install (a step-3 scope with no `contributes` has nothing to trigger implicit activation, so the `activate()` log line only fires reliably when `activationEvents` is already in place). DOS:R1 took this path. The capabilities-block half of this step remains here regardless.
7. **In-memory project registry.** Implement `src/projectRegistry.ts` with the `InMemoryProjectRegistry` class and `EventEmitter<void>`. Construct it in `activate()` and pass it to the tree provider. Tree provider's constructor subscribes to `onDidChange` and calls `refresh()`.
8. **The `deliveryos.project.create` command.** Implement `src/commands/projectCreate.ts` per §3.4. Register in `activate()`. Set the `deliveryos.hasProject` context key on success.
9. **`viewsWelcome`.** Add the welcome contribution to `package.json` per §5, gated on `!deliveryos.hasProject`. Repackage → reinstall → confirm the welcome markdown shows when there is no project, and the "Create a project" link works.
10. **Stage children gating.** Update `StageTreeProvider.getChildren()` to return `[]` when there is no active project (so the welcome view shows) and the four stages once a project exists. After "Create a project" the welcome view disappears and the four stages render.
11. **Refresh command + menu entry.** Implement `src/commands/stagesRefresh.ts`. Register it and add the `menus.view/title` contribution per §5. Confirm the refresh icon appears in the tree-view title bar and clicking it visibly fires `onDidChangeTreeData`.
12. **README skeleton + LICENSE.** Single-page README with install instructions (`code --install-extension`), the four-stages screenshot placeholder, and a "What's next" stub pointing at CHUNK-02. MIT LICENSE.
13. **Final package + verification.** `npm run clean && npm run package`. Inspect the `.vsix` (`unzip -l deliveryos-0.0.1.vsix`) — confirm `dist/extension.js`, `package.json`, `media/`, `README.md`, `LICENSE` are present and `src/`, `node_modules/`, `*.ts` are not.

Total: 12–13 half-sessions ≈ 6 hours/week × 1 week, fits the chunk's 4–6 session-day budget.

---

## 8. Test plan

No unit or integration tests at this layer (per the chunk row in part-1-plan.md — ext-host testing is overkill for the scaffold). Manual smoke is the verification.

### 8.1 Build smoke

- `npm run package` exits 0 and produces `deliveryos-0.0.1.vsix` in the repo root.
- `unzip -l deliveryos-0.0.1.vsix` content varies by step-slice (DOS:O4 iteration-3 audit annotation — the full 13-step session produces the full list; mid-session smokes verify a subset):
  - **Steps 1–3 (minimal scaffold):** `dist/extension.js`, `package.json`, `readme.md`. Expected size: ~3–5 KB. This is what DOS:R1 produced.
  - **Steps 1–6 (with icons + capabilities):** the above plus `media/icon-rocket.svg` (step 4), `media/deliveryos-logo.png` (step 4). Expected size: ~10–20 KB.
  - **Steps 1–13 (full session):** above plus `README.md` (step 12, expanded), `LICENSE` (step 12). Note: after CHUNK-02 the monorepo split means paths prefix with `extension/` — at CHUNK-01 the package root is still the repo root, so paths are flat. Expected size: ~20–40 KB.
- Across all slices: no `.ts` files, no `node_modules/`, no source maps unless intentionally included.
- The VSIX size is under 1MB (the floor before CHUNK-02 brings in React + Vite, and CHUNK-03 brings in `sql.js`). Material drift outside the expected per-slice band indicates a packaging regression (likely a `.vscodeignore` change that bloated or shrank the bundle).

### 8.2 Install smoke (VS Code only — Cursor / Windsurf land in CHUNK-04)

- `code --install-extension deliveryos-0.0.1.vsix` succeeds with `Extension 'deliveryos.deliveryos' v0.0.1 was successfully installed`.
- Restart VS Code. Open the Extensions sidebar → confirm DeliveryOS appears as an installed extension.

### 8.3 First-run UX

- The DeliveryOS rocket icon appears in the activity bar on first launch after install.
- Clicking it reveals the sidebar. The view title reads "Stages" with "DeliveryOS" as the contextual title.
- With no project, the welcome markdown shows: heading "Welcome to DeliveryOS", body text, and a "Create a project" link.
- Clicking the link opens the input box.
- Cancelling the input box returns to the welcome state. Submitting "Bug Triage Assistant" causes the welcome view to disappear and the four stage rows to render: DISCOVER, DEFINE, EXECUTE, VERIFY in order, each with its Codicon.
- Expanding any stage shows no children (no error, just an empty branch — confirms lazy `getChildren` returns `[]` cleanly).
- The refresh icon in the title bar fires without error.

### 8.4 Capability check

- Open the same VS Code window on a folder flagged as untrusted (via "File → Manage Workspace Trust → Restrict"). Confirm DeliveryOS is shown as "disabled in restricted mode" with the explanatory text from `capabilities.untrustedWorkspaces.description`.
- Open a virtual workspace (e.g. GitHub Codespaces remote, or `vscode-vfs://github/` URL). Confirm DeliveryOS is disabled with the virtual-workspace message.

### 8.5 Session lifetime

- After "Create project", close VS Code completely. Reopen. Confirm the welcome view shows again (because persistence is not in this chunk; CHUNK-03 will close this gap). Document this as expected behaviour in the README's "Known limitations" section.

### 8.6 Extension-host log

- Open "Output → Extension Host". Confirm no errors, no warnings about deprecated APIs, no unhandled-promise messages during the create flow.

---

## 9. Risks, edge cases and open questions

### Risks

- **Activity-bar icon legibility.** Lucide's `rocket` SVG is single-stroke; the VS Code activity-bar masks it to currentColor, so the stroke width has to be heavy enough to read at 24px. **Mitigation:** stroke-width 2px; smoke-test against both light and dark themes during step 4 of the implementation outline. If it's invisible at 24px, fall back to `git-branch` per the chunk's risks note.
- **Trust-warning UX.** Some sideload editors (Antigravity specifically — historical behaviour) may render the capability description aggressively. **Mitigation:** keep the description sentence neutral and factual. CHUNK-04 will verify on Antigravity.
- **CommonJS vs ESM extension migration.** VS Code is reportedly moving to ESM extensions over 2026. **Mitigation:** out of scope for this chunk. Pinning `engines.vscode: "^1.85.0"` (Nov 2023) buys us 18+ months of CJS support. Revisit before v0.2.

### Edge cases

- **No workspace open.** A user can run the create command with no folder open. The current spec stores the record anyway (in memory only). CHUNK-03 will need a workspace to write the SQLite file — at that point this becomes an error path. For this chunk: allow and document.
- **Empty project name.** `validateInput` rejects empty / whitespace-only. The handler returns `{ ok: false, reason: 'cancelled' }`.
- **Multiple workspace folders.** Multi-root workspaces are valid. Current chunk doesn't choose between them; CHUNK-03 will pick the first folder for the memory file and surface a multi-root chooser.
- **Re-running create with a project already active.** The current handler overwrites. Acceptable for MVP — CHUNK-03 will introduce a confirm dialog and per-project memory persistence.
- **Extension reloaded mid-session** (`Developer: Reload Window`). The in-memory registry is lost. Expected. Documented.

### Open questions (defer, not blockers)

1. **Should the activity-bar container show a badge** when the welcome state is active (i.e. a "start here" affordance)? The `view/badge` API is available. **Recommend:** defer to CHUNK-04 / CHUNK-05 when there is actual urgency content to badge.
2. **Should `deliveryos.project.create` be exposed via `keybindings`?** The command palette is sufficient for MVP. **Recommend:** defer.
3. **Codicon vs custom SVG for the activity-bar entry?** Codicons render automatically light/dark but cannot be used in `viewsContainers.icon`. The Lucide SVG is the right call. No question.
4. **Tree-item `contextValue` strings** — needed by CHUNK-05+ for context-menu wiring. **Recommend:** set `contextValue: 'deliveryos.stage.<id>'` even now, so downstream menus can target without us re-emitting in a later chunk.
5. **Telemetry.** None in this chunk. Open question for the project: ship with `vscode-telemetry` and an opt-out, or never collect? **Recommend:** decide before CHUNK-16. Out of scope here.

---

## 10. Explicit dependencies and downstream exposure

### Upstream — what must exist before this chunk

Nothing. CHUNK-01 is the foundation.

### Downstream — what this chunk exposes for later chunks

| Exposed surface | Consumer | How |
|-----------------|----------|-----|
| Extension activation point (`activate(context)` in `src/extension.ts`) | CHUNK-02 | CHUNK-02 inserts webview registration into the same `activate`. |
| `IProjectRegistry` interface | CHUNK-03 | CHUNK-03 implements `PersistedProjectRegistry implements IProjectRegistry` and swaps the binding in `activate`. The tree provider, the create command, and any later code see no difference. |
| `ProjectRecord` interface | CHUNK-03 | CHUNK-03 extends `ProjectRecord` to be the seed of an Intent Memory entry (adds `intentMemoryId` link, etc.). The base fields (`id`, `name`, `createdAt`) survive verbatim. |
| `deliveryos.project.create` command | CHUNK-03 | CHUNK-03 wraps the existing command to additionally write the Intent Memory entry to disk. The command signature in §3.4 is the contract. |
| `deliveryos.stages` tree view + `StageTreeProvider` | CHUNK-05 onwards | Each later chunk that adds an artefact kind (Intent → CHUNK-05; PRD → CHUNK-06; Requirements → CHUNK-07; Test Spec → CHUNK-08; Brief → CHUNK-09; Result → CHUNK-12; Verification → CHUNK-13/14) extends the `ArtefactNode` union and updates `getChildren` for the relevant stage. The contract is the discriminated union in §3.2. |
| `deliveryos.hasProject` context key | CHUNK-03 onwards | CHUNK-03 sets it on activation when a persisted project is detected. CHUNK-05+ may add further context keys (e.g. `deliveryos.hasIntent`). |
| `STAGE_DEFS` constant | every later chunk | Single source of truth for stage IDs and display names. Never re-declared. |
| Build pipeline (`npm run package` → `.vsix`) | CHUNK-02, CHUNK-04 | CHUNK-02 will graft the Vite build into the same `package` script. CHUNK-04 will run the same script from GitHub Actions. |

### Cross-chunk contracts honoured

Per part-1-plan.md § "Shared cross-chunk contracts":

- **Memory schema** — *not introduced here*. CHUNK-03 owns it. This chunk stores only an in-memory `ProjectRecord` and explicitly does not pre-empt the memory tables.
- **Webview message contracts** — n/a here; CHUNK-02 introduces them.
- **Execution Brief markdown schema** — n/a here; CHUNK-09.
- **Harness Profile schema** — n/a here; CHUNK-10.
- **Handoff directory layout** — n/a here; CHUNK-11. The capability declaration is forward-compatible with the eventual writes.
- **`.deliveryos/` memory directory layout** — n/a here; CHUNK-03.
- **Managed delimiter block syntax** — n/a here; CHUNK-10.

This chunk introduces exactly one new contract — the `IProjectRegistry` / `ProjectRecord` / `StageTreeNode` triplet — and writes them so CHUNK-03 can drop in persistence without touching `extension.ts` or the tree provider.

---

## Appendix A — Quick reference: the four default stages

From [docs/architecture/stage-configuration.md](../../architecture/stage-configuration.md) and [PRD § 9](../../PRD.md). Used verbatim by this chunk's `STAGE_DEFS`.

```text
DISCOVER → DEFINE → EXECUTE → VERIFY
```

- **DISCOVER.** Raw idea → discovery interview → draft PRD → stage configuration.
- **DEFINE.** Specialist expansion → requirements → design → codebase memory prep → test specification → execution brief.
- **EXECUTE.** File handoff via `.deliveryos-handoff/` → external coding harness work → result capture.
- **VERIFY.** Verification against test spec → memory update → release evidence.

Mid-stages (Security Review, Compliance, Legal, etc.) are deferred to a later build per part-1-plan.md scope.

---

## Appendix B — When this chunk is done

A reviewer running the manual smoke (§8) should be able to say:

> "I installed DeliveryOS from a sideloaded `.vsix` into VS Code. The activity-bar icon appeared. I clicked it, saw the welcome message, clicked 'Create a project', named it, and watched the four stages render. The extension behaves correctly on untrusted and virtual workspaces by refusing to activate. There is nothing else to do yet — the next chunk adds the first real surface."

That sentence is the bar.
