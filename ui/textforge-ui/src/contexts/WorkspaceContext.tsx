import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SeriesDto } from '../api/series';
import type { SceneMetaDto } from '../api/books';
import { getUiPreferences, setUiPreferences, type UiPreferences } from '../api/settings';

type Theme = 'dark' | 'light' | 'sepia';

export interface ContentStats {
  paragraphCount: number;
  sentenceCount: number;
}

interface WorkspaceContextValue {
  dirtySceneIds: ReadonlySet<string>;
  series: SeriesDto | null;
  seriesTitle: string | null;
  wordCount: number;
  totalWordCount: number;
  sceneWordCounts: ReadonlyMap<string, number>;
  theme: Theme;
  typewriterMode: boolean;
  inspectorOpen: boolean;
  minimapOpen: boolean;
  bottomOpen: boolean;
  prefsLoaded: boolean;
  loadedPrefs: UiPreferences | null;
  activeSceneId: string | null;
  activeSceneTitle: string | null;
  activeBookId: string | null;
  contentStats: ContentStats | null;
  markDirty: (sceneId: string) => void;
  markClean: (sceneId: string) => void;
  setSeries: (series: SeriesDto | null) => void;
  setSceneWordCount: (sceneId: string, count: number) => void;
  clearSceneWordCount: (sceneId: string) => void;
  setActiveScene: (id: string | null, title: string | null) => void;
  setContentStats: (stats: ContentStats | null) => void;
  applyTheme: (t: Theme) => void;
  cycleTheme: () => void;
  setTypewriterMode: (v: boolean) => void;
  setInspectorOpen: (v: boolean) => void;
  setMinimapOpen: (v: boolean) => void;
  setBottomOpen: (v: boolean) => void;
  patchSceneMeta: (sceneId: string, patch: Partial<Pick<SceneMetaDto, 'status' | 'title'>>) => void;
  // Exposed so other hooks can piggyback on the single save cycle
  savePrefs: (patch: Partial<UiPreferences>) => void;
  getPrefs: () => UiPreferences;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  dirtySceneIds: new Set(),
  series: null,
  seriesTitle: null,
  wordCount: 0,
  totalWordCount: 0,
  sceneWordCounts: new Map(),
  theme: 'dark',
  typewriterMode: false,
  inspectorOpen: true,
  minimapOpen: false,
  bottomOpen: false,
  prefsLoaded: false,
  loadedPrefs: null,
  activeSceneId: null,
  activeSceneTitle: null,
  activeBookId: null,
  contentStats: null,
  markDirty: () => {},
  markClean: () => {},
  setSeries: () => {},
  setSceneWordCount: () => {},
  clearSceneWordCount: () => {},
  setActiveScene: () => {},
  setContentStats: () => {},
  applyTheme: () => {},
  cycleTheme: () => {},
  setTypewriterMode: () => {},
  setInspectorOpen: () => {},
  setMinimapOpen: () => {},
  setBottomOpen: () => {},
  patchSceneMeta: () => {},
  savePrefs: () => {},
  getPrefs: () => ({
    theme: 'dark', typewriterMode: false, inspectorOpen: true, minimapOpen: false,
    bottomOpen: false, editorFont: 'serif', fontSize: 17, lineHeight: 1.7,
    paragraphIndent: 0, autosaveInterval: 15, dailyGoal: 0, projectGoal: 0,
    dailyProgress: null, lastSeriesPath: null,
  }),
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [series, setSeriesState] = useState<SeriesDto | null>(null);
  const [sceneWordCountMap, setSceneWordCountMap] = useState<Map<string, number>>(new Map());

  // Panel/UI state — start with defaults; overwritten once prefs load
  const [theme, setThemeState] = useState<Theme>('dark');
  const [typewriterMode, setTypewriterModeState] = useState(false);
  const [inspectorOpen, setInspectorOpenState] = useState(true);
  const [minimapOpen, setMinimapOpenState] = useState(false);
  const [bottomOpen, setBottomOpenState] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [loadedPrefs, setLoadedPrefs] = useState<UiPreferences | null>(null);

  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [activeSceneTitle, setActiveSceneTitle] = useState<string | null>(null);
  const [contentStats, setContentStatsState] = useState<ContentStats | null>(null);

