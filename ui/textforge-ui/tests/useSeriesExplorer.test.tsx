import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeriesExplorer } from '../src/hooks/useSeriesExplorer';

const showToastMock = vi.fn();
const promptMock = vi.fn();

const openSeriesMock = vi.fn();
const closeSeriesMock = vi.fn(async () => undefined);
const renameBookApiMock = vi.fn();

vi.mock('../src/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

vi.mock('../src/contexts/DialogContext', () => ({
  useDialog: () => ({ prompt: promptMock }),
}));

vi.mock('../src/api/shell', () => ({
  openFolderDialog: vi.fn(),
  openFileDialog: vi.fn(),
}));

vi.mock('../src/api/series', () => ({
  createSeries: vi.fn(),
  openSeries: (...args: unknown[]) => openSeriesMock(...args),
  closeSeries: () => closeSeriesMock(),
  addBookToSeries: vi.fn(),
  removeBook: vi.fn(),
  reorderBooks: vi.fn(),
}));

vi.mock('../src/api/books', () => ({
  renameBook: (...args: unknown[]) => renameBookApiMock(...args),
}));

vi.mock('../src/api/chapters', () => ({
  addChapter: vi.fn(),
  updateChapter: vi.fn(),
  deleteChapter: vi.fn(),
  reorderChapters: vi.fn(),
  reorderScenes: vi.fn(),
  moveScene: vi.fn(),
}));

vi.mock('../src/api/scenes', () => ({
  addScene: vi.fn(),
  renameScene: vi.fn(),
  deleteScene: vi.fn(),
}));

vi.mock('../src/api/characters', () => ({
  getCharacters: vi.fn(),
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
}));

vi.mock('../src/api/locations', () => ({
  getLocations: vi.fn(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  deleteLocation: vi.fn(),
}));

vi.mock('../src/api/outlines', () => ({
  getOutlines: vi.fn(),
  createOutline: vi.fn(),
  updateOutline: vi.fn(),
  deleteOutline: vi.fn(),
}));

vi.mock('../src/api/plotGrids', () => ({
  getPlotGrids: vi.fn(),
  createPlotGrid: vi.fn(),
  updatePlotGrid: vi.fn(),
  deletePlotGrid: vi.fn(),
}));

describe('useSeriesExplorer optimistic flows', () => {
  beforeEach(() => {
    showToastMock.mockReset();
    promptMock.mockReset();
    openSeriesMock.mockReset();
    closeSeriesMock.mockReset();
    renameBookApiMock.mockReset();
    localStorage.clear();
  });

  it('rolls back renameBook when API request fails', async () => {
    openSeriesMock.mockResolvedValue({
      id: 'series-1',
      title: 'Series',
      rootPath: 'C:/series',
      createdUtc: new Date().toISOString(),
      modifiedUtc: new Date().toISOString(),
      books: [
        {
          id: 'book-1',
          title: 'Old Title',
          rootPath: 'C:/series/book-1',
          createdUtc: new Date().toISOString(),
          modifiedUtc: new Date().toISOString(),
          chapters: [],
        },
      ],
    });

    renameBookApiMock.mockRejectedValue(new Error('rename failed'));

    const { result } = renderHook(() => useSeriesExplorer());

    await act(async () => {
      await result.current.openSeriesFromPath('C:/series/series.tfseries');
    });

    await act(async () => {
      await result.current.renameBook('book-1', 'New Title');
    });

    expect(result.current.series?.books[0].title).toBe('Old Title');
    expect(showToastMock).toHaveBeenCalledWith('rename failed');
  });

  it('closeSeries clears localStorage last-series marker', async () => {
    localStorage.setItem('tf-last-series', 'C:/series/series.tfseries');

    const { result } = renderHook(() => useSeriesExplorer());

    await act(async () => {
      await result.current.closeSeries();
    });

    await waitFor(() => {
      expect(localStorage.getItem('tf-last-series')).toBeNull();
    });
  });
});
