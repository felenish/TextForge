import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSceneEditor } from '../src/hooks/useSceneEditor';

const getSceneMock = vi.fn();
const saveSceneMock = vi.fn();

vi.mock('../src/api/scenes', () => ({
  getScene: (...args: unknown[]) => getSceneMock(...args),
  saveScene: (...args: unknown[]) => saveSceneMock(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getSceneMock.mockResolvedValue({ content: 'Hello world' });
  saveSceneMock.mockResolvedValue(undefined);
});

describe('useSceneEditor', () => {
  it('starts loading until the first scene resolves', async () => {
    let resolve!: (v: unknown) => void;
    getSceneMock.mockReturnValue(new Promise(r => { resolve = r; }));

    const { result } = renderHook(() => useSceneEditor('scene-1'));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolve({ content: 'text' });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('loads content from API on mount', async () => {
    getSceneMock.mockResolvedValue({ content: 'Loaded text' });
    const { result } = renderHook(() => useSceneEditor('scene-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.content).toBe('Loaded text');
    expect(result.current.isDirty).toBe(false);
  });

  it('treats null content as empty string', async () => {
    getSceneMock.mockResolvedValue({ content: null });
    const { result } = renderHook(() => useSceneEditor('scene-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.content).toBe('');
  });

  it('isDirty becomes true after onChange', async () => {
    const { result } = renderHook(() => useSceneEditor('scene-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onChange('Modified text'));

    expect(result.current.isDirty).toBe(true);
  });

  it('isDirty is false when content matches saved content', async () => {
    getSceneMock.mockResolvedValue({ content: 'Original' });
    const { result } = renderHook(() => useSceneEditor('scene-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onChange('Changed'));
    act(() => result.current.onChange('Original'));

    expect(result.current.isDirty).toBe(false);
  });

  it('save calls API with current content and clears isDirty', async () => {
    const { result } = renderHook(() => useSceneEditor('scene-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onChange('New content'));
    await act(async () => { await result.current.save(); });

    expect(saveSceneMock).toHaveBeenCalledWith('scene-1', 'New content');
    expect(result.current.isDirty).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('save sets error when API fails', async () => {
    saveSceneMock.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useSceneEditor('scene-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.save(); });

    expect(result.current.error).toBe('Network error');
    expect(result.current.saving).toBe(false);
  });

  it('sets error and finishes loading when fetch fails', async () => {
    getSceneMock.mockRejectedValue(new Error('Not found'));
    const { result } = renderHook(() => useSceneEditor('scene-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Not found');
    expect(result.current.content).toBe('');
  });

  it('cancels stale load when sceneId changes before resolution', async () => {
    let resolveFirst!: (v: unknown) => void;
    getSceneMock
      .mockReturnValueOnce(new Promise(r => { resolveFirst = r; }))
      .mockResolvedValueOnce({ content: 'Scene B' });

    const { result, rerender } = renderHook(
      ({ id }) => useSceneEditor(id),
      { initialProps: { id: 'scene-a' } },
    );

    // Switch to scene-b before scene-a resolves
    rerender({ id: 'scene-b' });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Now resolve scene-a — should be ignored
    await act(async () => {
      resolveFirst({ content: 'Scene A (stale)' });
    });

    expect(result.current.content).toBe('Scene B');
  });

  it('saving is false after a successful save completes', async () => {
    const { result } = renderHook(() => useSceneEditor('scene-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.save(); });

    expect(result.current.saving).toBe(false);
  });
});
