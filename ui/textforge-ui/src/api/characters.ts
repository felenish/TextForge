import { del, get, patch, post, put } from './client';

export interface CharacterSectionDto {
  id: string;
  title: string;
  content: string;
}

export interface CharacterDto {
  id: string;
  name: string;
  role: string;
  age: number | null;
  gender: string | null;
  personality: string | null;
  biography: string | null;
  hasImage: boolean;
  customSections: CharacterSectionDto[];
  sortOrder: number;
  folderId: string | null;
}

export interface WorldFolderDto {
  id: string;
  name: string;
  sortOrder: number;
}

export interface PutCharacterBody {
  name: string;
  role: string;
  age: number | null;
  gender: string | null;
  personality: string | null;
  biography: string | null;
  customSections: CharacterSectionDto[];
}

export const getCharacters = (): Promise<CharacterDto[]> =>
  get('/api/characters');

export const getCharacter = (id: string): Promise<CharacterDto> =>
  get(`/api/characters/${id}`);

export const createCharacter = (name: string, role: string): Promise<CharacterDto> =>
  post('/api/characters', { name, role });

export const updateCharacter = (id: string, patch_: { name?: string; role?: string }): Promise<CharacterDto> =>
  patch(`/api/characters/${id}`, patch_);

export const saveCharacterDetails = (id: string, body: PutCharacterBody): Promise<CharacterDto> =>
  put(`/api/characters/${id}`, body);

export const deleteCharacter = (id: string): Promise<void> =>
  del(`/api/characters/${id}`);

export const uploadCharacterImage = async (id: string, file: File): Promise<CharacterDto> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`/api/characters/${id}/image`, { method: 'PUT', body: formData });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<CharacterDto>;
};

export const deleteCharacterImage = (id: string): Promise<void> =>
  del(`/api/characters/${id}/image`);

export const getCharacterImageUrl = (id: string): string =>
  `/api/characters/${id}/image`;

export const reorderCharacters = (ids: string[]): Promise<void> =>
  post('/api/characters/reorder', { ids });

export const getCharacterFolders = (): Promise<WorldFolderDto[]> =>
  get('/api/characters/folders');

export const saveCharacterFolders = (folders: WorldFolderDto[]): Promise<WorldFolderDto[]> =>
  put('/api/characters/folders', folders);

export const setCharacterFolder = (id: string, folderId: string | null): Promise<CharacterDto> =>
  patch(`/api/characters/${id}/folder`, { folderId });
