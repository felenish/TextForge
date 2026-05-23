import { del, post, put } from './client';
import type { ChapterDto } from './books';

export const addChapter = (bookId: string, title: string): Promise<ChapterDto> =>
  post(`/api/books/${bookId}/chapters`, { title });

export const updateChapter = (bookId: string, chapterId: string, title: string): Promise<ChapterDto> =>
  put(`/api/books/${bookId}/chapters/${chapterId}`, { title });

export const deleteChapter = (bookId: string, chapterId: string): Promise<void> =>
  del(`/api/books/${bookId}/chapters/${chapterId}`);

export const reorderChapters = (bookId: string, ids: string[]): Promise<void> =>
  post(`/api/books/${bookId}/chapters/reorder`, { ids });

export const reorderScenes = (bookId: string, chapterId: string, ids: string[]): Promise<void> =>
  post(`/api/books/${bookId}/chapters/${chapterId}/scenes/reorder`, { ids });

export const moveScene = (
  bookId: string, sceneId: string, targetChapterId: string, targetIndex: number,
): Promise<void> =>
  post(`/api/books/${bookId}/scenes/move`, { sceneId, targetChapterId, targetIndex });
