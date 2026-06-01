# Desktop Interface Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the desktop renderer into a cohesive professional application shell with a workflow left rail, recent-project start page, project interior shell, and mixed-mode right context panel.

**Architecture:** Keep the current Electron main/preload/backend flow intact and concentrate the redesign in the React renderer. Split the shell into stable layout components so the same visual and interaction system can carry both current project/profile pages and future workflow destinations. Use placeholder content only for future steps, while fully reworking current pages into the new shell.

**Tech Stack:** Electron, React, TypeScript, Vite, existing preload API, CSS, Vitest, Testing Library.

---

## Source Context

Read before implementing:

- `docs/superpowers/specs/2026-06-01-desktop-interface-redesign-design.md`
- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/global.css`
- `apps/desktop/src/renderer/components/ProjectForm.tsx`
- `apps/desktop/src/renderer/components/SnmpProfileForm.tsx`
- `apps/desktop/src/renderer/pages/ProjectListPage.tsx`
- `apps/desktop/src/renderer/pages/ProjectWorkspacePage.tsx`
- `apps/desktop/src/renderer/state/app-state.ts`
- `apps/desktop/src/shared/types/project.ts`
- `apps/desktop/src/shared/types/snmp.ts`
- `apps/desktop/src/shared/preload-api.ts`

Rules that must shape every task:

- Do not change the backend product scope.
- Do not add new business capabilities.
- Keep the redesign renderer-first and shell-focused.
- Preserve free navigation between workflow steps.
- Preserve the recent-project start page requirement.
- Keep future workflow pages reachable, even when still empty.
- Use TDD for renderer behavior changes.

## File Structure

Create:

- `apps/desktop/src/renderer/components/AppShell.tsx`
- `apps/desktop/src/renderer/components/WorkflowSidebar.tsx`
- `apps/desktop/src/renderer/components/TopBar.tsx`
- `apps/desktop/src/renderer/components/ContextPanel.tsx`
- `apps/desktop/src/renderer/components/EmptyStepState.tsx`
- `apps/desktop/src/renderer/components/RecentProjectList.tsx`
- `apps/desktop/src/renderer/components/StepStatusBadge.tsx`
- `apps/desktop/src/renderer/pages/StepPlaceholderPage.tsx`
- `apps/desktop/src/renderer/App.test.tsx`

Modify:

- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/global.css`
- `apps/desktop/src/renderer/components/ProjectForm.tsx`
- `apps/desktop/src/renderer/components/SnmpProfileForm.tsx`
- `apps/desktop/src/renderer/pages/ProjectListPage.tsx`
- `apps/desktop/src/renderer/pages/ProjectWorkspacePage.tsx`
- `apps/desktop/src/renderer/state/app-state.ts`

Do not modify unless required by type flow:

- `apps/desktop/src/main/**`
- `apps/desktop/src/preload/**`
- `apps/desktop/src/shared/**`

## Workflow Model

Use this exact workflow navigation list:

```ts
export type WorkflowStep =
  | 'projects'
  | 'snmp-collection'
  | 'mib-management'
  | 'oid-matching'
  | 'candidate-review'
  | 'template-preview';
```

Labels:

- `projects` -> `项目`
- `snmp-collection` -> `SNMP 采集`
- `mib-management` -> `MIB 管理`
- `oid-matching` -> `OID 匹配`
- `candidate-review` -> `候选项审核`
- `template-preview` -> `模板预览`

Right panel tabs:

```ts
export type ContextTab = 'properties' | 'guide' | 'logs';
```

Labels:

- `properties` -> `属性`
- `guide` -> `说明`
- `logs` -> `日志`

---

### Task 1: Add the renderer shell state model

**Files:**

- Modify: `apps/desktop/src/renderer/state/app-state.ts`
- Create: `apps/desktop/src/renderer/App.test.tsx`

- [ ] **Step 1: Write the failing shell navigation test**

