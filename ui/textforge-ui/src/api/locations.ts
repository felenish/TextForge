import { del, get, patch, post, put } from './client';

export interface LocationDto {
  id: string;
  name: string;
  description: string | null;
  hasImage: boolean;
}

export const getLocations = (): Promise<LocationDto[]> =>
  get('/api/locations');

export const getLocation = (id: string): Promise<LocationDto> =>
  get(`/api/locations/${id}`);

export const createLocation = (name: string): Promise<LocationDto> =>
  post('/api/locations', { name });

export const updateLocation = (id: string, patch_: { name?: string }): Promise<LocationDto> =>
  patch(`/api/locations/${id}`, patch_);

export const saveLocationDetails = (id: string, body: { name: string; description: string | null }): Promise<LocationDto> =>
  put(`/api/locations/${id}`, body);

export const deleteLocation = (id: string): Promise<void> =>
  del(`/api/locations/${id}`);

export const uploadLocationImage = async (id: string, file: File): Promise<LocationDto> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`/api/locations/${id}/image`, { method: 'PUT', body: formData });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<LocationDto>;
};

export const deleteLocationImage = (id: string): Promise<void> =>
  del(`/api/locations/${id}/image`);

export const getLocationImageUrl = (id: string): string =>
  `/api/locations/${id}/image`;
