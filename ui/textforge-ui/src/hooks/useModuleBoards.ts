import { useCallback, useEffect, useReducer } from 'react';

export interface ModuleBoard {
  id: string;
  name: string;
  createdAt: string;
}

interface UseBoardsResult {
  boards: ModuleBoard[];
  loading: boolean;
  addBoard: (name: string) => Promise<ModuleBoard>;
  renameBoard: (id: string, name: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
}

const INDEX_FILE = '_boards.json';

function indexUrl(storageBase: string, bookId: string) {
  return `${storageBase}/${INDEX_FILE}?bookId=${encodeURIComponent(bookId)}`;
}

async function fetchBoards(storageBase: string, bookId: string): Promise<ModuleBoard[]> {
  const res = await fetch(indexUrl(storageBase, bookId));
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function saveBoards(storageBase: string, bookId: string, boards: ModuleBoard[]): Promise<void> {
  await fetch(indexUrl(storageBase, bookId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(boards),
  });
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

type State = { status: 'idle' | 'loading'; boards: ModuleBoard[] };
type Action =
  | { type: 'fetch_start' }
  | { type: 'fetch_done'; boards: ModuleBoard[] }
  | { type: 'fetch_error' }
  | { type: 'set'; boards: ModuleBoard[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'fetch_start': return { ...state, status: 'loading' };
    case 'fetch_done':  return { status: 'idle', boards: action.boards };
    case 'fetch_error': return { status: 'idle', boards: [] };
    case 'set':         return { ...state, boards: action.boards };
  }
}

/**
 * Manages the list of named board instances for a single external module.
 * The index is persisted to `{storageBase}/_boards.json`.
 */
export function useModuleBoards(moduleId: string, storageBase: string, bookId: string | null): UseBoardsResult {
  const [{ status, boards }, dispatch] = useReducer(reducer, { status: 'idle', boards: [] });

  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;
    dispatch({ type: 'fetch_start' });

    fetchBoards(storageBase, bookId)
      .then(data => { if (!cancelled) dispatch({ type: 'fetch_done', boards: data }); })
      .catch(() => { if (!cancelled) dispatch({ type: 'fetch_error' }); });

    return () => { cancelled = true; };
  }, [moduleId, storageBase, bookId]);

  const boards_ = bookId ? boards : [];

  const addBoard = useCallback(async (name: string): Promise<ModuleBoard> => {
    if (!bookId) throw new Error('No active book');
    const board: ModuleBoard = { id: uid(), name, createdAt: new Date().toISOString() };
    const next = [...boards, board];
    await saveBoards(storageBase, bookId, next);
    dispatch({ type: 'set', boards: next });
    return board;
  }, [boards, storageBase, bookId]);

  const renameBoard = useCallback(async (id: string, name: string): Promise<void> => {
    if (!bookId) return;
    const next = boards.map(b => b.id === id ? { ...b, name } : b);
    await saveBoards(storageBase, bookId, next);
    dispatch({ type: 'set', boards: next });
  }, [boards, storageBase, bookId]);

  const deleteBoard = useCallback(async (id: string): Promise<void> => {
    if (!bookId) return;
    const next = boards.filter(b => b.id !== id);
    await saveBoards(storageBase, bookId, next);
    dispatch({ type: 'set', boards: next });
  }, [boards, storageBase, bookId]);

  return { boards: boards_, loading: status === 'loading', addBoard, renameBoard, deleteBoard };
}
