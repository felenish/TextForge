import { del, get, patch, post, put } from './client';

export interface PlotGridColumn { id: string; label: string; }
export interface PlotGridRow { id: string; label: string; }
export interface PlotGridCell { rowId: string; colId: string; content: string | null; }

export interface PlotGridDto {
  id: string;
  name: string;
  columns: PlotGridColumn[];
  rows: PlotGridRow[];
  cells: PlotGridCell[];
}

export type PlotGridMeta = Pick<PlotGridDto, 'id' | 'name'>;

export const getPlotGrids = (): Promise<PlotGridMeta[]> =>
  get('/api/plotgrids');

export const getPlotGrid = (id: string): Promise<PlotGridDto> =>
  get(`/api/plotgrids/${id}`);

export const createPlotGrid = (name: string): Promise<PlotGridDto> =>
  post('/api/plotgrids', { name });

export const updatePlotGrid = (id: string, patch_: { name?: string }): Promise<PlotGridMeta> =>
  patch(`/api/plotgrids/${id}`, patch_);

export const savePlotGrid = (id: string, data: PlotGridDto): Promise<PlotGridDto> =>
  put(`/api/plotgrids/${id}`, data);

export const deletePlotGrid = (id: string): Promise<void> =>
  del(`/api/plotgrids/${id}`);
