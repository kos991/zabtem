import { ipcMain } from 'electron';
import type { CreateProjectInput, UpdateProjectInput } from '../../shared/types/project';
import { createProjectStore } from '../project/project-store';
import type { DesktopDatabase } from '../storage/database';

export function registerProjectIpc(database: DesktopDatabase): void {
  const store = createProjectStore(database);

  ipcMain.handle('projects:list', () => store.list());
  ipcMain.handle('projects:create', (_event, input: CreateProjectInput) => store.create(input));
  ipcMain.handle('projects:update', (_event, input: UpdateProjectInput) => store.update(input));
  ipcMain.handle('projects:remove', (_event, projectId: string) => {
    store.remove(projectId);
  });
}
