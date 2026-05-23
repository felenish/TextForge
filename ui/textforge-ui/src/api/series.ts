import { del, get, post } from './client';
import type { BookDto } from './books';

export interface SceneSearchResultDto {
  sceneId: string;
  sceneTitle: string;
  chapterTitle: string;
  bookTitle: string;
  snippet: string | null;
}

export interface SeriesDto {
  id: string;
  title: string;
  rootPath: string;
  createdUtc: string;
  modifiedUtc: string;
  books: BookDto[];
}

export const createSeries = (title: string, parentDirectory: string): Promise<SeriesDto> =>
  post('/api/series', { title, parentDirectory });

export const openSeries = (path: string): Promise<SeriesDto> =>
  post('/api/series/open', { path });

export const getCurrentSeries = (): Promise<SeriesDto> =>
  get('/api/series/current');

export const addBookToSeries = (title: string): Promise<BookDto> =>
  post('/api/series/current/books', { title });

export const removeBook = (bookId: string): Promise<void> =>
  del(`/api/series/current/books/${bookId}`);

export const closeSeries = (): Promise<void> =>
  del('/api/series/current');

export const reorderBooks = (ids: string[]): Promise<void> =>
  post('/api/series/current/books/reorder', { ids });

export const searchSeries = (q: string): Promise<SceneSearchResultDto[]> =>
  get(`/api/series/current/search?q=${encodeURIComponent(q)}`);