  // Single source of truth for the full prefs object, kept in sync with state above.
  // Other hooks (useEditorSettings, useWordCountGoal, useSeriesExplorer) read/write
  // their slices through savePrefs/getPrefs without owning their own persistence.
  const prefsRef = useRef<UiPreferences>({
    theme: 'dark', typewriterMode: false, inspectorOpen: true, minimapOpen: false,
    bottomOpen: false, editorFont: 'serif', fontSize: 17, lineHeight: 1.7,
    paragraphIndent: 0, autosaveInterval: 15, dailyGoal: 0, projectGoal: 0,
    dailyProgress: null, lastSeriesPath: null,
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced write to backend — batches rapid changes (slider drags etc.)
  const flushPrefs = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setUiPreferences(prefsRef.current).catch(() => {});
    }, 400);
  }, []);

  const savePrefs = useCallback((patch: Partial<UiPreferences>) => {
    prefsRef.current = { ...prefsRef.current, ...patch };
    flushPrefs();
  }, [flushPrefs]);

  const getPrefs = useCallback((): UiPreferences => prefsRef.current, []);

  // Load prefs from backend once on mount and apply to all state
  useEffect(() => {
    getUiPreferences().then(prefs => {
      prefsRef.current = prefs;
      const validTheme = (['dark', 'light', 'sepia'] as const).includes(prefs.theme as Theme)
        ? prefs.theme as Theme : 'dark';
      setThemeState(validTheme);
      document.documentElement.dataset.theme = validTheme;
      setTypewriterModeState(prefs.typewriterMode);
      setInspectorOpenState(prefs.inspectorOpen);
      setMinimapOpenState(prefs.minimapOpen);
      setBottomOpenState(prefs.bottomOpen);
      setLoadedPrefs(prefs);
      setPrefsLoaded(true);
    }).catch(() => {
      // API not ready yet (e.g. dev mode before backend starts) — use defaults
      document.documentElement.dataset.theme = 'dark';
      setPrefsLoaded(true);
    });
  }, []);

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

  const setSeries = useCallback((s: SeriesDto | null) => setSeriesState(s), []);

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
    setThemeState(t);
    savePrefs({ theme: t });
  }, [savePrefs]);

  const cycleTheme = useCallback(() => {
    setThemeState(t => {
      const next: Theme = t === 'dark' ? 'light' : t === 'light' ? 'sepia' : 'dark';
      savePrefs({ theme: next });
      return next;
    });
  }, [savePrefs]);

  const setTypewriterMode = useCallback((v: boolean) => {
    setTypewriterModeState(v);
    savePrefs({ typewriterMode: v });
  }, [savePrefs]);

  const setInspectorOpen = useCallback((v: boolean) => {
    setInspectorOpenState(v);
    savePrefs({ inspectorOpen: v });
  }, [savePrefs]);

  const setMinimapOpen = useCallback((v: boolean) => {
    setMinimapOpenState(v);
    savePrefs({ minimapOpen: v });
  }, [savePrefs]);

  const setBottomOpen = useCallback((v: boolean) => {
    setBottomOpenState(v);
    savePrefs({ bottomOpen: v });
  }, [savePrefs]);

  const patchSceneMeta = useCallback((sceneId: string, meta: Partial<Pick<SceneMetaDto, 'status' | 'title'>>) => {
    setSeriesState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        books: prev.books.map(b => ({
          ...b,
          chapters: b.chapters.map(ch => ({
            ...ch,
            scenes: ch.scenes.map(s => s.id === sceneId ? { ...s, ...meta } : s),
          })),
        })),
      };
    });
  }, []);

  const seriesTitle = series?.title ?? null;
  const activeBookId = useMemo(
    () => activeSceneId && series
      ? (series.books.find(b => b.chapters.some(c => c.scenes.some(s => s.id === activeSceneId)))?.id ?? null)
      : null,
    [series, activeSceneId],
  );
  const wordCount = activeSceneId ? (sceneWordCountMap.get(activeSceneId) ?? 0) : 0;
  const totalWordCount = useMemo(
    () => Array.from(sceneWordCountMap.values()).reduce((a, b) => a + b, 0),
    [sceneWordCountMap],
  );

  return (
    <WorkspaceContext.Provider value={{
      dirtySceneIds: dirtyIds,
      series,
      seriesTitle,
      wordCount,
      totalWordCount,
      sceneWordCounts: sceneWordCountMap,
      theme,
      typewriterMode,
      inspectorOpen,
      minimapOpen,
      bottomOpen,
      prefsLoaded,
      loadedPrefs,
      activeSceneId,
      activeSceneTitle,
      activeBookId,
      contentStats,
      markDirty,
      markClean,
      setSeries,
      setSceneWordCount,
      clearSceneWordCount,
      setActiveScene,
      setContentStats,
      applyTheme,
      cycleTheme,
      setTypewriterMode,
      setInspectorOpen,
      setMinimapOpen,
      setBottomOpen,
      patchSceneMeta,
      savePrefs,
      getPrefs,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = () => useContext(WorkspaceContext);
