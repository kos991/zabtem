import { contextBridge, ipcRenderer } from 'electron';
import type { ZabtemPreloadApi } from '../shared/preload-api';

const api: ZabtemPreloadApi = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version')
  }
};

contextBridge.exposeInMainWorld('zabtem', api);
