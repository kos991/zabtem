# Desktop Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first real Electron + React + TypeScript + Vite desktop skeleton under `apps/desktop`, with a secure preload API that exposes `app.getVersion()` to the renderer.

**Architecture:** The app is split across Electron main, preload, renderer, and shared type boundaries. Main owns the native window and security settings; preload exposes one narrow API through `contextBridge`; renderer is plain React and never imports Node or Electron modules directly.

**Tech Stack:** pnpm workspace, TypeScript, Electron, React, Vite, Vitest-compatible root tooling, ESLint flat config.

---

## Source Context

Read before implementing:

- `docs/superpowers/specs/2026-05-30-desktop-skeleton-supervision-design.md`
- `docs/plans/2026-05-30-zabbix-template-generator-plan.md`
- `docs/plans/2026-05-30-zabbix-template-generator-design-notes.md`
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `.github/workflows/goal.yml`

Rules that must shape every task:

- Formal acceptance is GitHub Actions `goal=full`, not local command output.
- Local checks are still required before reporting the implementation state.
- Keep changes small and directly tied to this desktop skeleton.
- Do not implement SQLite, SNMP, MIB parser, OID matcher, classifier, or installer packaging in this increment.
- Do not copy GPL-3.0 code or structure from `my-mibbrowser`.
- Apply `karpathy`: simple, surgical, verifiable changes.
- Apply `browser-first-frontend-engineering`: secure browser boundary; low renderer complexity.
- Apply `computer-first-performance-engineering`: do not add unnecessary repeated work to scripts or hot paths.

## File Structure

Create:

- `apps/desktop/package.json` — desktop package scripts and dependencies.
- `apps/desktop/index.html` — Vite renderer HTML entry.
- `apps/desktop/vite.config.ts` — renderer build config.
- `apps/desktop/tsconfig.json` — desktop package TypeScript config.
- `apps/desktop/src/main/index.ts` — Electron main process and BrowserWindow setup.
- `apps/desktop/src/preload/index.ts` — safe `contextBridge` API exposure.
- `apps/desktop/src/renderer/main.tsx` — React bootstrap.
- `apps/desktop/src/renderer/App.tsx` — minimal skeleton UI.
- `apps/desktop/src/renderer/global.css` — minimal styles.
- `apps/desktop/src/shared/preload-api.ts` — shared preload API contract and global window typing.

Modify:

- `package.json` — add desktop dependencies and scripts.
- `tsconfig.json` — include `apps/**/*.ts` and `apps/**/*.tsx`.
- `scripts/build-skeleton.ts` — optionally verify desktop build artifacts exist if the implementation wires root build to desktop build; otherwise keep current skeleton output unchanged.
- `.github/workflows/goal.yml` — only if root scripts change and CI needs a new command; do not add release publishing.

Do not modify unless required by TypeScript or package manager behavior:

- `packages/core/**`
- `fixtures/**`
- `docs/plans/**`

---

### Task 1: Add workspace desktop package and dependencies

**Files:**

- Create: `apps/desktop/package.json`
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Create the desktop package manifest**

Create `apps/desktop/package.json` with this content:

```json
{
  "name": "@zabtem/desktop",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build && tsc -p tsconfig.json --outDir dist/main --rootDir src/main && tsc -p tsconfig.json --outDir dist/preload --rootDir src/preload",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "electron": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {}
}
```

- [ ] **Step 2: Add root scripts and dependencies**