Create `apps/desktop/src/renderer/App.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

beforeEach(() => {
  window.zabtem = {
    app: {
      getVersion: vi.fn().mockResolvedValue('0.0.0')
    },
    projects: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn()
    },
    snmpProfiles: {
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      remove: vi.fn()
    }
  };
});

describe('App shell', () => {
  it('renders the recent-project home and allows switching to another workflow step', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Recent projects');
    await user.click(screen.getByRole('button', { name: 'SNMP 采集' }));

    expect(screen.getByText('SNMP 采集')).toBeInTheDocument();
    expect(screen.getByText('This workflow step is not wired yet.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
```

Expected:

- FAIL because the current app does not have workflow navigation or a placeholder step page.

- [ ] **Step 3: Expand the renderer state model**

Modify `apps/desktop/src/renderer/state/app-state.ts`:

```ts
import type { ProjectRecord } from '../../shared/types/project';
import type { SnmpProfileRecord } from '../../shared/types/snmp';

export type WorkflowStep =
  | 'projects'
  | 'snmp-collection'
  | 'mib-management'
  | 'oid-matching'
  | 'candidate-review'
  | 'template-preview';

export type ContextTab = 'properties' | 'guide' | 'logs';

export type AppView =
  | {
      kind: 'recent-projects';
      step: 'projects';
      activeContextTab: ContextTab;
    }
  | {
      kind: 'create-project';
      step: 'projects';
      activeContextTab: ContextTab;
    }
  | {
      kind: 'workspace';
      step: WorkflowStep;
      activeContextTab: ContextTab;
      project: ProjectRecord;
      profiles: SnmpProfileRecord[];
    };
```

- [ ] **Step 4: Commit the shell state model**

Run:

```powershell
git add apps/desktop/src/renderer/state/app-state.ts apps/desktop/src/renderer/App.test.tsx
git commit -m "feat: add desktop shell state model"
```

---

### Task 2: Build the reusable application shell components

**Files:**

- Create: `apps/desktop/src/renderer/components/AppShell.tsx`
- Create: `apps/desktop/src/renderer/components/WorkflowSidebar.tsx`
- Create: `apps/desktop/src/renderer/components/TopBar.tsx`
- Create: `apps/desktop/src/renderer/components/ContextPanel.tsx`
- Create: `apps/desktop/src/renderer/components/StepStatusBadge.tsx`
- Create: `apps/desktop/src/renderer/components/EmptyStepState.tsx`
- Create: `apps/desktop/src/renderer/pages/StepPlaceholderPage.tsx`

- [ ] **Step 1: Create workflow step metadata component**

Create `apps/desktop/src/renderer/components/StepStatusBadge.tsx`:

```tsx
import type { ReactElement } from 'react';

export function StepStatusBadge(props: {
  tone: 'idle' | 'active' | 'pending';
  children: string;
}): ReactElement {
  return <span className={`step-status step-status-${props.tone}`}>{props.children}</span>;
}
```

- [ ] **Step 2: Create workflow sidebar**

Create `apps/desktop/src/renderer/components/WorkflowSidebar.tsx`:

```tsx
import type { ReactElement } from 'react';
import type { WorkflowStep } from '../state/app-state';
import { StepStatusBadge } from './StepStatusBadge';

const items: Array<{
  step: WorkflowStep;
  label: string;
  badge?: string;
}> = [
  { step: 'projects', label: '项目' },
  { step: 'snmp-collection', label: 'SNMP 采集', badge: 'Next' },
  { step: 'mib-management', label: 'MIB 管理' },
  { step: 'oid-matching', label: 'OID 匹配' },
  { step: 'candidate-review', label: '候选项审核' },
  { step: 'template-preview', label: '模板预览' }
];

export function WorkflowSidebar(props: {
  currentStep: WorkflowStep;
  projectName?: string;
  onSelect(step: WorkflowStep): void;
}): ReactElement {
  return (
    <aside className="workflow-sidebar">
      <div className="workflow-sidebar-header">
        <p className="eyebrow">Zabtem</p>
        <strong>MIB2Zabbix Desktop</strong>
        <small>{props.projectName ?? 'Recent projects'}</small>
      </div>

      <nav className="workflow-nav" aria-label="Workflow navigation">
        {items.map((item) => (
          <button
            key={item.step}
            type="button"
            className={item.step === props.currentStep ? 'workflow-link active' : 'workflow-link'}
            onClick={() => props.onSelect(item.step)}
          >
            <span>{item.label}</span>
            {item.badge ? <StepStatusBadge tone="pending">{item.badge}</StepStatusBadge> : null}
          </button>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Create top bar**

Create `apps/desktop/src/renderer/components/TopBar.tsx`:

```tsx
import type { ReactElement, ReactNode } from 'react';

