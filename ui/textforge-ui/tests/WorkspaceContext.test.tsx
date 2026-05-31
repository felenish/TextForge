import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceProvider, useWorkspace } from '../src/contexts/WorkspaceContext';

describe('WorkspaceContext flows', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('tracks dirty state and clears it', () => {
    const { result } = renderHook(() => useWorkspace(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <WorkspaceProvider>{children}</WorkspaceProvider>
      ),
    });

    act(() => result.current.markDirty('scene-1'));
    act(() => result.current.markDirty('scene-2'));

    expect(result.current.dirtySceneIds.has('scene-1')).toBe(true);
    expect(result.current.dirtySceneIds.has('scene-2')).toBe(true);

    act(() => result.current.markClean('scene-1'));
    expect(result.current.dirtySceneIds.has('scene-1')).toBe(false);
    expect(result.current.dirtySceneIds.has('scene-2')).toBe(true);
  });

  it('cycles theme and persists preference', () => {
    const { result } = renderHook(() => useWorkspace(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <WorkspaceProvider>{children}</WorkspaceProvider>
      ),
    });

    expect(result.current.theme).toBe('dark');

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('tf-theme')).toBe('light');

    act(() => result.current.applyTheme('sepia'));
    expect(result.current.theme).toBe('sepia');
    expect(document.documentElement.dataset.theme).toBe('sepia');
    expect(localStorage.getItem('tf-theme')).toBe('sepia');
  });

  it('patchSceneMeta updates only the targeted scene', () => {
    const { result } = renderHook(() => useWorkspace(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <WorkspaceProvider>{children}</WorkspaceProvider>
      ),
    });

    act(() => {
      result.current.setSeries({
        id: 'series-1',
        title: 'Series',
        rootPath: 'C:/tmp/series',
        createdUtc: new Date().toISOString(),
        modifiedUtc: new Date().toISOString(),
        books: [
          {
            id: 'book-1',
            title: 'Book',
            rootPath: 'C:/tmp/series/book',
            createdUtc: new Date().toISOString(),
            modifiedUtc: new Date().toISOString(),
            chapters: [
              {
                id: 'ch-1',
                title: 'Chapter',
                sortOrder: 1,
                scenes: [
                  { id: 'scene-a', title: 'Scene A', sortOrder: 1, status: 'draft' },
                  { id: 'scene-b', title: 'Scene B', sortOrder: 2, status: 'draft' },
                ],
              },
            ],
          },
        ],
      });
    });

    act(() => {
      result.current.patchSceneMeta('scene-b', { title: 'Scene B Updated', status: 'done' });
    });

    const series = result.current.series;
    expect(series).not.toBeNull();
    const scenes = series!.books[0].chapters[0].scenes;
    expect(scenes[0]).toEqual({ id: 'scene-a', title: 'Scene A', sortOrder: 1, status: 'draft' });
    expect(scenes[1]).toEqual({ id: 'scene-b', title: 'Scene B Updated', sortOrder: 2, status: 'done' });
  });
});
