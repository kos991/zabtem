import type { DesktopDatabase } from './database';

const MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    vendor TEXT NOT NULL,
    model TEXT NOT NULL,
    role TEXT NOT NULL,
    zabbix_version TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS snmp_profiles (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    version TEXT NOT NULL,
    community_encrypted TEXT,
    v3_user TEXT,
    v3_security_level TEXT,
    v3_auth_protocol TEXT,
    v3_auth_password_encrypted TEXT,
    v3_priv_protocol TEXT,
    v3_priv_password_encrypted TEXT,
    timeout_ms INTEGER NOT NULL,
    retries INTEGER NOT NULL,
    bulk_size INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  `
] as const;

export function runMigrations(database: DesktopDatabase): void {
  database.pragma('foreign_keys = ON');

  for (const migration of MIGRATIONS) {
    database.exec(migration);
  }
}
