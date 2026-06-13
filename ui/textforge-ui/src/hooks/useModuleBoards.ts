import { useCallback, useEffect, useState } from 'react';

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

/**
 * Manages the list of named board instances for a single external module.
 * The index is persisted to `{storageBase}/_boards.json`.
 */
export function useModuleBoards(moduleId: string, storageBase: string, bookId: string | null): UseBoardsResult {
  const [boards, setBoards] = useState<ModuleBoard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookId) { setBoards([]); return; }
    let cancelled = false;
    setLoading(true);
    fetchBoards(storageBase, bookId)
      .then(data => { if (!cancelled) setBoards(data); })
      .catch(() => { if (!cancelled) setBoards([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [moduleId, storageBase, bookId]);

  const addBoard = useCallback(async (name: string): Promise<ModuleBoard> => {
    if (!bookId) throw new Error('No active book');
    const board: ModuleBoard = { id: uid(), name, createdAt: new Date().toISOString() };
    const next = [...boards, board];
    await saveBoards(storageBase, bookId, next);
    setBoards(next);
    return board;
  }, [boards, storageBase, bookId]);

  const renameBoard = useCallback(async (id: string, name: string): Promise<void> => {
    if (!bookId) return;
    const next = boards.map(b => b.id === id ? { ...b, name } : b);
    await saveBoards(storageBase, bookId, next);
    setBoards(next);
  }, [boards, storageBase, bookId]);

  const deleteBoard = useCallback(async (id: string): Promise<void> => {
    if (!bookId) return;
    const next = boards.filter(b => b.id !== id);
    await saveBoards(storageBase, bookId, next);
    setBoards(next);
  }, [boards, storageBase, bookId]);

  return { boards, loading, addBoard, renameBoard, deleteBoard };
}