Modify root `package.json` so the `scripts` block includes desktop commands while preserving existing scripts:

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit && pnpm --filter @zabtem/desktop typecheck",
    "test": "vitest run",
    "generate:template": "tsx scripts/generate-template.ts",
    "validate:template": "tsx scripts/validate-template.ts",
    "build": "tsx scripts/build-skeleton.ts && pnpm --filter @zabtem/desktop build",
    "desktop:dev": "pnpm --filter @zabtem/desktop dev",
    "desktop:build": "pnpm --filter @zabtem/desktop build"
  }
}
```

Add these root dev dependencies if they are not already present:

```json
{
  "devDependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest"
  }
}
```

Do not remove existing dependencies.

- [ ] **Step 3: Include app files in root TypeScript scope**

Modify root `tsconfig.json` include from:

```json
"include": ["packages/**/*.ts", "scripts/**/*.ts"]
```

to:

```json
"include": ["apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "scripts/**/*.ts"]
```

- [ ] **Step 4: Install dependency graph**

Run:

```powershell
corepack pnpm install
```

Expected:

- Exit code 0.
- `pnpm-lock.yaml` updates to include Electron, React, React DOM, Vite, and plugin dependencies.

- [ ] **Step 5: Verify package selection works**

Run:

```powershell
corepack pnpm --filter @zabtem/desktop typecheck
```

Expected initially:

- It may fail because no desktop source files exist yet.
- If it fails only because `apps/desktop/tsconfig.json` is missing, continue to Task 2.
- If it fails for package resolution or workspace filtering, fix package names before continuing.

---

### Task 2: Add desktop TypeScript and Vite configuration

**Files:**

- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/index.html`

- [ ] **Step 1: Create desktop TypeScript config**

Create `apps/desktop/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["node", "vite/client"],
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts"]
}
```

- [ ] **Step 2: Create Vite config for renderer build**

Create `apps/desktop/vite.config.ts`:

```ts
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
});
```

- [ ] **Step 3: Create renderer HTML entry**

Create `apps/desktop/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MIB2Zabbix Desktop</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Run desktop typecheck to expose missing source files**

Run:

```powershell
corepack pnpm --filter @zabtem/desktop typecheck
```

Expected:

- Failure is acceptable if it reports missing renderer/main/preload source files.
- Package resolution and config parsing must work.

---

### Task 3: Add shared preload API contract

**Files:**

- Create: `apps/desktop/src/shared/preload-api.ts`

- [ ] **Step 1: Create shared preload API type**

Create `apps/desktop/src/shared/preload-api.ts`:

```ts
export interface ZabtemPreloadApi {
  app: {
    getVersion: () => Promise<string>;
  };
}

declare global {
  interface Window {
    zabtem: ZabtemPreloadApi;
  }
}
```

- [ ] **Step 2: Run desktop typecheck**

Run:

```powershell
corepack pnpm --filter @zabtem/desktop typecheck
```

Expected:

- It may still fail because main, preload, and renderer entry files do not exist.
- It must not fail on syntax or global type declarations.

---

### Task 4: Add secure Electron main and preload processes

**Files:**

- Create: `apps/desktop/src/main/index.ts`
- Create: `apps/desktop/src/preload/index.ts`

- [ ] **Step 1: Create Electron main process**

Create `apps/desktop/src/main/index.ts`:

```ts
import { app, BrowserWindow } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const isDevelopment = process.env.VITE_DEV_SERVER_URL !== undefined;

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'MIB2Zabbix Desktop',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(currentDir, '../preload/index.js')
    }
  });

  if (isDevelopment) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL as string);
    return;
  }

  await window.loadFile(join(currentDir, '../renderer/index.html'));
}

