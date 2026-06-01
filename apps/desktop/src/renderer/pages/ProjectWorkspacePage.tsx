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
            {'\u8fd4\u56de\u9879\u76ee'}
          </button>
        </div>

        <dl className="summary-grid">
          <div>
            <dt>Vendor</dt>
            <dd>{props.project.vendor}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{props.project.model}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{props.project.role}</dd>
          </div>
          <div>
            <dt>Zabbix</dt>
            <dd>{props.project.zabbixVersion}</dd>
          </div>
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
