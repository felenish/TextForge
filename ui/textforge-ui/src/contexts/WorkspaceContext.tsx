import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'sepia';

export interface ContentStats {
  paragraphCount: number;
  sentenceCount: number;
}

interface WorkspaceContextValue {
  dirtySceneIds: ReadonlySet<string>;
  bookTitle: string | null;
  wordCount: number;
  theme: Theme;
  activeSceneId: string | null;
  activeSceneTitle: string | null;
  contentStats: ContentStats | null;
  markDirty: (sceneId: string) => void;
  markClean: (sceneId: string) => void;
  setBookTitle: (title: string | null) => void;
  setWordCount: (n: number) => void;
  setActiveScene: (id: string | null, title: string | null) => void;
  setContentStats: (stats: ContentStats | null) => void;
  cycleTheme: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  dirtySceneIds: new Set(),
  bookTitle: null,
  wordCount: 0,
  theme: 'dark',
  activeSceneId: null,
  activeSceneTitle: null,
  contentStats: null,
  markDirty: () => {},
  markClean: () => {},
  setBookTitle: () => {},
  setWordCount: () => {},
  setActiveScene: () => {},
  setContentStats: () => {},
  cycleTheme: () => {},
});

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('tf-theme') as Theme | null;
  const valid = stored && ['dark', 'light', 'sepia'].includes(stored) ? stored : 'dark';
  document.documentElement.dataset.theme = valid;
  return valid;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [bookTitle, setBookTitleState] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [activeSceneTitle, setActiveSceneTitle] = useState<string | null>(null);
  const [contentStats, setContentStatsState] = useState<ContentStats | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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

  const setActiveScene = useCallback((id: string | null, title: string | null) => {
    setActiveSceneId(id);
    setActiveSceneTitle(title);
    if (!id) setContentStatsState(null);
  }, []);

  const setContentStats = useCallback((stats: ContentStats | null) => {
    setContentStatsState(stats);
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(t => {
      const next: Theme = t === 'dark' ? 'light' : t === 'light' ? 'sepia' : 'dark';
      localStorage.setItem('tf-theme', next);
      return next;
    });
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      dirtySceneIds: dirtyIds,
      bookTitle,
      wordCount,
      theme,
      activeSceneId,
      activeSceneTitle,
      contentStats,
      markDirty,
      markClean,
      setBookTitle,
      setWordCount,
      setActiveScene,
      setContentStats,
      cycleTheme,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = () => useContext(WorkspaceContext);
