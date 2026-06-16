# Fast MVP Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current simulated SNMP template pipeline usable as an MVP: editable connection profile, reusable YAML output, saved run history, pasted walk samples, and a tighter workbench UI.

**Architecture:** Keep moving fast without adding persistence infrastructure beyond browser localStorage. Backend remains deterministic and stateless except for accepting user-provided payloads. Frontend owns MVP workflow state, form inputs, saved runs, and download/copy behavior.

**Tech Stack:** React + Vite + TDesign, browser localStorage, Rust Axum, serde/serde_yaml, Vitest + Testing Library.

---

## File Structure

- Modify `apps/desktop/src/renderer/App.tsx`: profile form, run history, sample paste/import, YAML copy/download.
- Modify `apps/desktop/src/renderer/App.test.tsx`: cover editable profile, YAML actions, history, imported samples.
- Modify `apps/desktop/src/renderer/styles.css`: compact form fields, history list, YAML toolbar.
- Modify `apps/desktop/src/renderer/api.ts`: allow caller-provided template name.
- Modify `apps/server/src/template.rs`: accept imported walk sample values through existing classify endpoint without changing response shape.

---

## Task 1: Editable SNMP Profile

**Files:**
- Modify: `apps/desktop/src/renderer/App.tsx`
- Modify: `apps/desktop/src/renderer/App.test.tsx`
- Modify: `apps/desktop/src/renderer/styles.css`

- [ ] **Step 1: Write failing frontend test**

Add to `apps/desktop/src/renderer/App.test.tsx`:

```tsx
test('uses the editable SNMP profile when running the connection test', async () => {
  render(<App />);

  await userEvent.clear(screen.getByTestId('profile-target'));
  await userEvent.type(screen.getByTestId('profile-target'), '10.0.0.15');
  await userEvent.clear(screen.getByTestId('profile-community'));
  await userEvent.type(screen.getByTestId('profile-community'), 'private');

  await userEvent.click(screen.getByTestId('run-snmp-test'));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/snmp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: '10.0.0.15',
        version: 'v2c',
        community: 'private'
      })
    });
  });
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
```

Expected: FAIL because `profile-target` does not exist.

- [ ] **Step 3: Add profile state and inputs**

In `App.tsx`, add:

```tsx
const [profile, setProfile] = useState({
  target: '192.168.1.10',
  version: 'v2c',
  community: 'public'
});
```

Replace hard-coded profile payloads in `runSnmpTest()` and `runSnmpWalk()` with:

```tsx
const currentProfile = {
  target: profile.target.trim(),
  version: profile.version,
  community: profile.community.trim()
};
```

Render editable inputs in the profile area:

```tsx
<div className="profile-form">
  <label>
    <span>目标地址</span>
    <input
      data-testid="profile-target"
      value={profile.target}
      onChange={(event) => setProfile((current) => ({ ...current, target: event.target.value }))}
    />
  </label>
  <label>
    <span>Community</span>
    <input
      data-testid="profile-community"
      value={profile.community}
      onChange={(event) => setProfile((current) => ({ ...current, community: event.target.value }))}
    />
  </label>
</div>
```

- [ ] **Step 4: Add CSS**

```css
.profile-form {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #fbfcfe;
}

.profile-form label {
  display: grid;
  gap: 5px;
}

.profile-form input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #cfd8e3;
  border-radius: 6px;
  color: #142033;
}
```

