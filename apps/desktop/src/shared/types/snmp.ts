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

export interface SnmpConnectionTestInput {
  profileId: string;
}

export interface SnmpConnectionTestResult {
  ok: boolean;
  profileId: string;
  target: string;
  sysDescr: string;
  checkedAt: string;
  error?: string;
}
