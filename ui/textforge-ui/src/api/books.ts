import { get, post } from './client';

export interface SceneMetaDto {
  id: string;
  title: string;
  sortOrder: number;
  status: string;
}

export interface ChapterDto {
  id: string;
  title: string;
  sortOrder: number;
  scenes: SceneMetaDto[];
}

export interface BookDto {
  id: string;
  title: string;
  rootPath: string;
  createdUtc: string;
  modifiedUtc: string;
  chapters: ChapterDto[];
}

export const createBook = (title: string, parentDirectory: string): Promise<BookDto> =>
  post('/api/books', { title, parentDirectory });

export const openBook = (path: string): Promise<BookDto> =>
  post('/api/books/open', { path });

export const getBook = (id: string): Promise<BookDto> =>
  get(`/api/books/${id}`);
