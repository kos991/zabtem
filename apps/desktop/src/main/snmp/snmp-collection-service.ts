import type {
  SnmpConnectionTestInput,
  SnmpConnectionTestResult,
  SnmpProfileRecord
} from '../../shared/types/snmp';

export interface SnmpCollectionClient {
  getSystemDescription(profile: SnmpProfileRecord): Promise<string>;
}

export interface SnmpCollectionServiceOptions {
  getProfile(profileId: string): SnmpProfileRecord;
  snmpClient: SnmpCollectionClient;
}

export function createSnmpCollectionService(options: SnmpCollectionServiceOptions) {
  return {
    async testConnection(input: SnmpConnectionTestInput): Promise<SnmpConnectionTestResult> {
      const profile = options.getProfile(input.profileId);
      const checkedAt = new Date().toISOString();
      const target = `${profile.host}:${profile.port}`;

      try {
        const sysDescr = await options.snmpClient.getSystemDescription(profile);
        return {
          ok: true,
          profileId: profile.id,
          target,
          sysDescr,
          checkedAt
        };
      } catch (error) {
        return {
          ok: false,
          profileId: profile.id,
          target,
          sysDescr: '',
          checkedAt,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  };
}
