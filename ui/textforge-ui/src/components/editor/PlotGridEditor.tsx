import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PlotGridDto } from '../../api/plotGrids';
import * as plotGridsApi from '../../api/plotGrids';
import { Icon } from '../ui/Icon';
import { useDialog } from '../../contexts/DialogContext';

interface PlotGridEditorProps {
  plotGridId: string;
  onSaved?: (dto: PlotGridDto) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface GridState {
  id: string;
  name: string;
  columns: { id: string; label: string }[];
  rows: { id: string; label: string }[];
  cells: Record<string, string>;
}

function cellKey(rowId: string, colId: string): string {
  return `${rowId}::${colId}`;
}

function dtoToState(dto: PlotGridDto): GridState {
  const cells: Record<string, string> = {};
  for (const cell of dto.cells) {
    if (cell.content) cells[cellKey(cell.rowId, cell.colId)] = cell.content;
  }
  return { id: dto.id, name: dto.name, columns: [...dto.columns], rows: [...dto.rows], cells };
}

function stateToDto(state: GridState): PlotGridDto {
  const cells = Object.entries(state.cells)
    .filter(([, v]) => v.trim() !== '')
    .map(([k, content]) => {
      const sep = k.indexOf('::');
      return { rowId: k.slice(0, sep), colId: k.slice(sep + 2), content };
    });
  return { id: state.id, name: state.name, columns: state.columns, rows: state.rows, cells };
}

export function PlotGridEditor({ plotGridId, onSaved }: PlotGridEditorProps) {
  const { confirm } = useDialog();
  const [grid, setGrid] = useState<GridState | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loading = loadedId !== plotGridId;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<GridState | null>(null);

  useLayoutEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const flushSave = useCallback(async (g: GridState) => {
    setSaveStatus('saving');
    try {
      const saved = await plotGridsApi.savePlotGrid(g.id, stateToDto(g));
      setSaveStatus('saved');
      onSaved?.(saved);
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 1500);
    } catch {
      setSaveStatus('error');
    }
  }, [onSaved]);

