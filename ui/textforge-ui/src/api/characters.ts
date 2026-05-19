import { del, get, patch, post } from './client';

export interface CharacterDto {
  id: string;
  name: string;
  role: string;
  notes: string;
}

export const getCharacters = (): Promise<CharacterDto[]> =>
  get('/api/characters');

export const createCharacter = (name: string, role: string): Promise<CharacterDto> =>
  post('/api/characters', { name, role });

export const updateCharacter = (id: string, patch_: Partial<Pick<CharacterDto, 'name' | 'role' | 'notes'>>): Promise<void> =>
  patch(`/api/characters/${id}`, patch_);

export const deleteCharacter = (id: string): Promise<void> =>
  del(`/api/characters/${id}`);
