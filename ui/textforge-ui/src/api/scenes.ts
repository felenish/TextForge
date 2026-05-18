import { del, get, post, put } from './client';

export interface SceneDto {
  id: string;
  title: string;
  sortOrder: number;
  content: string;
}

export const getScene = (bookId: string, sceneId: string): Promise<SceneDto> =>
  get(`/api/books/${bookId}/scenes/${sceneId}`);

export const saveScene = (bookId: string, sceneId: string, content: string): Promise<void> =>
  put(`/api/books/${bookId}/scenes/${sceneId}`, { content });

export const addScene = (bookId: string, chapterId: string, title: string): Promise<SceneDto> =>
  post(`/api/books/${bookId}/chapters/${chapterId}/scenes`, { title });

export const deleteScene = (bookId: string, sceneId: string): Promise<void> =>
  del(`/api/books/${bookId}/scenes/${sceneId}`);