export function TopBar(props: {
  title: string;
  description: string;
  version: string;
  actions?: ReactNode;
}): ReactElement {
  return (
    <header className="top-bar">
      <div>
        <h1>{props.title}</h1>
        <p>{props.description}</p>
      </div>

      <div className="top-bar-meta">
        <div className="runtime-pill">
          <span>Runtime</span>
          <strong>{props.version}</strong>
        </div>
        {props.actions ? <div className="top-bar-actions">{props.actions}</div> : null}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create context panel**

Create `apps/desktop/src/renderer/components/ContextPanel.tsx`:

```tsx
import type { ReactElement, ReactNode } from 'react';
import type { ContextTab } from '../state/app-state';

export function ContextPanel(props: {
  activeTab: ContextTab;
  onTabChange(tab: ContextTab): void;
  properties: ReactNode;
  guide: ReactNode;
  logs: ReactNode;
}): ReactElement {
  const tabs: Array<{ id: ContextTab; label: string }> = [
    { id: 'properties', label: '属性' },
    { id: 'guide', label: '说明' },
    { id: 'logs', label: '日志' }
  ];

  return (
    <aside className="context-panel">
      <div className="context-panel-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === props.activeTab ? 'context-tab active' : 'context-tab'}
            onClick={() => props.onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="context-panel-body">
        {props.activeTab === 'properties' ? props.properties : null}
        {props.activeTab === 'guide' ? props.guide : null}
        {props.activeTab === 'logs' ? props.logs : null}
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Create empty workflow step state**

Create `apps/desktop/src/renderer/components/EmptyStepState.tsx`:

```tsx
import type { ReactElement } from 'react';

export function EmptyStepState(props: {
  title: string;
  body: string;
}): ReactElement {
  return (
    <section className="empty-step">
      <p className="eyebrow">Workflow</p>
      <h2>{props.title}</h2>
      <p>{props.body}</p>
    </section>
  );
}
```

Create `apps/desktop/src/renderer/pages/StepPlaceholderPage.tsx`:

```tsx
import type { ReactElement } from 'react';
import { EmptyStepState } from '../components/EmptyStepState';

export function StepPlaceholderPage(props: {
  label: string;
}): ReactElement {
  return (
    <EmptyStepState
      title={props.label}
      body="This workflow step is not wired yet."
    />
  );
}
```

- [ ] **Step 6: Create the shell frame**

Create `apps/desktop/src/renderer/components/AppShell.tsx`:

```tsx
import type { ReactElement, ReactNode } from 'react';
import type { ContextTab, WorkflowStep } from '../state/app-state';
import { ContextPanel } from './ContextPanel';
import { TopBar } from './TopBar';
import { WorkflowSidebar } from './WorkflowSidebar';

export function AppShell(props: {
  currentStep: WorkflowStep;
  projectName?: string;
  title: string;
  description: string;
  version: string;
  activeContextTab: ContextTab;
  onStepSelect(step: WorkflowStep): void;
  onContextTabChange(tab: ContextTab): void;
  main: ReactNode;
  properties: ReactNode;
  guide: ReactNode;
  logs: ReactNode;
  actions?: ReactNode;
}): ReactElement {
  return (
    <main className="desktop-shell">
      <WorkflowSidebar
        currentStep={props.currentStep}
        projectName={props.projectName}
        onSelect={props.onStepSelect}
      />

      <section className="desktop-shell-main">
        <TopBar
          title={props.title}
          description={props.description}
          version={props.version}
          actions={props.actions}
        />
        <div className="desktop-shell-content">{props.main}</div>
      </section>

      <ContextPanel
        activeTab={props.activeContextTab}
        onTabChange={props.onContextTabChange}
        properties={props.properties}
        guide={props.guide}
        logs={props.logs}
      />
    </main>
  );
}
```

- [ ] **Step 7: Commit the shell components**

Run:

```powershell
git add apps/desktop/src/renderer/components apps/desktop/src/renderer/pages/StepPlaceholderPage.tsx
git commit -m "feat: add desktop renderer shell components"
```

---

### Task 3: Redesign the recent-project start page

**Files:**

- Create: `apps/desktop/src/renderer/components/RecentProjectList.tsx`
- Modify: `apps/desktop/src/renderer/pages/ProjectListPage.tsx`

- [ ] **Step 1: Create the recent project list component**

Create `apps/desktop/src/renderer/components/RecentProjectList.tsx`:

```tsx
import type { ReactElement } from 'react';
import type { ProjectRecord } from '../../shared/types/project';

export function RecentProjectList(props: {
  projects: ProjectRecord[];
  onOpen(project: ProjectRecord): void;
}): ReactElement {
  if (props.projects.length === 0) {
    return (
      <div className="recent-projects-empty">
        <strong>No recent projects</strong>
        <p>Create a project to start storing switch metadata and SNMP profiles.</p>
      </div>
    );
  }

  return (
    <ul className="recent-project-list">
      {props.projects.map((project) => (
        <li key={project.id}>
          <button type="button" className="recent-project-row" onClick={() => props.onOpen(project)}>
            <div className="recent-project-main">
              <strong>{project.name}</strong>
              <span>{project.vendor} / {project.model}</span>
            </div>
            <div className="recent-project-meta">
              <small>{project.role}</small>
              <small>{new Date(project.updatedAt).toLocaleString()}</small>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Rewrite the project page into a recent-project start page**

Modify `apps/desktop/src/renderer/pages/ProjectListPage.tsx`:

```tsx
import type { ReactElement } from 'react';
import type { ProjectRecord } from '../../shared/types/project';
import { RecentProjectList } from '../components/RecentProjectList';

export function ProjectListPage(props: {
  projects: ProjectRecord[];
  onCreate(): void;
  onOpen(project: ProjectRecord): void;
}): ReactElement {
  return (
    <section className="start-page-grid">
      <section className="panel start-hero">
        <p className="eyebrow">Recent projects</p>
        <h2>Resume the latest template workspace</h2>
        <p>
          Start from an existing switch project or create a new one before moving into SNMP
          collection, MIB loading, and template generation.
        </p>
        <div className="start-actions">
          <button type="button" className="primary-button" onClick={props.onCreate}>
            新建项目
          </button>
        </div>
      </section>

      <section className="panel recent-projects-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Projects</p>
            <h2>Recent projects</h2>
          </div>
        </div>
        <RecentProjectList projects={props.projects} onOpen={props.onOpen} />
      </section>
    </section>
  );
}
```

- [ ] **Step 3: Commit the recent-project page**

Run:

```powershell
git add apps/desktop/src/renderer/components/RecentProjectList.tsx apps/desktop/src/renderer/pages/ProjectListPage.tsx
git commit -m "feat: redesign recent project start page"
```

---

### Task 4: Refactor current forms and workspace into the new shell

**Files:**

- Modify: `apps/desktop/src/renderer/components/ProjectForm.tsx`
- Modify: `apps/desktop/src/renderer/components/SnmpProfileForm.tsx`
- Modify: `apps/desktop/src/renderer/pages/ProjectWorkspacePage.tsx`

- [ ] **Step 1: Reframe the project form for the new shell**

Modify `apps/desktop/src/renderer/components/ProjectForm.tsx` so it becomes shell content rather than a free-standing card:

```tsx
import { useState, type FormEvent, type ReactElement } from 'react';
import type { CreateProjectInput } from '../../shared/types/project';

export function ProjectForm(props: {
  onSubmit(input: CreateProjectInput): Promise<void>;
  onCancel(): void;
}): ReactElement {
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [role, setRole] = useState<CreateProjectInput['role']>('access');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await props.onSubmit({ name, vendor, model, role });
  }

  return (
    <section className="panel editor-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Project</p>
          <h2>Create a new project</h2>
        </div>
        <button type="button" className="ghost-button" onClick={props.onCancel}>
          返回
        </button>
      </div>

      <form className="editor-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="form-grid">
          <label>
            <span>Project name</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>Vendor</span>
            <input required value={vendor} onChange={(event) => setVendor(event.target.value)} />
          </label>
          <label>
            <span>Model</span>
            <input required value={model} onChange={(event) => setModel(event.target.value)} />
          </label>
          <label>
            <span>Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as CreateProjectInput['role'])}
            >
              <option value="core">Core</option>
              <option value="aggregation">Aggregation</option>
              <option value="access">Access</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">
            Create project
          </button>
        </div>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Reframe the SNMP profile editor as list/detail content**

Modify `apps/desktop/src/renderer/components/SnmpProfileForm.tsx` so it exposes a `profile-editor-layout` with:

- profile picker strip,
- editor section,
- less card-like framing,
- and the same data behavior as now.

Use this wrapper shape:

```tsx
return (
  <section className="panel editor-panel">
    <div className="panel-heading">
      <div>
        <p className="eyebrow">SNMP</p>
        <h2>Profile management</h2>
      </div>
      <div className="inline-actions">
        ...
      </div>
    </div>
    ...
  </section>
);
```

Do not change profile CRUD behavior in this task.

- [ ] **Step 3: Rewrite the workspace page as a center-column work surface**

Modify `apps/desktop/src/renderer/pages/ProjectWorkspacePage.tsx`:

```tsx
import type { ReactElement } from 'react';
import type { ProjectRecord } from '../../shared/types/project';
import type { SaveSnmpProfileInput, SnmpProfileRecord } from '../../shared/types/snmp';
import { SnmpProfileForm } from '../components/SnmpProfileForm';

export function ProjectWorkspacePage(props: {
  project: ProjectRecord;
  profiles: SnmpProfileRecord[];
  onBack(): void;
  onSaveProfile(input: SaveSnmpProfileInput): Promise<void>;
  onDeleteProfile(profileId: string): Promise<void>;
}): ReactElement {
  return (
    <div className="workspace-grid">
      <section className="panel project-summary-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>{props.project.name}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={props.onBack}>
            返回项目
          </button>
        </div>

        <dl className="summary-grid">
          <div><dt>Vendor</dt><dd>{props.project.vendor}</dd></div>
          <div><dt>Model</dt><dd>{props.project.model}</dd></div>
          <div><dt>Role</dt><dd>{props.project.role}</dd></div>
          <div><dt>Zabbix</dt><dd>{props.project.zabbixVersion}</dd></div>
        </dl>
      </section>

      <SnmpProfileForm
        projectId={props.project.id}
        profiles={props.profiles}
        onSave={props.onSaveProfile}
        onDelete={props.onDeleteProfile}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit the content-page refactor**

Run:

```powershell
git add apps/desktop/src/renderer/components/ProjectForm.tsx apps/desktop/src/renderer/components/SnmpProfileForm.tsx apps/desktop/src/renderer/pages/ProjectWorkspacePage.tsx
git commit -m "feat: refactor project workspace into shell content"
```

---

### Task 5: Wire the full shell into App.tsx

**Files:**

- Modify: `apps/desktop/src/renderer/App.tsx`

- [ ] **Step 1: Replace the ad hoc layout with AppShell**

Modify `apps/desktop/src/renderer/App.tsx`:

```tsx
import { useEffect, useState, type ReactElement } from 'react';
import type { CreateProjectInput, ProjectRecord } from '../shared/types/project';
import type { SaveSnmpProfileInput } from '../shared/types/snmp';
import { AppShell } from './components/AppShell';
import { ProjectForm } from './components/ProjectForm';
import { ProjectListPage } from './pages/ProjectListPage';
import { ProjectWorkspacePage } from './pages/ProjectWorkspacePage';
import { StepPlaceholderPage } from './pages/StepPlaceholderPage';
import type { AppView, ContextTab, WorkflowStep } from './state/app-state';

export function App(): ReactElement {
  const [version, setVersion] = useState('Loading...');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [view, setView] = useState<AppView>({
    kind: 'recent-projects',
    step: 'projects',
    activeContextTab: 'guide'
  });

  useEffect(() => {
    void window.zabtem.app.getVersion().then(setVersion).catch(() => setVersion('Version unavailable'));
    void refreshProjects();
  }, []);

  async function refreshProjects(): Promise<void> {
    const items = await window.zabtem.projects.list();
    setProjects(items);
  }

  async function openWorkspace(project: ProjectRecord, step: WorkflowStep = 'projects'): Promise<void> {
    const profiles = await window.zabtem.snmpProfiles.list(project.id);
    setView({
      kind: 'workspace',
      step,
      activeContextTab: 'properties',
      project,
      profiles
    });
  }

  async function createProject(input: CreateProjectInput): Promise<void> {
    const project = await window.zabtem.projects.create(input);
    await refreshProjects();
    await openWorkspace(project);
  }

  async function saveProfile(input: SaveSnmpProfileInput): Promise<void> {
    if (view.kind !== 'workspace') {
      return;
    }

    await window.zabtem.snmpProfiles.save(input);
    await openWorkspace(view.project, view.step);
  }

  async function deleteProfile(profileId: string): Promise<void> {
    if (view.kind !== 'workspace') {
      return;
    }

    await window.zabtem.snmpProfiles.remove(profileId);
    await openWorkspace(view.project, view.step);
  }

  function changeContextTab(tab: ContextTab): void {
    setView((current) => ({ ...current, activeContextTab: tab }));
  }

  function selectStep(step: WorkflowStep): void {
    setView((current) => {
      if (current.kind === 'workspace') {
        return { ...current, step };
      }

      if (step === 'projects') {
        return { ...current, step: 'projects' };
      }

      return current;
    });
  }

  return (
    <AppShell
      currentStep={view.step}
      projectName={view.kind === 'workspace' ? view.project.name : undefined}
      title={view.kind === 'recent-projects' ? 'Recent projects' : 'Project workflow'}
      description={
        view.kind === 'recent-projects'
          ? 'Resume an existing switch project or create a new one.'
          : 'Move freely through the workflow and configure the current project.'
      }
      version={version}
      activeContextTab={view.activeContextTab}
      onStepSelect={selectStep}
      onContextTabChange={changeContextTab}
      main={renderMain()}
      properties={renderProperties()}
      guide={renderGuide()}
      logs={renderLogs()}
    />
  );

  function renderMain(): ReactElement {
    if (view.kind === 'recent-projects') {
      return (
        <ProjectListPage
          projects={projects}
          onCreate={() =>
            setView({
              kind: 'create-project',
              step: 'projects',
              activeContextTab: 'guide'
            })
          }
          onOpen={(project) => void openWorkspace(project)}
        />
      );
    }

    if (view.kind === 'create-project') {
      return (
        <ProjectForm
          onSubmit={createProject}
          onCancel={() =>
            setView({
              kind: 'recent-projects',
              step: 'projects',
              activeContextTab: 'guide'
            })
          }
        />
      );
    }

    if (view.step === 'projects') {
      return (
        <ProjectWorkspacePage
          project={view.project}
          profiles={view.profiles}
          onBack={() =>
            setView({
              kind: 'recent-projects',
              step: 'projects',
              activeContextTab: 'guide'
            })
          }
          onSaveProfile={saveProfile}
          onDeleteProfile={deleteProfile}
        />
      );
    }

    return <StepPlaceholderPage label={workflowLabel(view.step)} />;
  }

  function renderProperties(): ReactElement {
    if (view.kind === 'workspace') {
      return (
        <div className="context-block">
          <h3>{view.project.name}</h3>
          <p>{view.project.vendor} / {view.project.model}</p>
          <p>Profiles: {view.profiles.length}</p>
        </div>
      );
    }

    return (
      <div className="context-block">
        <h3>Home</h3>
        <p>Recent projects, product state, and quick entry actions.</p>
      </div>
    );
  }

  function renderGuide(): ReactElement {
    if (view.kind === 'workspace') {
      return (
        <div className="context-block">
          <h3>Guide</h3>
          <p>Use 项目 to maintain identity and SNMP Profile before moving to collection.</p>
        </div>
      );
    }

    return (
      <div className="context-block">
        <h3>Guide</h3>
        <p>Open a recent project or create a new one to start the workflow.</p>
      </div>
    );
  }

  function renderLogs(): ReactElement {
    return (
      <div className="context-block">
        <h3>Logs</h3>
        <p>No dedicated renderer-side event log is implemented yet.</p>
      </div>
    );
  }
}

function workflowLabel(step: WorkflowStep): string {
  switch (step) {
    case 'projects':
      return '项目';
    case 'snmp-collection':
      return 'SNMP 采集';
    case 'mib-management':
      return 'MIB 管理';
    case 'oid-matching':
      return 'OID 匹配';
    case 'candidate-review':
      return '候选项审核';
    case 'template-preview':
      return '模板预览';
  }
}
```

- [ ] **Step 2: Commit the shell wiring**

Run:

```powershell
git add apps/desktop/src/renderer/App.tsx
git commit -m "feat: wire desktop renderer shell"
```

---

### Task 6: Replace the old CSS with the new professional shell system

**Files:**

- Modify: `apps/desktop/src/renderer/global.css`

- [ ] **Step 1: Replace global CSS with shell-focused layout styles**

Modify `apps/desktop/src/renderer/global.css` to define:

- cool gray base background
- fixed three-column shell
- workflow left rail
- top bar
- context panel tabs
- start page grid
- recent project list rows
- editor panel styles
- summary grid
- placeholder page styles
- responsive collapse for smaller widths

Use this structural CSS skeleton:

```css
:root {
  color: #16202f;
  background: #edf3f9;
  font-family: "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
}

button,
input,
select,
textarea {
  font: inherit;
}

.desktop-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 320px;
  min-height: 100vh;
  background:
    linear-gradient(180deg, #f3f7fb 0%, #edf3f9 100%);
}

.workflow-sidebar {
  background: #f7fbff;
  border-right: 1px solid #d6e0ea;
  padding: 24px 18px;
}

.workflow-nav {
  display: grid;
  gap: 8px;
  margin-top: 24px;
}

.workflow-link {
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 14px;
  color: #1f2b3d;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  text-align: left;
}

.workflow-link.active {
  background: #dff4ff;
  border-color: #8ed2f6;
  color: #0f4e73;
}

.desktop-shell-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 20px;
  padding: 24px;
}

.top-bar {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.top-bar h1 {
  margin: 0;
}

.top-bar p {
  color: #4e6176;
  margin: 8px 0 0;
}

.context-panel {
  background: #fbfdff;
  border-left: 1px solid #d6e0ea;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding: 20px 18px;
}

.context-panel-tabs {
  display: flex;
  gap: 8px;
}

.context-tab {
  background: #eef3f8;
  border: 1px solid #d5dfe9;
  border-radius: 999px;
  cursor: pointer;
  padding: 9px 14px;
}

.context-tab.active {
  background: #0f6ea8;
  border-color: #0f6ea8;
  color: #ffffff;
}

.panel,
.empty-step {
  background: #ffffff;
  border: 1px solid #d8e1ec;
  border-radius: 22px;
  box-shadow: 0 18px 36px rgb(15 32 54 / 8%);
  padding: 24px;
}

.start-page-grid,
.workspace-grid {
  display: grid;
  gap: 20px;
}

.start-page-grid {
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
}

.recent-project-list {
  display: grid;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-project-row {
  align-items: center;
  background: #f7fbff;
  border: 1px solid #d7e5f0;
  border-radius: 18px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  padding: 16px 18px;
  text-align: left;
  width: 100%;
}

.editor-form,
.profile-form {
  display: grid;
  gap: 20px;
}

.form-grid,
.summary-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.context-block h3,
.panel h2 {
  margin: 0;
}

.context-block p,
.empty-step p {
  color: #4f6174;
  line-height: 1.65;
}

@media (max-width: 1280px) {
  .desktop-shell {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .context-panel {
    grid-column: 1 / -1;
    border-left: 0;
    border-top: 1px solid #d6e0ea;
  }
}
```

Continue the file with the exact utility classes needed by the components above:

- `.eyebrow`
- `.step-status`
- `.step-status-pending`
- `.runtime-pill`
- `.primary-button`
- `.ghost-button`
- `.panel-heading`
- `.recent-project-main`
- `.recent-project-meta`
- `.empty-step`
- `.recent-projects-empty`
- `.editor-panel`
- `.summary-grid dt`
- `.summary-grid dd`
- `.inline-actions`
- `.form-actions`
- `.context-block`

- [ ] **Step 2: Commit the visual system**

Run:

```powershell
git add apps/desktop/src/renderer/global.css
git commit -m "feat: add desktop interface visual system"
```

---

### Task 7: Verify renderer redesign and formal acceptance

**Files:**

- No new files unless verification exposes failures.

- [ ] **Step 1: Run the renderer shell test**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
```

Expected:

- Exit code `0`.

- [ ] **Step 2: Run full repository lint**

Run:

```powershell
corepack pnpm lint
```

Expected:

- Exit code `0`.

- [ ] **Step 3: Run full repository typecheck**

Run:

```powershell
corepack pnpm typecheck
```

Expected:

- Exit code `0`.

- [ ] **Step 4: Run full repository tests**

Run:

```powershell
corepack pnpm test
```

Expected:

- Exit code `0`.

- [ ] **Step 5: Run full repository build**

Run:

```powershell
corepack pnpm build
```

Expected:

- Exit code `0`.
- Existing desktop skeleton artifacts still exist.

- [ ] **Step 6: Inspect git diff**

Run:

```powershell
git diff --stat
```

Expected:

- Changes are limited to renderer files, test files, and the design/plan docs.

- [ ] **Step 7: Commit the redesign increment**

Run:

```powershell
git add apps docs/superpowers/specs docs/superpowers/plans
git commit -m "feat: redesign desktop interface shell"
```

Expected:

- Commit succeeds on the feature branch.

- [ ] **Step 8: Push the branch**

Run:

```powershell
git push -u origin codex/goal-skeleton
```

Expected:

- Remote branch updates successfully.

- [ ] **Step 9: Trigger formal validation**

Run:

```powershell
gh workflow run goal.yml --repo kos991/zabtem --ref codex/goal-skeleton -f goal=full
```

Expected:

- Workflow dispatch succeeds.

- [ ] **Step 10: Capture the run id**

Run:

```powershell
gh run list --repo kos991/zabtem --workflow goal.yml --branch codex/goal-skeleton --limit 1
```

Expected:

- The newest run is the just-triggered `goal` workflow.

- [ ] **Step 11: Wait for completion**

Run:

```powershell
gh run watch <run-id> --repo kos991/zabtem --exit-status
```

Expected:

- Exit code `0`.
- `verify`, `generate-template`, and `build` jobs pass.

- [ ] **Step 12: Report formal acceptance**

Report only after the workflow passes:

```text
Formal GitHub Actions validation passed:
- workflow: goal.yml
- goal: full
- branch: codex/goal-skeleton
- run id: <run-id>
- jobs: verify, generate-template, build
```

---

## Self-Review

Spec coverage:

- The plan implements a full shell redesign rather than isolated page polish.
- It preserves the recent-project home requirement.
- It uses workflow-based left navigation.
- It preserves free project-internal navigation.
- It implements a mixed-mode right context panel.
- It reworks current project/profile pages into the new shell.
- It keeps future workflow pages reachable with proper empty states.

Placeholder scan:

- No `TODO`, `TBD`, or vague “style as needed” language remains.
- Tasks name exact files and expected code structure.

Type consistency:

- The plan consistently uses `WorkflowStep`, `ContextTab`, and the expanded `AppView` union.
- The shell responsibilities are isolated across `AppShell`, `WorkflowSidebar`, `TopBar`, and `ContextPanel`.
