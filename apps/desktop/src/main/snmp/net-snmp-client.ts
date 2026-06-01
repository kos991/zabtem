import snmp, { type Options, type Session, type User, type Varbind } from 'net-snmp';
import type { SnmpProfileRecord } from '../../shared/types/snmp';
import type { SnmpCollectionClient } from './snmp-collection-service';

const SYSTEM_DESCRIPTION_OID = '1.3.6.1.2.1.1.1.0';

export function createNetSnmpClient(): SnmpCollectionClient {
  return {
    getSystemDescription(profile) {
      return new Promise((resolve, reject) => {
        const session = createSession(profile);

        session.get([SYSTEM_DESCRIPTION_OID], (error: Error | null, varbinds: Varbind[]) => {
          session.close();

          if (error) {
            reject(error);
            return;
          }

          const first = varbinds[0];
          if (!first || snmp.isVarbindError(first)) {
            reject(new Error(first ? snmp.varbindError(first) : 'No system description returned.'));
            return;
          }

          resolve(String(first.value));
        });
      });
    }
  };
}

function createSession(profile: SnmpProfileRecord): Session {
  const options: Options = {
    port: profile.port,
    retries: profile.retries,
    timeout: profile.timeoutMs,
    version: profile.version === 'v2c' ? snmp.Version2c : snmp.Version3
  };

  if (profile.version === 'v3') {
    return snmp.createV3Session(profile.host, createV3User(profile), options);
  }

  return snmp.createSession(profile.host, profile.community, options);
}

function createV3User(profile: SnmpProfileRecord): User {
  return {
    name: profile.v3User,
    level: mapSecurityLevel(profile.v3SecurityLevel),
    authProtocol: profile.v3AuthProtocol === 'MD5' ? snmp.AuthProtocols.md5 : snmp.AuthProtocols.sha,
    authKey: profile.v3AuthPassword || undefined,
    privProtocol: profile.v3PrivProtocol === 'DES' ? snmp.PrivProtocols.des : snmp.PrivProtocols.aes,
    privKey: profile.v3PrivPassword || undefined
  };
}

function mapSecurityLevel(level: SnmpProfileRecord['v3SecurityLevel']): number {
  switch (level) {
    case 'authPriv':
      return snmp.SecurityLevel.authPriv;
    case 'authNoPriv':
      return snmp.SecurityLevel.authNoPriv;
    case 'noAuthNoPriv':
      return snmp.SecurityLevel.noAuthNoPriv;
  }
}
