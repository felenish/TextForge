import { del, get, patch, post, put } from './client';

export interface OutlineDto {
  id: string;
  name: string;
  content: string | null;
  sortOrder?: number;
}

export const getOutlines = (): Promise<OutlineDto[]> =>
  get('/api/outlines');

export const getOutline = (id: string): Promise<OutlineDto> =>
  get(`/api/outlines/${id}`);

export const createOutline = (name: string): Promise<OutlineDto> =>
  post('/api/outlines', { name });

export const updateOutline = (id: string, patch_: { name?: string }): Promise<OutlineDto> =>
  patch(`/api/outlines/${id}`, patch_);

export const saveOutlineDetails = (id: string, body: { name: string; content: string | null }): Promise<OutlineDto> =>
  put(`/api/outlines/${id}`, body);

export const deleteOutline = (id: string): Promise<void> =>
  del(`/api/outlines/${id}`);

export const reorderOutlines = (ids: string[]): Promise<void> =>
  post('/api/outlines/reorder', { ids });
