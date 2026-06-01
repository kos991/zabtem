import type {
  CreateProjectInput,
  ProjectRecord,
  UpdateProjectInput
} from './types/project';
import type { SaveSnmpProfileInput, SnmpProfileRecord } from './types/snmp';

export interface ZabtemPreloadApi {
  app: {
    getVersion(): Promise<string>;
  };
  projects: {
    list(): Promise<ProjectRecord[]>;
    create(input: CreateProjectInput): Promise<ProjectRecord>;
    update(input: UpdateProjectInput): Promise<ProjectRecord>;
    remove(projectId: string): Promise<void>;
  };
  snmpProfiles: {
    list(projectId: string): Promise<SnmpProfileRecord[]>;
    save(input: SaveSnmpProfileInput): Promise<SnmpProfileRecord>;
    remove(profileId: string): Promise<void>;
  };
}

declare global {
  interface Window {
    zabtem: ZabtemPreloadApi;
  }
}
