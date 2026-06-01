import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import BetterSqlite3 from 'better-sqlite3';
import { runMigrations } from './migrations';

export type DesktopDatabase = InstanceType<typeof BetterSqlite3>;

export interface DesktopDatabaseOptions {
  userDataPath: string;
}

export function createDesktopDatabase(options: DesktopDatabaseOptions): DesktopDatabase {
  mkdirSync(options.userDataPath, { recursive: true });

  const filePath = join(options.userDataPath, 'zabtem.sqlite');
  const database = new BetterSqlite3(filePath);
  runMigrations(database);
  return database;
}
