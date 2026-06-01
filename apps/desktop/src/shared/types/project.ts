export type ProjectRole = 'core' | 'aggregation' | 'access' | 'other';

export interface ProjectRecord {
  id: string;
  name: string;
  deviceType: 'switch';
  vendor: string;
  model: string;
  role: ProjectRole;
  zabbixVersion: '7.0 LTS';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  vendor: string;
  model: string;
  role: ProjectRole;
}

export interface UpdateProjectInput extends CreateProjectInput {
  id: string;
}
