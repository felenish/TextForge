import { del, get, post, put } from './client';

export interface SceneDto {
  id: string;
  title: string;
  filePath: string;
  sortOrder: number;
  content: string | null;
}

export const getScene = (sceneId: string): Promise<SceneDto> =>
  get(`/api/scenes/${sceneId}`);

export const saveScene = (sceneId: string, content: string): Promise<void> =>
  put(`/api/scenes/${sceneId}`, { content });

export const addScene = (bookId: string, chapterId: string, title: string): Promise<SceneDto> =>
  post(`/api/books/${bookId}/chapters/${chapterId}/scenes`, { title });

export const deleteScene = (sceneId: string): Promise<void> =>
  del(`/api/scenes/${sceneId}`);
