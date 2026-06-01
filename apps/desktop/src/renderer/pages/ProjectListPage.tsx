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
            {'\u65b0\u5efa\u9879\u76ee'}
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
