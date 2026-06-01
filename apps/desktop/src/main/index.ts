import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerProjectIpc } from './ipc/project-ipc';
import { registerSnmpCollectionIpc } from './ipc/snmp-collection-ipc';
import { registerSnmpProfileIpc } from './ipc/snmp-profile-ipc';
import { createDesktopDatabase } from './storage/database';

const currentDir = dirname(fileURLToPath(import.meta.url));

ipcMain.handle('app:get-version', () => app.getVersion());

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(currentDir, '..', '..', 'preload', 'preload', 'index.js')
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
    return;
  }

  await window.loadFile(join(currentDir, '..', '..', 'renderer', 'index.html'));
}

app.whenReady().then(async () => {
  const database = createDesktopDatabase({ userDataPath: app.getPath('userData') });

  registerProjectIpc(database);
  registerSnmpProfileIpc(database, safeStorage);
  registerSnmpCollectionIpc(database, safeStorage);
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
