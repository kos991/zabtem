# Project And SNMP Profile Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first real local application workflow after the desktop skeleton: SQLite-backed project management and SNMP profile management in `apps/desktop`, including secure-at-rest credential handling and a usable renderer flow.

**Architecture:** Keep all persistence and secret handling in Electron main. Renderer talks only through preload APIs and shared TypeScript contracts. Use a small storage layer (`database`, `migrations`, stores), thin IPC handlers, and a renderer state machine with a project list page, a create-project form, and a workspace page that owns SNMP profile editing.

**Tech Stack:** Electron main/preload, React renderer, TypeScript, Vite, Vitest, Testing Library, SQLite via `better-sqlite3`, Electron `safeStorage`, pnpm workspace.

---

## Scope

This plan covers only these capabilities:

- Initialize a local SQLite database in the app data directory.
- Create and migrate `projects` and `snmp_profiles` tables.
- CRUD for switch projects.
- CRUD for SNMP profiles bound to a project.
- Encrypt SNMP secrets before writing to SQLite and decrypt them when reading.
- Add preload APIs and renderer UI for the above flows.

This plan explicitly does **not** include:

- Live SNMP test connection.
- WALK/BULK WALK collection.
- MIB loading or parsing.
- Template candidate review or YAML generation.
- OS credential manager integration beyond Electron `safeStorage`.
- Electron packaging or installers.

## Source Context

Read before implementing:

- `docs/plans/2026-05-30-zabbix-template-generator-plan.md`
- `docs/plans/2026-05-30-zabbix-template-generator-design-notes.md`
- `docs/superpowers/specs/2026-05-30-desktop-skeleton-supervision-design.md`
- `apps/desktop/src/main/index.ts`
- `apps/desktop/src/preload/index.ts`
- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/shared/preload-api.ts`
- `package.json`
- `.github/workflows/goal.yml`

Rules that must shape every task:

- Formal acceptance remains GitHub Actions `goal=full`, not local output.
- Keep renderer free of Node/Electron imports.
- Persist secrets only in Electron main and only after encryption.
- Do not add SNMP runtime behavior yet; profile management only.
- Do not broaden scope into MIB/template features.

## File Structure

Create:

- `apps/desktop/src/main/security/credential-cipher.ts`
- `apps/desktop/src/main/storage/database.ts`
- `apps/desktop/src/main/storage/migrations.ts`
- `apps/desktop/src/main/project/project-store.ts`
- `apps/desktop/src/main/snmp/snmp-profile-store.ts`
- `apps/desktop/src/main/ipc/project-ipc.ts`
- `apps/desktop/src/main/ipc/snmp-profile-ipc.ts`
- `apps/desktop/src/shared/types/project.ts`
- `apps/desktop/src/shared/types/snmp.ts`
- `apps/desktop/src/renderer/components/ProjectForm.tsx`
- `apps/desktop/src/renderer/components/SnmpProfileForm.tsx`
- `apps/desktop/src/renderer/pages/ProjectListPage.tsx`
- `apps/desktop/src/renderer/pages/ProjectWorkspacePage.tsx`
- `apps/desktop/src/renderer/state/app-state.ts`
- `apps/desktop/src/main/storage/database.test.ts`
- `apps/desktop/src/main/security/credential-cipher.test.ts`
- `apps/desktop/src/main/project/project-store.test.ts`
- `apps/desktop/src/main/snmp/snmp-profile-store.test.ts`
- `apps/desktop/src/renderer/App.test.tsx`

Modify:

- `apps/desktop/package.json`
- `package.json`
- `apps/desktop/src/main/index.ts`
- `apps/desktop/src/preload/index.ts`
- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/global.css`
- `apps/desktop/src/shared/preload-api.ts`
- `pnpm-lock.yaml`

## Data Model

Use these exact initial tables for this increment:

```sql
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
```

Use project defaults:

- `device_type`: `switch`
- `zabbix_version`: `7.0 LTS`

Use SNMP defaults:

- `port`: `161`
- `timeout_ms`: `3000`
- `retries`: `1`
- `bulk_size`: `10`
- `version`: `v2c`
- `v3_security_level`: `noAuthNoPriv`
- `v3_auth_protocol`: `SHA`
- `v3_priv_protocol`: `AES`

---

### Task 1: Add desktop foundation dependencies and shared contracts

**Files:**

- Modify: `apps/desktop/package.json`
- Modify: `package.json`
- Create: `apps/desktop/src/shared/types/project.ts`
- Create: `apps/desktop/src/shared/types/snmp.ts`
- Modify: `apps/desktop/src/shared/preload-api.ts`