- [ ] **Step 5: Verify GREEN**

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/renderer/App.tsx apps/desktop/src/renderer/App.test.tsx apps/desktop/src/renderer/styles.css
git commit -m "feat: make snmp profile editable"
```

---

## Task 2: YAML Copy and Download

**Files:**
- Modify: `apps/desktop/src/renderer/App.tsx`
- Modify: `apps/desktop/src/renderer/App.test.tsx`
- Modify: `apps/desktop/src/renderer/styles.css`

- [ ] **Step 1: Write failing frontend test**

Add:

```tsx
test('copies generated yaml to the clipboard', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });

  render(<App />);

  await userEvent.click(screen.getByTestId('run-snmp-test'));
  await userEvent.click(await screen.findByTestId('run-snmp-walk'));
  await userEvent.click(await screen.findByTestId('run-oid-classify'));
  await userEvent.click(await screen.findByTestId('run-template-preview'));
  await userEvent.click(await screen.findByTestId('copy-template-yaml'));

  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('zabbix_export'));
});
```

- [ ] **Step 2: Verify RED**

```bash
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
```

Expected: FAIL because `copy-template-yaml` does not exist.

- [ ] **Step 3: Add copy/download actions**

In `App.tsx`, add:

```tsx
async function copyTemplateYaml() {
  if (templatePreview.status !== 'success') return;
  await navigator.clipboard.writeText(templatePreview.payload.yaml);
}

function downloadTemplateYaml() {
  if (templatePreview.status !== 'success') return;
  const blob = new Blob([templatePreview.payload.yaml], { type: 'application/x-yaml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'zabtem-template.yaml';
  link.click();
  URL.revokeObjectURL(url);
}
```

Render near the YAML preview:

```tsx
<div className="template-toolbar">
  <Button data-testid="copy-template-yaml" variant="outline" onClick={() => void copyTemplateYaml()}>
    复制 YAML
  </Button>
  <Button data-testid="download-template-yaml" variant="outline" onClick={downloadTemplateYaml}>
    下载 YAML
  </Button>
</div>
```

- [ ] **Step 4: Add CSS**

```css
.template-toolbar {
  display: flex;
  grid-column: 2;
  gap: 8px;
}
```

Mobile:

```css
.template-toolbar {
  grid-column: 1;
}
```

- [ ] **Step 5: Verify GREEN**

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/renderer/App.tsx apps/desktop/src/renderer/App.test.tsx apps/desktop/src/renderer/styles.css
git commit -m "feat: add yaml copy and download actions"
```

---

## Task 3: Run History in Local Storage

**Files:**
- Modify: `apps/desktop/src/renderer/App.tsx`
- Modify: `apps/desktop/src/renderer/App.test.tsx`
- Modify: `apps/desktop/src/renderer/styles.css`

- [ ] **Step 1: Write failing frontend test**

Add:

```tsx
test('stores successful template previews in run history', async () => {
  render(<App />);

  await userEvent.click(screen.getByTestId('run-snmp-test'));
  await userEvent.click(await screen.findByTestId('run-snmp-walk'));
  await userEvent.click(await screen.findByTestId('run-oid-classify'));
  await userEvent.click(await screen.findByTestId('run-template-preview'));

  await waitFor(() => {
    expect(screen.getByTestId('run-history').textContent).toContain('Template Zabtem Simulated SNMP');
    expect(window.localStorage.getItem('zabtem.runHistory')).toContain('Template Zabtem Simulated SNMP');
  });
});
```

- [ ] **Step 2: Verify RED**

```bash
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
```

Expected: FAIL because `run-history` does not exist.

- [ ] **Step 3: Add history state**

In `App.tsx`:

```tsx
type RunHistoryItem = {
  id: string;
  templateName: string;
  target: string;
  createdAt: string;
  itemCount: number;
};

const [runHistory, setRunHistory] = useState<RunHistoryItem[]>(() => {
  const saved = window.localStorage.getItem('zabtem.runHistory');
  return saved ? (JSON.parse(saved) as RunHistoryItem[]) : [];
});
```

After successful template preview:

```tsx
const entry: RunHistoryItem = {
  id: `${Date.now()}`,
  templateName: 'Template Zabtem Simulated SNMP',
  target: profile.target,
  createdAt: new Date().toISOString(),
  itemCount: classification.payload.items.length
};
setRunHistory((current) => {
  const next = [entry, ...current].slice(0, 8);
  window.localStorage.setItem('zabtem.runHistory', JSON.stringify(next));
  return next;
});
```

- [ ] **Step 4: Render history**

```tsx
<div className="run-history" data-testid="run-history">
  {runHistory.map((item) => (
    <div className="history-row" key={item.id}>
      <strong>{item.templateName}</strong>
      <span>{item.target} / {item.itemCount} items</span>
    </div>
  ))}
</div>
```

- [ ] **Step 5: Add CSS**

```css
.run-history {
  display: grid;
  gap: 8px;
}

.history-row {
  display: grid;
  gap: 3px;
  padding: 10px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #ffffff;
}
```

- [ ] **Step 6: Verify GREEN**

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/renderer/App.tsx apps/desktop/src/renderer/App.test.tsx apps/desktop/src/renderer/styles.css
git commit -m "feat: store template run history"
```

---

## Task 4: Paste Walk Sample

**Files:**
- Modify: `apps/desktop/src/renderer/App.tsx`
- Modify: `apps/desktop/src/renderer/App.test.tsx`
- Modify: `apps/desktop/src/renderer/styles.css`

- [ ] **Step 1: Write failing frontend test**

Add:

```tsx
test('classifies pasted walk samples without running snmp walk', async () => {
  render(<App />);

  await userEvent.type(
    screen.getByTestId('walk-sample-input'),
    '1.3.6.1.2.1.2.2.1.10.1 ifInOctets 42 counter'
  );
  await userEvent.click(screen.getByTestId('import-walk-sample'));
  await userEvent.click(screen.getByTestId('run-oid-classify'));

  await waitFor(() => {
    expect(screen.getByTestId('oid-classify-result').textContent).toContain('interfaces');
  });
});
```

- [ ] **Step 2: Verify RED**

```bash
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
```

Expected: FAIL because sample paste controls do not exist.

- [ ] **Step 3: Add parser**

In `App.tsx`:

```tsx
const [walkSampleText, setWalkSampleText] = useState('');

function importWalkSample() {
  const items = walkSampleText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [oid, name, value, valueType = 'text'] = line.split(/\s+/);
      return { oid, name, value, valueType };
    })
    .filter((item) => item.oid && item.name && item.value);

  if (items.length === 0) return;

  setWalk({
    status: 'success',
    payload: {
      target: profile.target,
      version: profile.version,
      items
    }
  });
}
```

- [ ] **Step 4: Render paste controls**

```tsx
<textarea
  className="walk-sample-input"
  data-testid="walk-sample-input"
  value={walkSampleText}
  onChange={(event) => setWalkSampleText(event.target.value)}
