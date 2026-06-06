import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlotGridEditor } from '../src/components/editor/PlotGridEditor';

const getPlotGridMock = vi.fn();
const savePlotGridMock = vi.fn();
const confirmMock = vi.fn();

vi.mock('../src/api/plotGrids', () => ({
  getPlotGrid: (...args: unknown[]) => getPlotGridMock(...args),
  savePlotGrid: (...args: unknown[]) => savePlotGridMock(...args),
}));

vi.mock('../src/contexts/DialogContext', () => ({
  useDialog: () => ({ confirm: confirmMock }),
}));

function baseGrid() {
  return {
    id: 'grid-1',
    name: 'Grid',
    columns: [{ id: 'c1', label: 'Arc' }],
    rows: [
      { id: 'r1', label: 'Chapter 1' },
      { id: 'r2', label: 'Chapter 2' },
    ],
    cells: [
      { rowId: 'r1', colId: 'c1', content: 'A1' },
      { rowId: 'r2', colId: 'c1', content: 'A2' },
    ],
  };
}

function makeDataTransfer() {
  return {
    effectAllowed: 'all',
    dropEffect: 'move',
    setData: vi.fn(),
    getData: vi.fn(),
  } as unknown as DataTransfer;
}

describe('PlotGridEditor chapter management', () => {
  beforeEach(() => {
    getPlotGridMock.mockReset();
    savePlotGridMock.mockReset();
    confirmMock.mockReset();

    getPlotGridMock.mockResolvedValue(baseGrid());
    // Reject to avoid the component's delayed "saved" timer path, which causes noisy act warnings.
    savePlotGridMock.mockImplementation(async () => {
      throw new Error('save failed in test');
    });
    confirmMock.mockResolvedValue(true);

    let i = 0;
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockImplementation(() => `new-${++i}`);
  });

  it('inserts chapter rows at top and below target', async () => {
    render(<PlotGridEditor plotGridId="grid-1" />);

    await screen.findByDisplayValue('Chapter 1');

    fireEvent.click(screen.getByTitle('Insert chapter at top'));
    fireEvent.click(screen.getAllByTitle('Insert chapter below')[0]);

    await waitFor(() => {
      expect(savePlotGridMock).toHaveBeenCalled();
    }, { timeout: 2000 });

    const [, payload] = savePlotGridMock.mock.calls.at(-1)!;
    const rows = (payload as { rows: Array<{ id: string }> }).rows;
    expect(rows.map(r => r.id)).toEqual(['new-1', 'new-2', 'r1', 'r2']);
  });

  it('does not delete row when confirm modal is cancelled', async () => {
    confirmMock.mockResolvedValue(false);

    render(<PlotGridEditor plotGridId="grid-1" />);

    await screen.findByDisplayValue('Chapter 1');

    fireEvent.click(screen.getAllByTitle('Remove row')[0]);
    await Promise.resolve();

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalled();
    }, { timeout: 1000 });
    expect(savePlotGridMock).not.toHaveBeenCalled();
  });

  it('reorders rows by drag/drop while preserving cell mapping', async () => {
    render(<PlotGridEditor plotGridId="grid-1" />);

    await screen.findByDisplayValue('Chapter 1');

    const firstRowInput = screen.getByDisplayValue('Chapter 1');
    const secondRowInput = screen.getByDisplayValue('Chapter 2');
    const firstHandle = firstRowInput.closest('tr')?.querySelector('.pg-row-drag') as HTMLElement;
    const secondRow = secondRowInput.closest('tr') as HTMLElement;

    const dt = makeDataTransfer();
    fireEvent.dragStart(firstHandle, { dataTransfer: dt });
    fireEvent.dragOver(secondRow, { dataTransfer: dt });
    fireEvent.drop(secondRow, { dataTransfer: dt });

    await waitFor(() => {
      const [, payload] = savePlotGridMock.mock.calls.at(-1)!;
      const dto = payload as {
        rows: Array<{ id: string }>;
        cells: Array<{ rowId: string; content: string }>;
      };

      expect(dto.rows.map(r => r.id)).toEqual(['r2', 'r1']);
      expect(dto.cells).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rowId: 'r1', content: 'A1' }),
          expect.objectContaining({ rowId: 'r2', content: 'A2' }),
        ])
      );
    }, { timeout: 2000 });
  });
});