  const scheduleSave = useCallback((g: GridState) => {
    latestRef.current = g;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(g), 800);
  }, [flushSave]);

  useEffect(() => {
    let cancelled = false;
    latestRef.current = null;
    plotGridsApi.getPlotGrid(plotGridId)
      .then(dto => {
        if (cancelled) return;
        const state = dtoToState(dto);
        setGrid(state);
        setLoadedId(plotGridId);
        latestRef.current = state;
      })
      .catch(() => { if (!cancelled) setLoadedId(plotGridId); });
    return () => { cancelled = true; };
  }, [plotGridId]);

  const update = useCallback((updater: (prev: GridState) => GridState) => {
    setGrid(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const setCell = useCallback((rowId: string, colId: string, value: string) => {
    update(prev => ({ ...prev, cells: { ...prev.cells, [cellKey(rowId, colId)]: value } }));
  }, [update]);

  const updateName = useCallback((name: string) => {
    update(prev => ({ ...prev, name }));
  }, [update]);

  const updateColLabel = useCallback((colId: string, label: string) => {
    update(prev => ({ ...prev, columns: prev.columns.map(c => c.id === colId ? { ...c, label } : c) }));
  }, [update]);

  const updateRowLabel = useCallback((rowId: string, label: string) => {
    update(prev => ({ ...prev, rows: prev.rows.map(r => r.id === rowId ? { ...r, label } : r) }));
  }, [update]);

  const addColumn = useCallback(() => {
    update(prev => ({
      ...prev,
      columns: [...prev.columns, { id: crypto.randomUUID(), label: `Plot Line ${prev.columns.length + 1}` }],
    }));
  }, [update]);

  const removeColumn = useCallback((colId: string) => {
    update(prev => {
      const cells = Object.fromEntries(
        Object.entries(prev.cells).filter(([k]) => !k.endsWith(`::${colId}`))
      );
      return { ...prev, columns: prev.columns.filter(c => c.id !== colId), cells };
    });
  }, [update]);

  const insertRowAt = useCallback((index: number) => {
    update(prev => ({
      ...prev,
      rows: [
        ...prev.rows.slice(0, index),
        { id: crypto.randomUUID(), label: `Chapter ${prev.rows.length + 1}` },
        ...prev.rows.slice(index),
      ],
    }));
  }, [update]);

  const addRow = useCallback(() => {
    update(prev => ({
      ...prev,
      rows: [...prev.rows, { id: crypto.randomUUID(), label: `Chapter ${prev.rows.length + 1}` }],
    }));
  }, [update]);

  const removeRow = useCallback(async (rowId: string) => {
    const ok = await confirm({
      title: 'Delete Chapter Row',
      message: 'Delete this chapter row and all attached plot cells?',
      confirmLabel: 'Delete',
      dangerous: true,
    });
    if (!ok) return;

    update(prev => {
      const cells = Object.fromEntries(
        Object.entries(prev.cells).filter(([k]) => !k.startsWith(`${rowId}::`))
      );
      return { ...prev, rows: prev.rows.filter(r => r.id !== rowId), cells };
    });
  }, [confirm, update]);

  const reorderRows = useCallback((dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    update(prev => {
      const from = prev.rows.findIndex(r => r.id === dragId);
      const to = prev.rows.findIndex(r => r.id === targetId);
      if (from < 0 || to < 0 || from === to) return prev;

      const rows = [...prev.rows];
      const [moved] = rows.splice(from, 1);
      rows.splice(to, 0, moved);
      return { ...prev, rows };
    });
  }, [update]);

  const onRowDragStart = useCallback((rowId: string, event: React.DragEvent<HTMLElement>) => {
    setDraggingRowId(rowId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', rowId);
  }, []);

  const onRowDragOver = useCallback((rowId: string, event: React.DragEvent<HTMLTableRowElement>) => {
    if (!draggingRowId || draggingRowId === rowId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverRowId(rowId);
  }, [draggingRowId]);

  const onRowDrop = useCallback((rowId: string, event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    if (!draggingRowId || draggingRowId === rowId) return;
    reorderRows(draggingRowId, rowId);
    setDragOverRowId(null);
  }, [draggingRowId, reorderRows]);

  const onRowDragEnd = useCallback(() => {
    setDraggingRowId(null);
    setDragOverRowId(null);
  }, []);

  if (loading) return <div className="char-ed-wrap"><div className="char-ed-loading">Loading…</div></div>;
  if (!grid) return <div className="char-ed-wrap"><div className="char-ed-loading">Plot grid not found.</div></div>;

  return (
    <div className="pg-wrap">
      <div className="pg-title-bar">
        <input
          className="pg-title"
          value={grid.name}
          onChange={e => updateName(e.target.value)}
          placeholder="Plot grid name"
        />
      </div>

      <div className="pg-scroll">
        <table className="pg-table">
          <thead>
            <tr>
              <th className="pg-corner">
                <button className="pg-corner-add" onClick={() => insertRowAt(0)} title="Insert chapter at top">
                  <Icon name="plus" size={11} stroke={2} />
                  <span>Chapter</span>
                </button>
              </th>
              {grid.columns.map(col => (
                <th key={col.id} className="pg-col-hdr">
                  <div className="pg-hdr-inner">
                    <input
                      className="pg-hdr-input"
                      value={col.label}
                      onChange={e => updateColLabel(col.id, e.target.value)}
                      placeholder="Plot line"
                    />
                    <button
                      className="pg-del"
                      onClick={() => removeColumn(col.id)}
                      title="Remove column"
                    >
                      <Icon name="x" size={11} stroke={2} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="pg-add-col">
                <button onClick={addColumn}>
                  <Icon name="plus" size={12} stroke={2} />
                  <span>Plot Line</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, index) => (
              <tr
                key={row.id}
                className={dragOverRowId === row.id ? 'pg-row-drop-target' : undefined}
                onDragOver={e => onRowDragOver(row.id, e)}
                onDrop={e => onRowDrop(row.id, e)}
              >
                <th className="pg-row-hdr">
                  <div className="pg-hdr-inner pg-row-inner">
                    <span
                      className="pg-row-drag"
                      draggable
                      onDragStart={e => onRowDragStart(row.id, e)}
                      onDragEnd={onRowDragEnd}
                      title="Drag to reorder chapter"
                    >
                      ⋮⋮
                    </span>
                    <input
                      className="pg-hdr-input"
                      value={row.label}
                      onChange={e => updateRowLabel(row.id, e.target.value)}
                      placeholder="Chapter / Scene"
                    />
                    <button
                      className="pg-mini"
                      onClick={() => insertRowAt(index + 1)}
                      title="Insert chapter below"
                    >
                      <Icon name="plus" size={11} stroke={2} />
                    </button>
                    <button
                      className="pg-del"
                      onClick={() => { void removeRow(row.id); }}
                      title="Remove row"
                    >
                      <Icon name="x" size={11} stroke={2} />
                    </button>
                  </div>
                </th>
                {grid.columns.map(col => (
                  <td key={col.id} className="pg-cell">
                    <textarea
                      value={grid.cells[cellKey(row.id, col.id)] ?? ''}
                      onChange={e => setCell(row.id, col.id, e.target.value)}
                      placeholder="…"
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
            <tr className="pg-add-row">
              <th>
                <button onClick={addRow}>
                  <Icon name="plus" size={12} stroke={2} />
                  <span>Chapter / Scene</span>
                </button>
              </th>
              {grid.columns.map(col => <td key={col.id} />)}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className={`char-ed-status char-ed-status--${saveStatus}`}>
        {saveStatus === 'saving' && 'Saving…'}
        {saveStatus === 'saved' && 'Saved'}
        {saveStatus === 'error' && 'Save failed'}
      </div>
    </div>
  );
}
