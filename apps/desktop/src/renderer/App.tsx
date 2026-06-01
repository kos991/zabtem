import { useEffect, useState, type ReactElement } from 'react';
import type { CreateProjectInput, ProjectRecord } from '../shared/types/project';
import type { SaveSnmpProfileInput, SnmpProfileRecord } from '../shared/types/snmp';
import { ProjectForm } from './components/ProjectForm';
import { ProjectListPage } from './pages/ProjectListPage';
import { ProjectWorkspacePage } from './pages/ProjectWorkspacePage';
import type { AppView } from './state/app-state';

export function App(): ReactElement {
  const [version, setVersion] = useState<string>('Loading...');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [view, setView] = useState<AppView>({ kind: 'list' });

  useEffect(() => {
    void window.zabtem.app.getVersion().then(setVersion).catch(() => setVersion('Version unavailable'));
    void refreshProjects();
  }, []);

  async function refreshProjects(): Promise<void> {
    const items = await window.zabtem.projects.list();
    setProjects(items);
  }

  async function openWorkspace(project: ProjectRecord): Promise<void> {
    const profiles = await window.zabtem.snmpProfiles.list(project.id);
    setView({
      kind: 'workspace',
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
    await openWorkspace(view.project);
  }

  async function deleteProfile(profileId: string): Promise<void> {
    if (view.kind !== 'workspace') {
      return;
    }

    await window.zabtem.snmpProfiles.remove(profileId);
    await openWorkspace(view.project);
  }

  return (
    <main className="shell app-layout">
      <header className="app-header panel">
        <div>
          <p className="eyebrow">Zabtem</p>
          <div>
            <h1>MIB2Zabbix Desktop</h1>
            <p className="lead">
              Project storage and SNMP profile management are now the active foundation layer.
            </p>
          </div>
        </div>
        <div className="meta-card">
          <span>Runtime version</span>
          <strong>{version}</strong>
          <small>Electron main + preload + renderer</small>
        </div>
      </header>

      {view.kind === 'list' ? (
        <ProjectListPage
          projects={projects}
          onCreate={() => setView({ kind: 'create-project' })}
          onOpen={(project) => void openWorkspace(project)}
        />
      ) : null}

      {view.kind === 'create-project' ? (
        <ProjectForm
          onSubmit={createProject}
          onCancel={() => setView({ kind: 'list' })}
        />
      ) : null}

      {view.kind === 'workspace' ? (
        <ProjectWorkspacePage
          project={view.project}
          profiles={view.profiles}
          onBack={() => setView({ kind: 'list' })}
          onSaveProfile={saveProfile}
          onDeleteProfile={deleteProfile}
        />
      ) : null}
    </main>
  );
}
