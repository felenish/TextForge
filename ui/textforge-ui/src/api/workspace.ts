import { get, post } from './client';

export const getVersion = (): Promise<string> =>
  get<{ version: string }>('/api/workspace/version').then(r => r.version);

export const getDirtyScenes = (): Promise<string[]> =>
  get('/api/workspace/dirty');

export const markSceneDirty = (sceneId: string): Promise<void> =>
  post(`/api/workspace/dirty/${sceneId}`, {});
