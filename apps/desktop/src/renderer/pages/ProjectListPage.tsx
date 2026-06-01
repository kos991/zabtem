import type { ReactElement } from 'react';
import type { ProjectRecord } from '../../shared/types/project';

export function ProjectListPage(props: {
  projects: ProjectRecord[];
  onCreate(): void;
  onOpen(project: ProjectRecord): void;
}): ReactElement {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>Switch template workspaces</h2>
        </div>
        <button type="button" className="primary-button" onClick={props.onCreate}>
          New project
        </button>
      </div>

      {props.projects.length === 0 ? (
        <div className="empty-state">
          <strong>No projects yet</strong>
          <p>Create the first switch workspace to store vendor, model, and SNMP profile data.</p>
        </div>
      ) : (
        <ul className="project-list">
          {props.projects.map((project) => (
            <li key={project.id}>
              <button type="button" className="project-card" onClick={() => props.onOpen(project)}>
                <strong>{project.name}</strong>
                <span>{project.vendor} {project.model}</span>
                <small>Role: {project.role} · Zabbix {project.zabbixVersion}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
