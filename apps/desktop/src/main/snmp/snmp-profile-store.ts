import { randomUUID } from 'node:crypto';
import type { SaveSnmpProfileInput, SnmpProfileRecord } from '../../shared/types/snmp';
import type { CredentialCipher } from '../security/credential-cipher';
import type { DesktopDatabase } from '../storage/database';

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

export function createSnmpProfileStore(database: DesktopDatabase, cipher: CredentialCipher) {
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
             @bulkSize, COALESCE(
               (SELECT created_at FROM snmp_profiles WHERE id = @id),
               @createdAt
             ), @updatedAt
           )
           ON CONFLICT(id) DO UPDATE SET
             project_id = excluded.project_id,
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
      const row = database.prepare('SELECT * FROM snmp_profiles WHERE id = ?').get(profileId) as
        | SnmpProfileRow
        | undefined;

      if (!row) {
        throw new Error(`SNMP profile ${profileId} was not found.`);
      }

      return mapSnmpProfileRow(row, cipher);
    }
  };
}

function mapSnmpProfileRow(
  row: SnmpProfileRow,
  cipher: CredentialCipher
): SnmpProfileRecord {
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
