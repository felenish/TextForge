import { createContext, useCallback, useContext, useState } from 'react';

interface WorkspaceContextValue {
  dirtySceneIds: ReadonlySet<string>;
  bookTitle: string | null;
  markDirty: (sceneId: string) => void;
  markClean: (sceneId: string) => void;
  setBookTitle: (title: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  dirtySceneIds: new Set(),
  bookTitle: null,
  markDirty: () => {},
  markClean: () => {},
  setBookTitle: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [bookTitle, setBookTitleState] = useState<string | null>(null);

  const markDirty = useCallback((id: string) => {
    setDirtyIds(prev => prev.has(id) ? prev : new Set([...prev, id]));
  }, []);

  const markClean = useCallback((id: string) => {
    setDirtyIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const setBookTitle = useCallback((title: string | null) => {
    setBookTitleState(title);
  }, []);

  return (
    <WorkspaceContext.Provider value={{ dirtySceneIds: dirtyIds, bookTitle, markDirty, markClean, setBookTitle }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
