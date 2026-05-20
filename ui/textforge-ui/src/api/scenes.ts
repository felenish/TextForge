import { del, get, patch, post, put } from './client';

export interface SceneDto {
  id: string;
  title: string;
  filePath: string;
  sortOrder: number;
  content: string | null;
  status: string;
  pov: string | null;
  characterIds: string[];
  notes: string | null;
}

export interface PatchSceneBody {
  title?: string;
  status?: string;
  pov?: string;
  characterIds?: string[];
  notes?: string;
}

export const getScene = (sceneId: string): Promise<SceneDto> =>
  get(`/api/scenes/${sceneId}`);

export const saveScene = (sceneId: string, content: string): Promise<void> =>
  put(`/api/scenes/${sceneId}`, { content });

export const addScene = (bookId: string, chapterId: string, title: string): Promise<SceneDto> =>
  post(`/api/books/${bookId}/chapters/${chapterId}/scenes`, { title });

export const renameScene = (sceneId: string, title: string): Promise<void> =>
  patch(`/api/scenes/${sceneId}`, { title });

export const setSceneStatus = (sceneId: string, status: string): Promise<void> =>
  patch(`/api/scenes/${sceneId}`, { status });

export const patchScene = (sceneId: string, body: PatchSceneBody): Promise<void> =>
  patch(`/api/scenes/${sceneId}`, body);

export const deleteScene = (sceneId: string): Promise<void> =>
  del(`/api/scenes/${sceneId}`);
