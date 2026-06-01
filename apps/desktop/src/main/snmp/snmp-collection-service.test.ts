import { describe, expect, it } from 'vitest';
import type { SnmpProfileRecord } from '../../shared/types/snmp';
import { createSnmpCollectionService } from './snmp-collection-service';

const baseProfile: SnmpProfileRecord = {
  id: 'profile-1',
  projectId: 'project-1',
  name: 'Access switch',
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
  bulkSize: 10,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z'
};

describe('createSnmpCollectionService', () => {
  it('tests connectivity through the configured SNMP client', async () => {
    const service = createSnmpCollectionService({
      getProfile: () => baseProfile,
      snmpClient: {
        async getSystemDescription(profile) {
          expect(profile.host).toBe('192.0.2.10');
          expect(profile.community).toBe('public');
          return 'H3C Comware Software';
        }
      }
    });

    const result = await service.testConnection({ profileId: 'profile-1' });

    expect(result.ok).toBe(true);
    expect(result.profileId).toBe('profile-1');
    expect(result.sysDescr).toBe('H3C Comware Software');
  });
});
