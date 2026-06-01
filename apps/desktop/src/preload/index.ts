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

contextBridge.exposeInMainWorld('zabtem', api);