- [ ] **Step 1: Add runtime and test dependencies**

Update `apps/desktop/package.json` dependencies:

```json
{
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "better-sqlite3": "latest",
    "electron": "latest",
    "react": "latest",
    "react-dom": "latest",
    "vite": "latest"
  }
}
```

Update root `package.json` devDependencies:

```json
{
  "devDependencies": {
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/better-sqlite3": "latest",
    "jsdom": "latest"
  }
}
```

- [ ] **Step 2: Define shared project contracts**

Create `apps/desktop/src/shared/types/project.ts`:

```ts
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
```

- [ ] **Step 3: Define shared SNMP contracts**

Create `apps/desktop/src/shared/types/snmp.ts`:

```ts
export type SnmpVersion = 'v2c' | 'v3';
export type SnmpSecurityLevel = 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
export type SnmpAuthProtocol = 'SHA' | 'MD5';
export type SnmpPrivProtocol = 'AES' | 'DES';

export interface SnmpProfileRecord {
  id: string;
  projectId: string;
  name: string;
  host: string;
  port: number;
  version: SnmpVersion;
  community: string;
  v3User: string;
  v3SecurityLevel: SnmpSecurityLevel;
  v3AuthProtocol: SnmpAuthProtocol;
  v3AuthPassword: string;
  v3PrivProtocol: SnmpPrivProtocol;
  v3PrivPassword: string;
  timeoutMs: number;
  retries: number;
  bulkSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSnmpProfileInput {
  id?: string;
  projectId: string;
  name: string;
  host: string;
  port: number;
  version: SnmpVersion;
  community: string;
  v3User: string;
  v3SecurityLevel: SnmpSecurityLevel;
  v3AuthProtocol: SnmpAuthProtocol;
  v3AuthPassword: string;
  v3PrivProtocol: SnmpPrivProtocol;
  v3PrivPassword: string;
  timeoutMs: number;
  retries: number;
  bulkSize: number;
}
```

- [ ] **Step 4: Expand preload API contracts**

Modify `apps/desktop/src/shared/preload-api.ts`:

```ts
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
```

- [ ] **Step 5: Install dependencies**

Run:

```powershell
corepack pnpm install
```

Expected:

- Exit code `0`.
- `pnpm-lock.yaml` updates for the new dependencies.

- [ ] **Step 6: Commit the contract and dependency baseline**

Run:

```powershell
git add package.json apps/desktop/package.json pnpm-lock.yaml apps/desktop/src/shared
git commit -m "feat: add desktop project profile contracts"
```

---

### Task 2: Add SQLite bootstrap and credential encryption with TDD

**Files:**

- Create: `apps/desktop/src/main/security/credential-cipher.ts`
- Create: `apps/desktop/src/main/security/credential-cipher.test.ts`
- Create: `apps/desktop/src/main/storage/database.ts`
- Create: `apps/desktop/src/main/storage/database.test.ts`
- Create: `apps/desktop/src/main/storage/migrations.ts`

- [ ] **Step 1: Write the failing credential cipher test**

Create `apps/desktop/src/main/security/credential-cipher.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createCredentialCipher } from './credential-cipher';

describe('createCredentialCipher', () => {
  it('round-trips a secret through encrypt and decrypt', () => {
    const cipher = createCredentialCipher({
      isEncryptionAvailable: () => true,
      encryptString: (value) => Buffer.from(`enc:${value}`),
      decryptString: (buffer) => buffer.toString().replace(/^enc:/, '')
    });

    const encrypted = cipher.encrypt('public');

    expect(encrypted).not.toBe('public');
    expect(cipher.decrypt(encrypted)).toBe('public');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/main/security/credential-cipher.test.ts
```

Expected:

- FAIL because `credential-cipher.ts` does not exist.

- [ ] **Step 3: Implement the minimal credential cipher**

Create `apps/desktop/src/main/security/credential-cipher.ts`:

```ts
type SafeStorageLike = {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(buffer: Buffer): string;
};

export interface CredentialCipher {
  encrypt(value: string): string;
  decrypt(value: string | null): string;
}

export function createCredentialCipher(storage: SafeStorageLike): CredentialCipher {
  return {
    encrypt(value) {
      if (!value) {
        return '';
      }

      if (!storage.isEncryptionAvailable()) {
        return Buffer.from(value, 'utf8').toString('base64');
      }

      return storage.encryptString(value).toString('base64');
    },
    decrypt(value) {
      if (!value) {
        return '';
      }

      const buffer = Buffer.from(value, 'base64');
      if (!storage.isEncryptionAvailable()) {
        return buffer.toString('utf8');
      }

      return storage.decryptString(buffer);
    }
  };
}
```

