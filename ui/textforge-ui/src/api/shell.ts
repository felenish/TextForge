import { post } from './client';

interface PathResponse {
  path: string;
}

export const openFolderDialog = async (title: string): Promise<string | null> => {
  const result = await post<PathResponse | null>('/api/shell/folder-dialog', { title });
  return result?.path ?? null;
};

export const openFileDialog = async (title: string, filter: string): Promise<string | null> => {
  const result = await post<PathResponse | null>('/api/shell/open-dialog', { title, filter });
  return result?.path ?? null;
};
