import { randomUUID } from 'node:crypto';
import type {
  CreateProjectInput,
  ProjectRecord,
  UpdateProjectInput
} from '../../shared/types/project';
import type { DesktopDatabase } from '../storage/database';

type ProjectRow = {
  id: string;
  name: string;
  device_type: 'switch';
  vendor: string;
  model: string;
  role: ProjectRecord['role'];
  zabbix_version: '7.0 LTS';
  created_at: string;
  updated_at: string;
};

export function createProjectStore(database: DesktopDatabase) {
  return {
    list(): ProjectRecord[] {
      const rows = database
        .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
        .all() as ProjectRow[];

      return rows.map(mapProjectRow);
    },
    create(input: CreateProjectInput): ProjectRecord {
      const now = new Date().toISOString();
      const id = randomUUID();

      database
        .prepare(
          `INSERT INTO projects (
             id, name, device_type, vendor, model, role, zabbix_version, created_at, updated_at
           ) VALUES (
             @id, @name, 'switch', @vendor, @model, @role, '7.0 LTS', @createdAt, @updatedAt
           )`
        )
        .run({
          ...input,
          id,
          createdAt: now,
          updatedAt: now
        });

      return this.getById(id);
    },
    update(input: UpdateProjectInput): ProjectRecord {
      const now = new Date().toISOString();

      database
        .prepare(
          `UPDATE projects
           SET name = @name,
               vendor = @vendor,
               model = @model,
               role = @role,
               updated_at = @updatedAt
           WHERE id = @id`
        )
        .run({
          ...input,
          updatedAt: now
        });

      return this.getById(input.id);
    },
    remove(projectId: string): void {
      database.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    },
    getById(projectId: string): ProjectRecord {
      const row = database.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
        | ProjectRow
        | undefined;

      if (!row) {
        throw new Error(`Project ${projectId} was not found.`);
      }

      return mapProjectRow(row);
    }
  };
}

function mapProjectRow(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    deviceType: row.device_type,
    vendor: row.vendor,
    model: row.model,
    role: row.role,
    zabbixVersion: row.zabbix_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
