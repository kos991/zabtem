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
              <span>
                {project.vendor} / {project.model}
              </span>
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
