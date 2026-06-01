import { ipcMain } from 'electron';
import type { SaveSnmpProfileInput } from '../../shared/types/snmp';
import { createCredentialCipher } from '../security/credential-cipher';
import { createSnmpProfileStore } from '../snmp/snmp-profile-store';
import type { DesktopDatabase } from '../storage/database';

type SafeStorageLike = Parameters<typeof createCredentialCipher>[0];

export function registerSnmpProfileIpc(
  database: DesktopDatabase,
  safeStorageLike: SafeStorageLike
): void {
  const cipher = createCredentialCipher(safeStorageLike);
  const store = createSnmpProfileStore(database, cipher);

  ipcMain.handle('snmp-profiles:list', (_event, projectId: string) => store.list(projectId));
  ipcMain.handle('snmp-profiles:save', (_event, input: SaveSnmpProfileInput) => store.save(input));
  ipcMain.handle('snmp-profiles:remove', (_event, profileId: string) => {
    store.remove(profileId);
  });
}
