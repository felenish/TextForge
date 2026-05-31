import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomPanel } from '../src/components/panels/BottomPanel';

const getSceneMock = vi.fn();
const patchSceneMock = vi.fn();

const workspaceState = {
  series: null,
  wordCount: 0,
  totalWordCount: 0,
  sceneWordCounts: new Map<string, number>(),
  activeSceneId: 'scene-1' as string | null,
};

vi.mock('../src/api/scenes', () => ({
  getScene: (...args: unknown[]) => getSceneMock(...args),
  patchScene: (...args: unknown[]) => patchSceneMock(...args),
}));

vi.mock('../src/contexts/WorkspaceContext', () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock('../src/contexts/OutputContext', () => ({
  useOutput: () => ({ lines: [], clear: vi.fn() }),
}));

function makeDataTransfer() {
  return {
    effectAllowed: 'all',
    dropEffect: 'move',
    setData: vi.fn(),
    getData: vi.fn(),
  } as unknown as DataTransfer;
}

describe('BottomPanel checklist behavior', () => {
  beforeEach(() => {
    workspaceState.activeSceneId = 'scene-1';
    getSceneMock.mockReset();
    patchSceneMock.mockReset();
    getSceneMock.mockResolvedValue({ checklistItems: [] });
    patchSceneMock.mockResolvedValue(undefined);
  });

  it('loads checklist from active scene and persists added note', async () => {
    getSceneMock.mockResolvedValue({
      checklistItems: [{ id: 'n1', text: 'Existing', done: false }],
    });

    render(<BottomPanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Notes'));

    await screen.findByText('Existing');

    const input = screen.getByPlaceholderText('+ Add a note…');
    fireEvent.change(input, { target: { value: 'New note' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(patchSceneMock).toHaveBeenCalled();
    });

    const lastCall = patchSceneMock.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('scene-1');
    expect(lastCall?.[1].checklistItems).toHaveLength(2);
    expect(lastCall?.[1].checklistItems[1].text).toBe('New note');
  });

  it('shows no-active-scene message and disables add input', async () => {
    workspaceState.activeSceneId = null;

    render(<BottomPanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Notes'));

    expect(screen.getByText('Open a scene to view checklist notes.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('+ Add a note…')).toBeDisabled();
    expect(getSceneMock).not.toHaveBeenCalled();
  });

  it('reorders via drag-and-drop while preserving done state', async () => {
    getSceneMock.mockResolvedValue({
      checklistItems: [
        { id: 'a', text: 'First', done: false },
        { id: 'b', text: 'Second', done: true },
      ],
    });

    render(<BottomPanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Notes'));

    await screen.findByText('First');
    await screen.findByText('Second');

    const firstRow = screen.getByText('First').closest('.nb-item');
    const secondRow = screen.getByText('Second').closest('.nb-item');
    expect(firstRow).toBeTruthy();
    expect(secondRow).toBeTruthy();

    const dt = makeDataTransfer();
    fireEvent.dragStart(firstRow!, { dataTransfer: dt });
    fireEvent.dragOver(secondRow!, { dataTransfer: dt });
    fireEvent.drop(secondRow!, { dataTransfer: dt });

    await waitFor(() => {
      const lastCall = patchSceneMock.mock.calls.at(-1);
      expect(lastCall?.[1].checklistItems[0].id).toBe('b');
      expect(lastCall?.[1].checklistItems[0].done).toBe(true);
      expect(lastCall?.[1].checklistItems[1].id).toBe('a');
      expect(lastCall?.[1].checklistItems[1].done).toBe(false);
    });
  });
});
