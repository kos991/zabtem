import type { ProjectRecord } from '../../shared/types/project';
import type { SnmpProfileRecord } from '../../shared/types/snmp';

export type AppView =
  | { kind: 'list' }
  | { kind: 'create-project' }
  | {
      kind: 'workspace';
      project: ProjectRecord;
      profiles: SnmpProfileRecord[];
    };
