import { get } from './client';

export const getDirtyScenes = (): Promise<string[]> =>
  get('/api/workspace/dirty');
