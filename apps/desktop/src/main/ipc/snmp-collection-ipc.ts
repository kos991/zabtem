import { ipcMain } from 'electron';
import type { SnmpConnectionTestInput } from '../../shared/types/snmp';
import { createCredentialCipher } from '../security/credential-cipher';
import { createNetSnmpClient } from '../snmp/net-snmp-client';
import { createSnmpCollectionService } from '../snmp/snmp-collection-service';
import { createSnmpProfileStore } from '../snmp/snmp-profile-store';
import type { DesktopDatabase } from '../storage/database';

type SafeStorageLike = Parameters<typeof createCredentialCipher>[0];

export function registerSnmpCollectionIpc(
  database: DesktopDatabase,
  safeStorageLike: SafeStorageLike
): void {
  const cipher = createCredentialCipher(safeStorageLike);
  const profileStore = createSnmpProfileStore(database, cipher);
  const service = createSnmpCollectionService({
    getProfile: (profileId) => profileStore.getById(profileId),
    snmpClient: createNetSnmpClient()
  });

  ipcMain.handle('snmp-collection:test-connection', (_event, input: SnmpConnectionTestInput) =>
    service.testConnection(input)
  );
}
