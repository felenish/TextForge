import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { BookDto } from '../api/books';

type Theme = 'dark' | 'light' | 'sepia';

export interface ContentStats {
  paragraphCount: number;
  sentenceCount: number;
}

interface WorkspaceContextValue {
  dirtySceneIds: ReadonlySet<string>;
  book: BookDto | null;
  bookTitle: string | null;
  wordCount: number;
  totalWordCount: number;
  sceneWordCounts: ReadonlyMap<string, number>;
  theme: Theme;
  typewriterMode: boolean;
  inspectorOpen: boolean;
  minimapOpen: boolean;
  activeSceneId: string | null;
  activeSceneTitle: string | null;
  contentStats: ContentStats | null;
  markDirty: (sceneId: string) => void;
  markClean: (sceneId: string) => void;
  setBook: (book: BookDto | null) => void;
  setSceneWordCount: (sceneId: string, count: number) => void;
  clearSceneWordCount: (sceneId: string) => void;
  setActiveScene: (id: string | null, title: string | null) => void;
  setContentStats: (stats: ContentStats | null) => void;
  applyTheme: (t: Theme) => void;
  cycleTheme: () => void;
  setTypewriterMode: (v: boolean) => void;
  setInspectorOpen: (v: boolean) => void;
  setMinimapOpen: (v: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  dirtySceneIds: new Set(),
  book: null,
  bookTitle: null,
  wordCount: 0,
  totalWordCount: 0,
  sceneWordCounts: new Map(),
  theme: 'dark',
  typewriterMode: false,
  inspectorOpen: true,
  minimapOpen: false,
  activeSceneId: null,
  activeSceneTitle: null,
  contentStats: null,
  markDirty: () => {},
  markClean: () => {},
  setBook: () => {},
  setSceneWordCount: () => {},
  clearSceneWordCount: () => {},
  setActiveScene: () => {},
  setContentStats: () => {},
  applyTheme: () => {},
  cycleTheme: () => {},
  setTypewriterMode: () => {},
  setInspectorOpen: () => {},
  setMinimapOpen: () => {},
});

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('tf-theme') as Theme | null;
  const valid = stored && ['dark', 'light', 'sepia'].includes(stored) ? stored : 'dark';
  document.documentElement.dataset.theme = valid;
  return valid;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [book, setBookState] = useState<BookDto | null>(null);
  const [sceneWordCountMap, setSceneWordCountMap] = useState<Map<string, number>>(new Map());
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [typewriterMode, setTypewriterModeState] = useState(
    () => localStorage.getItem('tf-tw') === 'true',
  );
  const [inspectorOpen, setInspectorOpenState] = useState(
    () => localStorage.getItem('tf-inspector') !== 'false',
  );
  const [minimapOpen, setMinimapOpenState] = useState(
    () => localStorage.getItem('tf-minimap') === 'true',
  );
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

  const setBook = useCallback((b: BookDto | null) => setBookState(b), []);

  const setSceneWordCount = useCallback((sceneId: string, count: number) => {
    setSceneWordCountMap(prev => {
      if (prev.get(sceneId) === count) return prev;
      const next = new Map(prev);
      next.set(sceneId, count);
      return next;
    });
  }, []);

  const clearSceneWordCount = useCallback((sceneId: string) => {
    setSceneWordCountMap(prev => {
      if (!prev.has(sceneId)) return prev;
      const next = new Map(prev);
      next.delete(sceneId);
      return next;
    });
  }, []);

  const setActiveScene = useCallback((id: string | null, title: string | null) => {
    setActiveSceneId(id);
    setActiveSceneTitle(title);
    if (!id) setContentStatsState(null);
  }, []);

  const setContentStats = useCallback((stats: ContentStats | null) => {
    setContentStatsState(stats);
  }, []);

  const applyTheme = useCallback((t: Theme) => {
    localStorage.setItem('tf-theme', t);
    setThemeState(t);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState(t => {
      const next: Theme = t === 'dark' ? 'light' : t === 'light' ? 'sepia' : 'dark';
      localStorage.setItem('tf-theme', next);
      return next;
    });
  }, []);

  const setTypewriterMode = useCallback((v: boolean) => {
    localStorage.setItem('tf-tw', String(v));
    setTypewriterModeState(v);
  }, []);

  const setInspectorOpen = useCallback((v: boolean) => {
    localStorage.setItem('tf-inspector', String(v));
    setInspectorOpenState(v);
  }, []);

  const setMinimapOpen = useCallback((v: boolean) => {
    localStorage.setItem('tf-minimap', String(v));
    setMinimapOpenState(v);
  }, []);

  const bookTitle = book?.title ?? null;
  const wordCount = activeSceneId ? (sceneWordCountMap.get(activeSceneId) ?? 0) : 0;
  const totalWordCount = useMemo(
    () => Array.from(sceneWordCountMap.values()).reduce((a, b) => a + b, 0),
    [sceneWordCountMap],
  );

  return (
    <WorkspaceContext.Provider value={{
      dirtySceneIds: dirtyIds,
      book,
      bookTitle,
      wordCount,
      totalWordCount,
      sceneWordCounts: sceneWordCountMap,
      theme,
      typewriterMode,
      inspectorOpen,
      minimapOpen,
      activeSceneId,
      activeSceneTitle,
      contentStats,
      markDirty,
      markClean,
      setBook,
      setSceneWordCount,
      clearSceneWordCount,
      setActiveScene,
      setContentStats,
      applyTheme,
      cycleTheme,
      setTypewriterMode,
      setInspectorOpen,
      setMinimapOpen,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = () => useContext(WorkspaceContext);