/>
<Button data-testid="import-walk-sample" variant="outline" onClick={importWalkSample}>
  导入 walk 样本
</Button>
```

- [ ] **Step 5: Add CSS**

```css
.walk-sample-input {
  grid-column: 2;
  min-height: 84px;
  resize: vertical;
  padding: 10px;
  border: 1px solid #cfd8e3;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
}
```

Mobile:

```css
.walk-sample-input {
  grid-column: 1;
}
```

- [ ] **Step 6: Verify GREEN**

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/renderer/App.tsx apps/desktop/src/renderer/App.test.tsx apps/desktop/src/renderer/styles.css
git commit -m "feat: import pasted snmp walk samples"
```

---

## Task 5: Push, Actions, Deploy

**Files:**
- No source edits expected.

- [ ] **Step 1: Run final local checks**

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

- [ ] **Step 2: Push**

```bash
git status --short --branch
git push origin main
```

- [ ] **Step 3: Wait for Actions**

Latest `main` CI must complete with success.

- [ ] **Step 4: Deploy**

On `root@192.168.0.142`, pull latest `main`, run `corepack pnpm install --frozen-lockfile`, `corepack pnpm build`, `cargo test -p zabtem-server`, restart server and Vite.

- [ ] **Step 5: Verify public URL**

Check:

```bash
curl -fsS http://127.0.0.1:5173/api/health
curl -fsS http://127.0.0.1:5173/
```

---

## Self-Review

- Spec coverage: This plan targets fast MVP hardening: editable inputs, export actions, run history, pasted samples, and deploy.
- Placeholder scan: No placeholder tasks are present. Every task has explicit files, tests, implementation snippets, commands, and commit messages.
- Type consistency: `SnmpProfileRequest`, `SnmpWalkItem`, `ClassifiedItem`, and `TemplatePreviewPayload` remain aligned with existing `api.ts`.