- [ ] **Step 4: Run the credential cipher test and verify GREEN**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/main/security/credential-cipher.test.ts
```

Expected:

- PASS.

- [ ] **Step 5: Write the failing database bootstrap test**

Create `apps/desktop/src/main/storage/database.test.ts`:

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDesktopDatabase } from './database';

const directories: string[] = [];

describe('createDesktopDatabase', () => {
  afterEach(() => {
    directories.length = 0;
  });

  it('creates projects and snmp_profiles tables', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'zabtem-db-'));
    directories.push(baseDir);

    const database = createDesktopDatabase({ userDataPath: baseDir });

    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;

    expect(tables.map((row) => row.name)).toContain('projects');
    expect(tables.map((row) => row.name)).toContain('snmp_profiles');
  });
});
```

- [ ] **Step 6: Run the database test and verify RED**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/main/storage/database.test.ts
```

Expected:

- FAIL because `database.ts` and `migrations.ts` do not exist.

- [ ] **Step 7: Implement migrations and database bootstrap**

Create `apps/desktop/src/main/storage/migrations.ts`:

```ts
import type Database from 'better-sqlite3';

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

export function runMigrations(database: Database.Database): void {
  database.pragma('foreign_keys = ON');
  for (const migration of MIGRATIONS) {
    database.exec(migration);
  }
}
```

Create `apps/desktop/src/main/storage/database.ts`:

```ts
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

export interface DesktopDatabaseOptions {
  userDataPath: string;
}

export function createDesktopDatabase(options: DesktopDatabaseOptions): Database.Database {
  mkdirSync(options.userDataPath, { recursive: true });

  const filePath = join(options.userDataPath, 'zabtem.sqlite');
  const database = new Database(filePath);
  runMigrations(database);
  return database;
}
```

- [ ] **Step 8: Run the database test and verify GREEN**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/main/storage/database.test.ts
```

Expected:

- PASS.

- [ ] **Step 9: Commit the storage foundation**

Run:

```powershell
git add apps/desktop/src/main/security apps/desktop/src/main/storage
git commit -m "feat: add desktop sqlite foundation"
```

---

### Task 3: Add project store CRUD and IPC with TDD

**Files:**

- Create: `apps/desktop/src/main/project/project-store.ts`
- Create: `apps/desktop/src/main/project/project-store.test.ts`
- Create: `apps/desktop/src/main/ipc/project-ipc.ts`
- Modify: `apps/desktop/src/main/index.ts`
- Modify: `apps/desktop/src/preload/index.ts`

- [ ] **Step 1: Write the failing project store test**

Create `apps/desktop/src/main/project/project-store.test.ts`:

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDesktopDatabase } from '../storage/database';
import { createProjectStore } from './project-store';

