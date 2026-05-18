import { post } from './client';

export const openFolderDialog = (title: string): Promise<string | null> =>
  post('/api/shell/folder-dialog', { title });

export const openFileDialog = (title: string, filter: string): Promise<string | null> =>
  post('/api/shell/file-dialog', { title, filter });
