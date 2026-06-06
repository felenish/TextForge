import { del, get, patch, post, put } from './client';

export interface ChecklistItemDto {
  id: string;
  text: string;
  done: boolean;
}

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
  checklistItems: ChecklistItemDto[];
}

export interface PatchSceneBody {
  title?: string;
  status?: string;
  pov?: string;
  characterIds?: string[];
  notes?: string;
  checklistItems?: ChecklistItemDto[];
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

export const uploadSceneAsset = async (sceneId: string, file: File): Promise<{ filename: string }> => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/scenes/${sceneId}/assets`, { method: 'POST', body: form });
  if (!res.ok) throw await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
  return res.json();
};

export const getSceneAssetUrl = (sceneId: string, filename: string): string =>
  `/api/scenes/${sceneId}/assets/${encodeURIComponent(filename)}`;
