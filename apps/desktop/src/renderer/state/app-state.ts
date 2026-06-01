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
      step: WorkflowStep;
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