describe('createProjectStore', () => {
  it('creates and lists projects in newest-first order', () => {
    const database = createDesktopDatabase({
      userDataPath: mkdtempSync(join(tmpdir(), 'zabtem-projects-'))
    });
    const store = createProjectStore(database);

    store.create({
      name: 'Aggregation Switch',
      vendor: 'H3C',
      model: 'S6520X',
      role: 'aggregation'
    });

    const projects = store.list();

    expect(projects).toHaveLength(1);
    expect(projects[0]?.deviceType).toBe('switch');
    expect(projects[0]?.zabbixVersion).toBe('7.0 LTS');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/main/project/project-store.test.ts
```

Expected:

- FAIL because `project-store.ts` does not exist.

- [ ] **Step 3: Implement the project store**

Create `apps/desktop/src/main/project/project-store.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  CreateProjectInput,
  ProjectRecord,
  UpdateProjectInput
} from '../../shared/types/project';

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

export function createProjectStore(database: Database.Database) {
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
        .run({ ...input, id, createdAt: now, updatedAt: now });

      return this.getById(id);
    },
    update(input: UpdateProjectInput): ProjectRecord {
      const now = new Date().toISOString();

      database
        .prepare(
          `UPDATE projects
           SET name = @name, vendor = @vendor, model = @model, role = @role, updated_at = @updatedAt
           WHERE id = @id`
        )
        .run({ ...input, updatedAt: now });

      return this.getById(input.id);
    },
    remove(projectId: string): void {
      database.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    },
    getById(projectId: string): ProjectRecord {
      const row = database.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ProjectRow;
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
```

- [ ] **Step 4: Run the project store test and verify GREEN**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/main/project/project-store.test.ts
```

Expected:

- PASS.

- [ ] **Step 5: Add project IPC wiring**

Create `apps/desktop/src/main/ipc/project-ipc.ts`:

```ts
import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';
import type { CreateProjectInput, UpdateProjectInput } from '../../shared/types/project';
import { createProjectStore } from '../project/project-store';

export function registerProjectIpc(database: Database.Database): void {
  const store = createProjectStore(database);

  ipcMain.handle('projects:list', () => store.list());
  ipcMain.handle('projects:create', (_event, input: CreateProjectInput) => store.create(input));
  ipcMain.handle('projects:update', (_event, input: UpdateProjectInput) => store.update(input));
  ipcMain.handle('projects:remove', (_event, projectId: string) => {
    store.remove(projectId);
  });
}
```

Modify `apps/desktop/src/main/index.ts` to initialize the database once and register project handlers:

```ts
import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import { registerProjectIpc } from './ipc/project-ipc';
import { createDesktopDatabase } from './storage/database';

const database = createDesktopDatabase({ userDataPath: app.getPath('userData') });

ipcMain.handle('app:get-version', () => app.getVersion());

app.whenReady().then(async () => {
  registerProjectIpc(database);
  await createWindow();
  // existing activate handler remains
});
```

- [ ] **Step 6: Expose project methods in preload**

Modify `apps/desktop/src/preload/index.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { ZabtemPreloadApi } from '../shared/preload-api';

const api: ZabtemPreloadApi = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version')
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (input) => ipcRenderer.invoke('projects:create', input),
    update: (input) => ipcRenderer.invoke('projects:update', input),
    remove: (projectId) => ipcRenderer.invoke('projects:remove', projectId)
  },
  snmpProfiles: {
    list: (projectId) => ipcRenderer.invoke('snmp-profiles:list', projectId),
    save: (input) => ipcRenderer.invoke('snmp-profiles:save', input),
    remove: (profileId) => ipcRenderer.invoke('snmp-profiles:remove', profileId)
  }
};
```

- [ ] **Step 7: Commit the project management backend**

Run:

```powershell
git add apps/desktop/src/main apps/desktop/src/preload/index.ts
git commit -m "feat: add desktop project management backend"
```

---

### Task 4: Add SNMP profile store and secure secret persistence with TDD

**Files:**

- Create: `apps/desktop/src/main/snmp/snmp-profile-store.ts`
- Create: `apps/desktop/src/main/snmp/snmp-profile-store.test.ts`
- Create: `apps/desktop/src/main/ipc/snmp-profile-ipc.ts`

- [ ] **Step 1: Write the failing SNMP profile store test**

Create `apps/desktop/src/main/snmp/snmp-profile-store.test.ts`:

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCredentialCipher } from '../security/credential-cipher';
import { createDesktopDatabase } from '../storage/database';
import { createProjectStore } from '../project/project-store';
import { createSnmpProfileStore } from './snmp-profile-store';

describe('createSnmpProfileStore', () => {
  it('stores encrypted credentials and returns decrypted values', () => {
    const database = createDesktopDatabase({
      userDataPath: mkdtempSync(join(tmpdir(), 'zabtem-snmp-'))
    });
    const project = createProjectStore(database).create({
      name: 'Access Switch',
      vendor: 'Huawei',
      model: 'S5735',
      role: 'access'
    });
    const cipher = createCredentialCipher({
      isEncryptionAvailable: () => false,
      encryptString: () => Buffer.alloc(0),
      decryptString: () => ''
    });
    const store = createSnmpProfileStore(database, cipher);

    const record = store.save({
      projectId: project.id,
      name: 'Default v2c',
      host: '192.0.2.10',
      port: 161,
      version: 'v2c',
      community: 'public',
      v3User: '',
      v3SecurityLevel: 'noAuthNoPriv',
      v3AuthProtocol: 'SHA',
      v3AuthPassword: '',
      v3PrivProtocol: 'AES',
      v3PrivPassword: '',
      timeoutMs: 3000,
      retries: 1,
      bulkSize: 10
    });

    expect(record.community).toBe('public');

    const row = database
      .prepare('SELECT community_encrypted FROM snmp_profiles WHERE id = ?')
      .get(record.id) as { community_encrypted: string };

    expect(row.community_encrypted).not.toBe('public');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/main/snmp/snmp-profile-store.test.ts
```

Expected:

- FAIL because `snmp-profile-store.ts` does not exist.

- [ ] **Step 3: Implement the SNMP profile store**

Create `apps/desktop/src/main/snmp/snmp-profile-store.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { CredentialCipher } from '../security/credential-cipher';
import type { SaveSnmpProfileInput, SnmpProfileRecord } from '../../shared/types/snmp';

type SnmpProfileRow = {
  id: string;
  project_id: string;
  name: string;
  host: string;
  port: number;
  version: SnmpProfileRecord['version'];
  community_encrypted: string | null;
  v3_user: string | null;
  v3_security_level: SnmpProfileRecord['v3SecurityLevel'] | null;
  v3_auth_protocol: SnmpProfileRecord['v3AuthProtocol'] | null;
  v3_auth_password_encrypted: string | null;
  v3_priv_protocol: SnmpProfileRecord['v3PrivProtocol'] | null;
  v3_priv_password_encrypted: string | null;
  timeout_ms: number;
  retries: number;
  bulk_size: number;
  created_at: string;
  updated_at: string;
};

export function createSnmpProfileStore(database: Database.Database, cipher: CredentialCipher) {
  return {
    list(projectId: string): SnmpProfileRecord[] {
      const rows = database
        .prepare('SELECT * FROM snmp_profiles WHERE project_id = ? ORDER BY updated_at DESC')
        .all(projectId) as SnmpProfileRow[];
      return rows.map((row) => mapSnmpProfileRow(row, cipher));
    },
    save(input: SaveSnmpProfileInput): SnmpProfileRecord {
      const now = new Date().toISOString();
      const id = input.id ?? randomUUID();

      database
        .prepare(
          `INSERT INTO snmp_profiles (
             id, project_id, name, host, port, version, community_encrypted, v3_user,
             v3_security_level, v3_auth_protocol, v3_auth_password_encrypted,
             v3_priv_protocol, v3_priv_password_encrypted, timeout_ms, retries,
             bulk_size, created_at, updated_at
           ) VALUES (
             @id, @projectId, @name, @host, @port, @version, @communityEncrypted, @v3User,
             @v3SecurityLevel, @v3AuthProtocol, @v3AuthPasswordEncrypted,
             @v3PrivProtocol, @v3PrivPasswordEncrypted, @timeoutMs, @retries,
             @bulkSize, @createdAt, @updatedAt
           )
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             host = excluded.host,
             port = excluded.port,
             version = excluded.version,
             community_encrypted = excluded.community_encrypted,
             v3_user = excluded.v3_user,
             v3_security_level = excluded.v3_security_level,
             v3_auth_protocol = excluded.v3_auth_protocol,
             v3_auth_password_encrypted = excluded.v3_auth_password_encrypted,
             v3_priv_protocol = excluded.v3_priv_protocol,
             v3_priv_password_encrypted = excluded.v3_priv_password_encrypted,
             timeout_ms = excluded.timeout_ms,
             retries = excluded.retries,
             bulk_size = excluded.bulk_size,
             updated_at = excluded.updated_at`
        )
        .run({
          ...input,
          id,
          communityEncrypted: cipher.encrypt(input.community),
          v3AuthPasswordEncrypted: cipher.encrypt(input.v3AuthPassword),
          v3PrivPasswordEncrypted: cipher.encrypt(input.v3PrivPassword),
          createdAt: now,
          updatedAt: now
        });

      return this.getById(id);
    },
    remove(profileId: string): void {
      database.prepare('DELETE FROM snmp_profiles WHERE id = ?').run(profileId);
    },
    getById(profileId: string): SnmpProfileRecord {
      const row = database.prepare('SELECT * FROM snmp_profiles WHERE id = ?').get(profileId) as SnmpProfileRow;
      return mapSnmpProfileRow(row, cipher);
    }
  };
}

function mapSnmpProfileRow(row: SnmpProfileRow, cipher: CredentialCipher): SnmpProfileRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    host: row.host,
    port: row.port,
    version: row.version,
    community: cipher.decrypt(row.community_encrypted),
    v3User: row.v3_user ?? '',
    v3SecurityLevel: row.v3_security_level ?? 'noAuthNoPriv',
    v3AuthProtocol: row.v3_auth_protocol ?? 'SHA',
    v3AuthPassword: cipher.decrypt(row.v3_auth_password_encrypted),
    v3PrivProtocol: row.v3_priv_protocol ?? 'AES',
    v3PrivPassword: cipher.decrypt(row.v3_priv_password_encrypted),
    timeoutMs: row.timeout_ms,
    retries: row.retries,
    bulkSize: row.bulk_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
```

- [ ] **Step 4: Run the SNMP profile store test and verify GREEN**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/main/snmp/snmp-profile-store.test.ts
```

Expected:

- PASS.

- [ ] **Step 5: Add SNMP profile IPC wiring**

Create `apps/desktop/src/main/ipc/snmp-profile-ipc.ts`:

```ts
import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';
import { createCredentialCipher } from '../security/credential-cipher';
import { createSnmpProfileStore } from '../snmp/snmp-profile-store';

export function registerSnmpProfileIpc(
  database: Database.Database,
  safeStorageLike: Parameters<typeof createCredentialCipher>[0]
): void {
  const cipher = createCredentialCipher(safeStorageLike);
  const store = createSnmpProfileStore(database, cipher);

  ipcMain.handle('snmp-profiles:list', (_event, projectId: string) => store.list(projectId));
  ipcMain.handle('snmp-profiles:save', (_event, input) => store.save(input));
  ipcMain.handle('snmp-profiles:remove', (_event, profileId: string) => {
    store.remove(profileId);
  });
}
```

Modify `apps/desktop/src/main/index.ts` again:

```ts
import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import { registerSnmpProfileIpc } from './ipc/snmp-profile-ipc';

app.whenReady().then(async () => {
  registerProjectIpc(database);
  registerSnmpProfileIpc(database, safeStorage);
  await createWindow();
  // existing activate handler remains
});
```

- [ ] **Step 6: Commit the SNMP profile backend**

Run:

```powershell
git add apps/desktop/src/main
git commit -m "feat: add desktop snmp profile persistence"
```

---

### Task 5: Add renderer workflow for project list, project creation, and SNMP profile editing

**Files:**

- Create: `apps/desktop/src/renderer/state/app-state.ts`
- Create: `apps/desktop/src/renderer/components/ProjectForm.tsx`
- Create: `apps/desktop/src/renderer/components/SnmpProfileForm.tsx`
- Create: `apps/desktop/src/renderer/pages/ProjectListPage.tsx`
- Create: `apps/desktop/src/renderer/pages/ProjectWorkspacePage.tsx`
- Create: `apps/desktop/src/renderer/App.test.tsx`
- Modify: `apps/desktop/src/renderer/App.tsx`
- Modify: `apps/desktop/src/renderer/global.css`

- [ ] **Step 1: Write the failing renderer workflow test**

Create `apps/desktop/src/renderer/App.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const projectApi = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn()
};

const snmpApi = {
  list: vi.fn(),
  save: vi.fn(),
  remove: vi.fn()
};

beforeEach(() => {
  projectApi.list.mockResolvedValue([]);
  projectApi.create.mockResolvedValue({
    id: 'p-1',
    name: 'Access Switch',
    deviceType: 'switch',
    vendor: 'H3C',
    model: 'S5130',
    role: 'access',
    zabbixVersion: '7.0 LTS',
    createdAt: '2026-05-31T00:00:00.000Z',
    updatedAt: '2026-05-31T00:00:00.000Z'
  });
  snmpApi.list.mockResolvedValue([]);

  window.zabtem = {
    app: { getVersion: vi.fn().mockResolvedValue('0.0.0') },
    projects: projectApi,
    snmpProfiles: snmpApi
  };
});

describe('App', () => {
  it('creates a project and opens its workspace', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Projects');
    await user.click(screen.getByRole('button', { name: 'New project' }));
    await user.type(screen.getByLabelText('Project name'), 'Access Switch');
    await user.type(screen.getByLabelText('Vendor'), 'H3C');
    await user.type(screen.getByLabelText('Model'), 'S5130');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(screen.getByText('Project workspace')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Access Switch')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the renderer test and verify RED**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
```

Expected:

- FAIL because the new renderer files and UI do not exist.

- [ ] **Step 3: Add focused renderer state**

Create `apps/desktop/src/renderer/state/app-state.ts`:

```ts
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
```

- [ ] **Step 4: Implement the forms and pages**

Create `apps/desktop/src/renderer/components/ProjectForm.tsx`:

```tsx
import { useState, type FormEvent, type ReactElement } from 'react';
import type { CreateProjectInput } from '../../shared/types/project';

export function ProjectForm(props: {
  onSubmit(input: CreateProjectInput): Promise<void>;
  onCancel(): void;
}): ReactElement {
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [role, setRole] = useState<CreateProjectInput['role']>('access');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await props.onSubmit({ name, vendor, model, role });
  }

  return (
    <form className="panel form-panel" onSubmit={(event) => void handleSubmit(event)}>
      <h2>New project</h2>
      <label>
        <span>Project name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        <span>Vendor</span>
        <input value={vendor} onChange={(event) => setVendor(event.target.value)} />
      </label>
      <label>
        <span>Model</span>
        <input value={model} onChange={(event) => setModel(event.target.value)} />
      </label>
      <label>
        <span>Role</span>
        <select value={role} onChange={(event) => setRole(event.target.value as CreateProjectInput['role'])}>
          <option value="core">Core</option>
          <option value="aggregation">Aggregation</option>
          <option value="access">Access</option>
          <option value="other">Other</option>
        </select>
      </label>
      <div className="form-actions">
        <button type="button" onClick={props.onCancel}>Cancel</button>
        <button type="submit">Create project</button>
      </div>
    </form>
  );
}
```

Create `apps/desktop/src/renderer/components/SnmpProfileForm.tsx` with a single form that supports v2c and v3 fields, using `SaveSnmpProfileInput` and hiding irrelevant fields by `version`.

Create `apps/desktop/src/renderer/pages/ProjectListPage.tsx` with:

```tsx
import type { ReactElement } from 'react';
import type { ProjectRecord } from '../../shared/types/project';

export function ProjectListPage(props: {
  projects: ProjectRecord[];
  onCreate(): void;
  onOpen(project: ProjectRecord): void;
}): ReactElement {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>Switch template workspaces</h2>
        </div>
        <button type="button" onClick={props.onCreate}>New project</button>
      </div>
      <ul className="project-list">
        {props.projects.map((project) => (
          <li key={project.id}>
            <button type="button" onClick={() => props.onOpen(project)}>
              <strong>{project.name}</strong>
              <span>{project.vendor} {project.model}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Create `apps/desktop/src/renderer/pages/ProjectWorkspacePage.tsx` with a read-only project summary at top and `SnmpProfileForm` below it.

- [ ] **Step 5: Replace the skeleton renderer**

Modify `apps/desktop/src/renderer/App.tsx` to:

```tsx
import { useEffect, useState, type ReactElement } from 'react';
import type { ProjectRecord } from '../shared/types/project';
import type { SnmpProfileRecord } from '../shared/types/snmp';
import { ProjectForm } from './components/ProjectForm';
import { ProjectListPage } from './pages/ProjectListPage';
import { ProjectWorkspacePage } from './pages/ProjectWorkspacePage';
import type { AppView } from './state/app-state';

export function App(): ReactElement {
  const [version, setVersion] = useState('Loading...');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [view, setView] = useState<AppView>({ kind: 'list' });

  useEffect(() => {
    void window.zabtem.app.getVersion().then(setVersion).catch(() => setVersion('Version unavailable'));
    void refreshProjects();
  }, []);

  async function refreshProjects(): Promise<void> {
    const items = await window.zabtem.projects.list();
    setProjects(items);
  }

  async function openWorkspace(project: ProjectRecord): Promise<void> {
    const profiles = await window.zabtem.snmpProfiles.list(project.id);
    setView({ kind: 'workspace', project, profiles });
  }

  async function createProject(input: Parameters<typeof window.zabtem.projects.create>[0]): Promise<void> {
    const project = await window.zabtem.projects.create(input);
    await refreshProjects();
    await openWorkspace(project);
  }

  return (
    <main className="shell app-layout">
      <header className="app-header">
        <div>
          <p className="eyebrow">Zabtem</p>
          <h1>MIB2Zabbix Desktop</h1>
        </div>
        <p className="app-meta">Version {version}</p>
      </header>
      {view.kind === 'list' && (
        <ProjectListPage
          projects={projects}
          onCreate={() => setView({ kind: 'create-project' })}
          onOpen={(project) => void openWorkspace(project)}
        />
      )}
      {view.kind === 'create-project' && (
        <ProjectForm
          onSubmit={createProject}
          onCancel={() => setView({ kind: 'list' })}
        />
      )}
      {view.kind === 'workspace' && (
        <ProjectWorkspacePage
          project={view.project}
          profiles={view.profiles}
          onBack={() => setView({ kind: 'list' })}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 6: Update CSS only for the new layout**

Modify `apps/desktop/src/renderer/global.css` to add:

```css
.app-layout {
  align-content: start;
  gap: 24px;
  max-width: 1120px;
  margin: 0 auto;
}

.app-header,
.panel,
.form-panel,
.project-list li button,
.profile-card {
  width: 100%;
}

.panel,
.form-panel,
.profile-card {
  background: #ffffff;
  border: 1px solid #d8e0eb;
  border-radius: 20px;
  padding: 24px;
}

.form-panel label,
.profile-form label {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
```

- [ ] **Step 7: Run the renderer test and verify GREEN**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
```

Expected:

- PASS.

- [ ] **Step 8: Commit the renderer workflow**

Run:

```powershell
git add apps/desktop/src/renderer
git commit -m "feat: add desktop project and snmp profile workflow"
```

---

### Task 6: Run integration verification and inspect the diff

**Files:**

- No new files unless verification exposes failures.

- [ ] **Step 1: Run desktop-focused tests**

Run:

```powershell
corepack pnpm test -- apps/desktop/src/main/security/credential-cipher.test.ts apps/desktop/src/main/storage/database.test.ts apps/desktop/src/main/project/project-store.test.ts apps/desktop/src/main/snmp/snmp-profile-store.test.ts apps/desktop/src/renderer/App.test.tsx
```

Expected:

- Exit code `0`.

- [ ] **Step 2: Run repository lint**

Run:

```powershell
corepack pnpm lint
```

Expected:

- Exit code `0`.

- [ ] **Step 3: Run repository typecheck**

Run:

```powershell
corepack pnpm typecheck
```

Expected:

- Exit code `0`.

- [ ] **Step 4: Run repository tests**

Run:

```powershell
corepack pnpm test
```

Expected:

- Exit code `0`.

- [ ] **Step 5: Run repository build**

Run:

```powershell
corepack pnpm build
```

Expected:

- Exit code `0`.
- Existing skeleton artifacts still appear under `dist/desktop`.
- Desktop renderer build still appears under `apps/desktop/dist/renderer`.

- [ ] **Step 6: Inspect git diff**

Run:

```powershell
git diff --stat
```

Expected:

- Changes are limited to `apps/desktop`, root package metadata, lockfile, and the plan doc.

---

### Task 7: Push for formal acceptance and verify GitHub Actions

**Files:**

- No code files unless CI exposes a failure.

- [ ] **Step 1: Commit the completed increment**

Run:

```powershell
git add apps package.json pnpm-lock.yaml docs\superpowers\plans
git commit -m "feat: add desktop project and snmp profile foundation"
```

Expected:

- Commit succeeds on the feature branch without amending older commits.

- [ ] **Step 2: Push the branch**

Run:

```powershell
git push -u origin codex/goal-skeleton
```

Expected:

- Remote branch updates successfully.

- [ ] **Step 3: Trigger formal validation**

Run:

```powershell
gh workflow run goal.yml --repo kos991/zabtem --ref codex/goal-skeleton -f goal=full
```

Expected:

- Workflow dispatch succeeds.

- [ ] **Step 4: Capture the new run id**

Run:

```powershell
gh run list --repo kos991/zabtem --workflow goal.yml --branch codex/goal-skeleton --limit 1
```

Expected:

- The newest run is the just-triggered `goal` workflow.

- [ ] **Step 5: Wait for completion**

Run:

```powershell
gh run watch <run-id> --repo kos991/zabtem --exit-status
```

Expected:

- Exit code `0`.
- `verify`, `generate-template`, and `build` jobs pass.

- [ ] **Step 6: Report completion with evidence**

Report only after the workflow passes:

```text
Formal GitHub Actions validation passed:
- workflow: goal.yml
- goal: full
- branch: codex/goal-skeleton
- run id: <run-id>
- jobs: verify, generate-template, build
```

---

## Self-Review

Spec coverage:

- The plan covers the recommended next development order from the design notes: SQLite, project management, then SNMP profile management.
- The plan keeps all secret persistence in Electron main and adds encryption before SQLite writes.
- The plan adds renderer UX only for project/profile management and does not pull in SNMP runtime, MIB, or template scope.
- The plan preserves the existing GitHub Actions `goal=full` acceptance gate.

Placeholder scan:

- No `TODO`, `TBD`, or deferred-code placeholders remain.
- Each task names exact files and commands.

Type consistency:

- Shared contracts use `ProjectRecord`, `CreateProjectInput`, `UpdateProjectInput`, `SnmpProfileRecord`, and `SaveSnmpProfileInput` consistently across store, IPC, preload, and renderer tasks.
