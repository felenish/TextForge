import { createContext, useCallback, useContext, useState } from 'react';

interface WorkspaceContextValue {
  dirtySceneIds: ReadonlySet<string>;
  bookTitle: string | null;
  wordCount: number;
  markDirty: (sceneId: string) => void;
  markClean: (sceneId: string) => void;
  setBookTitle: (title: string | null) => void;
  setWordCount: (n: number) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  dirtySceneIds: new Set(),
  bookTitle: null,
  wordCount: 0,
  markDirty: () => {},
  markClean: () => {},
  setBookTitle: () => {},
  setWordCount: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [bookTitle, setBookTitleState] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);

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
    <WorkspaceContext.Provider value={{ dirtySceneIds: dirtyIds, bookTitle, wordCount, markDirty, markClean, setBookTitle, setWordCount }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
