import { get, patch } from './client';

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

export const getBook = (id: string): Promise<BookDto> =>
  get(`/api/books/${id}`);

export const renameBook = (id: string, title: string): Promise<BookDto> =>
  patch(`/api/books/${id}`, { title });