app.whenReady().then(() => {
  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

- [ ] **Step 2: Create preload bridge**

Create `apps/desktop/src/preload/index.ts`:

```ts
import { contextBridge, app } from 'electron';
import type { ZabtemPreloadApi } from '../shared/preload-api';

const api: ZabtemPreloadApi = {
  app: {
    getVersion: async () => app.getVersion()
  }
};

contextBridge.exposeInMainWorld('zabtem', api);
```

- [ ] **Step 3: Run desktop typecheck**

Run:

```powershell
corepack pnpm --filter @zabtem/desktop typecheck
```

Expected:

- If Electron does not allow `app` in preload in this environment, replace `app.getVersion()` with `process.versions.electron` only after noting the deviation in the final report.
- It may still fail because renderer entry files do not exist.

---

### Task 5: Add React renderer skeleton

**Files:**

- Create: `apps/desktop/src/renderer/main.tsx`
- Create: `apps/desktop/src/renderer/App.tsx`
- Create: `apps/desktop/src/renderer/global.css`

- [ ] **Step 1: Create React bootstrap**

Create `apps/desktop/src/renderer/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './global.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Renderer root element was not found.');
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Create App component**

Create `apps/desktop/src/renderer/App.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { ZabtemPreloadApi } from '../shared/preload-api';

type VersionState =
  | { status: 'loading' }
  | { status: 'loaded'; value: string }
  | { status: 'failed'; message: string };

export function App(): JSX.Element {
  const [version, setVersion] = useState<VersionState>({ status: 'loading' });

  useEffect(() => {
    const api: ZabtemPreloadApi | undefined = window.zabtem;

    if (!api) {
      setVersion({ status: 'failed', message: 'Preload API is unavailable.' });
      return;
    }

    api.app
      .getVersion()
      .then((value) => setVersion({ status: 'loaded', value }))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown preload error.';
        setVersion({ status: 'failed', message });
      });
  }, []);

  return (
    <main className="app-shell">
      <section className="hero-card" aria-labelledby="app-title">
        <p className="eyebrow">Zabtem</p>
        <h1 id="app-title">MIB2Zabbix Desktop</h1>
        <p className="summary">
          桌面端骨架已加载。下一步将接入项目管理、SNMP Profile 和模板生成流程。
        </p>
        <dl className="status-list">
          <div>
            <dt>Renderer</dt>
            <dd>React + Vite</dd>
          </div>
          <div>
            <dt>Security</dt>
            <dd>contextIsolation enabled, nodeIntegration disabled</dd>
          </div>
          <div>
            <dt>App version</dt>
            <dd>{renderVersion(version)}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

function renderVersion(version: VersionState): string {
  if (version.status === 'loading') {
    return 'Loading...';
  }

  if (version.status === 'failed') {
    return version.message;
  }

  return version.value;
}
```

- [ ] **Step 3: Create minimal browser-conscious styles**

Create `apps/desktop/src/renderer/global.css`:

```css
:root {
  color: #172033;
  background: #f6f8fb;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input,
textarea,
select {
  font: inherit;
}

.app-shell {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 32px;
}

.hero-card {
  width: min(720px, 100%);
  border: 1px solid #d9e1ef;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgb(23 32 51 / 10%);
  padding: 40px;
}

.eyebrow {
  margin: 0 0 12px;
  color: #2563eb;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.5rem);
  line-height: 1.05;
}

.summary {
  margin: 20px 0 32px;
  color: #475569;
  font-size: 1rem;
  line-height: 1.7;
}

.status-list {
  display: grid;
  gap: 16px;
  margin: 0;
}

.status-list div {
  display: grid;
  gap: 4px;
  border-radius: 16px;
  background: #f8fafc;
  padding: 16px;
}

.status-list dt {
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-list dd {
  margin: 0;
  color: #0f172a;
  overflow-wrap: anywhere;
}
```

- [ ] **Step 4: Run desktop typecheck**

Run:

```powershell
corepack pnpm --filter @zabtem/desktop typecheck
```

Expected:

- Exit code 0 after any necessary type corrections.

---

### Task 6: Make desktop build work with Electron output layout

**Files:**

- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/tsconfig.json` if needed
- Modify: `apps/desktop/src/main/index.ts` if output paths differ

- [ ] **Step 1: Verify the initial desktop build command**

Run:

```powershell
corepack pnpm --filter @zabtem/desktop build
```

Expected:

- If it passes, continue to Step 4.
- If it fails because `tsconfig.json` sets `noEmit: true`, proceed to Step 2.
- If it fails because `rootDir` excludes shared imports, proceed to Step 3.

- [ ] **Step 2: Split build tsconfig from typecheck tsconfig if emit is blocked**

If `noEmit` blocks build output, create `apps/desktop/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": false,
    "sourceMap": true
  }
}
```

Then modify `apps/desktop/package.json` build script to:

```json
"build": "vite build && tsc -p tsconfig.build.json --outDir dist/main --rootDir src/main && tsc -p tsconfig.build.json --outDir dist/preload --rootDir src/preload"
```

- [ ] **Step 3: Fix shared type import output if rootDir fails**

If TypeScript fails because `src/preload/index.ts` imports `../shared/preload-api` outside `rootDir`, change the build script to compile all non-renderer TypeScript together:

```json
"build": "vite build && tsc -p tsconfig.build.json --outDir dist/electron --rootDir src"
```

Then update `apps/desktop/package.json` main field to:

```json
"main": "dist/electron/main/index.js"
```

And update `apps/desktop/src/main/index.ts` preload and renderer paths to:

```ts
preload: join(currentDir, '../preload/index.js')
```

and:

```ts
await window.loadFile(join(currentDir, '../../renderer/index.html'));
```

- [ ] **Step 4: Run desktop build again**

Run:

```powershell
corepack pnpm --filter @zabtem/desktop build
```

Expected:

- Exit code 0.
- `apps/desktop/dist/renderer/index.html` exists.
- Compiled Electron main and preload JavaScript files exist under the configured dist directory.

---

### Task 7: Wire root verification without breaking existing goal behavior

**Files:**

- Modify: `package.json`
- Modify: `.github/workflows/goal.yml` only if needed

- [ ] **Step 1: Run root build**

Run:

```powershell
corepack pnpm build
```

Expected:

- Existing skeleton artifacts are still written to `dist/desktop`.
- Desktop build also completes if root `build` now invokes `pnpm --filter @zabtem/desktop build`.

- [ ] **Step 2: Check GitHub Actions command compatibility**

Open `.github/workflows/goal.yml` and verify it still runs:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm lint
- run: pnpm typecheck
- run: pnpm test
- run: pnpm build
```

If root scripts already cover desktop typecheck/build, do not modify the workflow.

- [ ] **Step 3: Do not add release publishing**

Confirm `.github/workflows/goal.yml` does not create a GitHub Release. It should only upload artifacts for this increment.

---

### Task 8: Local preflight before formal GitHub Actions validation

**Files:**

- No code files unless verification exposes failures.

Local commands are only preflight checks. Passing them is not acceptance.

- [ ] **Step 1: Run lint**

Run:

```powershell
corepack pnpm lint
```

Expected:

- Exit code 0.

- [ ] **Step 2: Run typecheck**

Run:

```powershell
corepack pnpm typecheck
```

Expected:

- Exit code 0.

- [ ] **Step 3: Run tests**

Run:

```powershell
corepack pnpm test
```

Expected:

- Exit code 0.
- Existing core tests pass.

- [ ] **Step 4: Generate sample template**

Run:

```powershell
corepack pnpm generate:template
```

Expected:

- Exit code 0.
- `dist/templates/sample-template.yaml` is generated.

- [ ] **Step 5: Validate sample template**

Run:

```powershell
corepack pnpm validate:template
```

Expected:

- Exit code 0.
- Generated YAML validates.

- [ ] **Step 6: Run full build**

Run:

```powershell
corepack pnpm build
```

Expected:

- Exit code 0.
- `dist/desktop/mib2zabbix-desktop-windows-x86_64-skeleton.txt` exists.
- `dist/desktop/mib2zabbix-desktop-linux-x86_64-skeleton.txt` exists.
- `apps/desktop/dist/renderer/index.html` exists.
- Electron main and preload JavaScript output exists in `apps/desktop/dist`.

- [ ] **Step 7: Inspect git diff**

Run:

```powershell
git diff --stat
```

Expected:

- Changes are limited to the desktop skeleton, package/config files, lockfile, and docs created for this plan/spec.
- No unrelated core parser/generator refactors are present.

---

### Task 9: Commit and push for GitHub Actions formal validation

**Files:**

- No code files unless verification exposes failures.

This task is mandatory for project acceptance. Do not report the feature as complete before Task 10 has a passing GitHub Actions run.

- [ ] **Step 1: Confirm branch and status**

Run:

```powershell
git branch --show-current; git status --short
```

Expected:

- Branch is `codex/goal-skeleton` or another non-main feature branch.
- Status shows only intended project files.

- [ ] **Step 2: Commit the implementation and planning docs**

Run after reviewing the diff:

```powershell
git add .github .gitignore docs eslint.config.js fixtures package.json packages pnpm-lock.yaml pnpm-workspace.yaml scripts tools tsconfig.json apps
git commit -m @'
feat: add desktop skeleton

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
'@
```

Expected:

- Commit succeeds.
- Do not amend an existing commit.

- [ ] **Step 3: Push the feature branch**

Run only after the commit succeeds:

```powershell
git push -u origin codex/goal-skeleton
```

Expected:

- Branch is available on GitHub repository `https://github.com/kos991/zabtem.git`.

---

### Task 10: Run and verify GitHub Actions `goal=full`

**Files:**

- No code files unless GitHub Actions exposes failures that require a fix.

Formal acceptance is the GitHub Actions run, not local output.

- [ ] **Step 1: Trigger the formal goal workflow**

Run:

```powershell
gh workflow run goal.yml --repo kos991/zabtem --ref codex/goal-skeleton -f goal=full
```

Expected:

- Workflow dispatch succeeds.

- [ ] **Step 2: Capture the run id**

Run:

```powershell
gh run list --repo kos991/zabtem --workflow goal.yml --branch codex/goal-skeleton --limit 1
```

Expected:

- The newest run is the `goal` workflow for branch `codex/goal-skeleton`.
- Record the run id.

- [ ] **Step 3: Watch the run until completion**

Run, replacing `<run-id>` with the recorded id:

```powershell
gh run watch <run-id> --repo kos991/zabtem --exit-status
```

Expected:

- Exit code 0.
- `verify`, `generate-template`, and `build` jobs pass.
- Uploaded artifacts include the YAML sample artifact and desktop skeleton artifacts.

- [ ] **Step 4: If Actions fails, diagnose from logs before changing code**

Run, replacing `<run-id>` with the recorded id:

```powershell
gh run view <run-id> --repo kos991/zabtem --log-failed
```

Expected if failure occurs:

- Read the failing job and exact error.
- Apply systematic debugging before any fix.
- Make one focused fix, commit, push, and rerun `goal=full`.

- [ ] **Step 5: Report acceptance with evidence only after Actions passes**

Report:

```text
Formal GitHub Actions validation passed:
- workflow: goal.yml
- goal: full
- branch: codex/goal-skeleton
- run id: <run-id>
- jobs: verify, generate-template, build
- artifacts: sample-zabbix-template, desktop-* skeleton artifacts
```

Do not claim completion without this evidence.

---

## Self-Review

Spec coverage:

- The plan creates `apps/desktop` and the requested Electron + React + Vite skeleton.
- The plan defines the secure preload API and renderer version display.
- The plan excludes SQLite, SNMP, MIB parsing, matching, classifier, and installer packaging.
- The plan makes GitHub Actions `goal=full` the mandatory acceptance gate, not an optional follow-up.
- The plan applies the requested external agent skill rules as execution constraints.

Placeholder scan:

- No `TBD`, `TODO`, or vague future implementation steps remain.
- Conditional build-fix steps include exact files, code, commands, and expected outcomes.

Type consistency:

- The shared API is consistently named `ZabtemPreloadApi`.
- The global renderer object is consistently named `window.zabtem`.
- The only preload method is consistently named `app.getVersion()`.
