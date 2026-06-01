import { useEffect, useState, type ReactElement } from 'react';
import type { CreateProjectInput, ProjectRecord } from '../shared/types/project';
import type { SaveSnmpProfileInput, SnmpConnectionTestResult } from '../shared/types/snmp';
import { AppShell } from './components/AppShell';
import { ProjectForm } from './components/ProjectForm';
import { ProjectListPage } from './pages/ProjectListPage';
import { ProjectWorkspacePage } from './pages/ProjectWorkspacePage';
import { SnmpCollectionPage } from './pages/SnmpCollectionPage';
import { StepPlaceholderPage } from './pages/StepPlaceholderPage';
import type { AppView, ContextTab, WorkflowStep } from './state/app-state';

const WORKFLOW_LABELS: Record<WorkflowStep, string> = {
  projects: '\u9879\u76ee',
  'snmp-collection': 'SNMP \u91c7\u96c6',
  'mib-management': 'MIB \u7ba1\u7406',
  'oid-matching': 'OID \u5339\u914d',
  'candidate-review': '\u5019\u9009\u9879\u5ba1\u6838',
  'template-preview': '\u6a21\u677f\u9884\u89c8'
};

export function App(): ReactElement {
  const [version, setVersion] = useState<string>('Loading...');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [view, setView] = useState<AppView>(createRecentProjectsView());

  useEffect(() => {
    void window.zabtem.app.getVersion().then(setVersion).catch(() => setVersion('Version unavailable'));
    void refreshProjects();
  }, []);

  async function refreshProjects(): Promise<void> {
    const items = await window.zabtem.projects.list();
    setProjects(items);
  }

  async function openWorkspace(
    project: ProjectRecord,
    step: WorkflowStep = 'projects',
    activeContextTab: ContextTab = 'properties'
  ): Promise<void> {
    const profiles = await window.zabtem.snmpProfiles.list(project.id);
    setView({
      kind: 'workspace',
      step,
      activeContextTab,
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
    await openWorkspace(view.project, view.step, view.activeContextTab);
  }

  async function deleteProfile(profileId: string): Promise<void> {
    if (view.kind !== 'workspace') {
      return;
    }

    await window.zabtem.snmpProfiles.remove(profileId);
    await openWorkspace(view.project, view.step, view.activeContextTab);
  }

  async function testSnmpConnection(profileId: string): Promise<SnmpConnectionTestResult> {
    return window.zabtem.snmpCollection.testConnection({ profileId });
  }

  function changeContextTab(tab: ContextTab): void {
    setView((current) => ({ ...current, activeContextTab: tab }));
  }

  function selectStep(step: WorkflowStep): void {
    setView((current) => {
      if (current.kind === 'workspace') {
        return { ...current, step };
      }

      if (current.kind === 'create-project') {
        return step === 'projects'
          ? { ...current, step: 'projects' }
          : createRecentProjectsView(step, current.activeContextTab);
      }

      return { ...current, step };
    });
  }

  return (
    <AppShell
      currentStep={view.step}
      projectName={view.kind === 'workspace' ? view.project.name : undefined}
      title={viewTitle(view)}
      description={viewDescription(view)}
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
    if (view.kind === 'create-project') {
      return (
        <ProjectForm
          onSubmit={createProject}
          onCancel={() => setView(createRecentProjectsView())}
        />
      );
    }

    if (view.kind === 'workspace' && view.step === 'projects') {
      return (
        <ProjectWorkspacePage
          project={view.project}
          profiles={view.profiles}
          onBack={() => setView(createRecentProjectsView())}
          onSaveProfile={saveProfile}
          onDeleteProfile={deleteProfile}
        />
      );
    }

    if (view.kind === 'workspace' && view.step === 'snmp-collection') {
      return (
        <SnmpCollectionPage
          profiles={view.profiles}
          onTestConnection={testSnmpConnection}
        />
      );
    }

    if (view.kind === 'recent-projects' && view.step === 'projects') {
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

    return <StepPlaceholderPage label={workflowLabel(view.step)} />;
  }

  function renderProperties(): ReactElement {
    if (view.kind === 'workspace') {
      return (
        <div className="context-block">
          <h3>{view.project.name}</h3>
          <p>
            {view.project.vendor} / {view.project.model}
          </p>
          <p>
            {'\u5f53\u524d\u6b65\u9aa4\uff1a'}
            {workflowLabel(view.step)}
          </p>
          <p>
            {'SNMP \u914d\u7f6e\u6570\uff1a'}
            {view.profiles.length}
          </p>
        </div>
      );
    }

    return (
      <div className="context-block">
        <h3>Home</h3>
        <p>
          {
            '\u4ece\u6700\u8fd1\u9879\u76ee\u5f00\u59cb\uff0c\u6216\u8005\u76f4\u63a5\u8df3\u8f6c\u5230\u672a\u6765\u6d41\u7a0b\u9875\u9762\u67e5\u770b\u6574\u4f53\u7ed3\u6784\u3002'
          }
        </p>
      </div>
    );
  }

  function renderGuide(): ReactElement {
    return (
      <div className="context-block">
        <h3>{workflowLabel(view.step)}</h3>
        <p>{workflowGuide(view.step, view.kind === 'workspace')}</p>
      </div>
    );
  }

  function renderLogs(): ReactElement {
    return (
      <div className="context-block">
        <h3>Logs</h3>
        <p>Renderer-side activity logging is reserved for a later iteration.</p>
      </div>
    );
  }
}

function createRecentProjectsView(
  step: WorkflowStep = 'projects',
  activeContextTab: ContextTab = 'guide'
): AppView {
  return {
    kind: 'recent-projects',
    step,
    activeContextTab
  };
}

function workflowLabel(step: WorkflowStep): string {
  return WORKFLOW_LABELS[step];
}

function viewTitle(view: AppView): string {
  if (view.kind === 'recent-projects' && view.step === 'projects') {
    return 'Recent projects';
  }

  if (view.kind === 'create-project') {
    return 'Create project';
  }

  if (view.kind === 'workspace' && view.step === 'projects') {
    return 'Project workspace';
  }

  return workflowLabel(view.step);
}

function viewDescription(view: AppView): string {
  if (view.kind === 'recent-projects' && view.step === 'projects') {
    return 'Resume an existing switch project or create a new one to enter the workflow.';
  }

  if (view.kind === 'create-project') {
    return 'Define project identity first, then continue into SNMP collection and template work.';
  }

  if (view.kind === 'workspace' && view.step === 'projects') {
    return 'Manage project metadata and SNMP profiles before moving into the downstream workflow.';
  }

  if (view.kind === 'workspace' && view.step === 'snmp-collection') {
    return 'Test saved SNMP profiles against the target device before running full walk collection.';
  }

  return 'This step is reachable now so the full product flow can be navigated before implementation.';
}

function workflowGuide(step: WorkflowStep, hasProject: boolean): string {
  switch (step) {
    case 'projects':
      return hasProject
        ? '\u5728\u8fd9\u91cc\u7ef4\u62a4\u9879\u76ee\u5143\u6570\u636e\u548c SNMP Profile\u3002\u540e\u7eed\u5404\u6b65\u9aa4\u53ef\u4ee5\u81ea\u7531\u8df3\u8f6c\uff0c\u4e0d\u53d7\u5411\u5bfc\u987a\u5e8f\u9650\u5236\u3002'
        : '\u5148\u6253\u5f00\u4e00\u4e2a\u6700\u8fd1\u9879\u76ee\uff0c\u6216\u8005\u65b0\u5efa\u9879\u76ee\uff0c\u518d\u8fdb\u5165\u540e\u7eed\u7684\u91c7\u96c6\u3001MIB \u548c\u6a21\u677f\u6d41\u7a0b\u3002';
    case 'snmp-collection':
      return hasProject
        ? '\u540e\u7eed\u4f1a\u5728\u8fd9\u91cc\u627f\u63a5 SNMP Walk\u3001\u6293\u53d6\u4efb\u52a1\u548c\u539f\u59cb\u7ed3\u679c\u7ba1\u7406\u3002'
        : '\u8fd9\u91cc\u9884\u7559\u7ed9 SNMP \u91c7\u96c6\u6d41\u7a0b\u3002\u5f53\u524d\u8fd8\u6ca1\u6709\u9879\u76ee\u4e0a\u4e0b\u6587\uff0c\u6240\u4ee5\u53ea\u663e\u793a\u5360\u4f4d\u72b6\u6001\u3002';
    case 'mib-management':
      return '\u8fd9\u91cc\u9884\u7559\u7ed9 MIB \u5bfc\u5165\u3001\u7d22\u5f15\u548c\u7248\u672c\u7ba1\u7406\u3002';
    case 'oid-matching':
      return '\u8fd9\u91cc\u9884\u7559\u7ed9 OID \u5339\u914d\u3001\u89c4\u5219\u7b5b\u9009\u548c\u5019\u9009\u6620\u5c04\u3002';
    case 'candidate-review':
      return '\u8fd9\u91cc\u9884\u7559\u7ed9\u5019\u9009\u76d1\u63a7\u9879\u5ba1\u6838\u3001\u53d6\u820d\u548c\u6700\u7ec8\u786e\u8ba4\u3002';
    case 'template-preview':
      return '\u8fd9\u91cc\u9884\u7559\u7ed9\u6a21\u677f\u9884\u89c8\u3001\u5bfc\u51fa\u548c\u751f\u6210\u7ed3\u679c\u68c0\u67e5\u3002';
  }
}
