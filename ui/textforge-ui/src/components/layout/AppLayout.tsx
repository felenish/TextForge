import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useEditorSettings } from '../../hooks/useEditorSettings';
import { useSeriesExplorer } from '../../hooks/useSeriesExplorer';
import { useWordCountGoal } from '../../hooks/useWordCountGoal';
import { SceneEditorArea, type SceneEditorAreaHandle } from '../editor/SceneEditorArea';
import { Shell } from './Shell';
import { ShellBody } from './ShellBody';
import { TitleBar } from './TitleBar';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';
import { ActivityBar, type SidebarMode } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { RightPanel } from '../panels/RightPanel';
import { BottomPanel } from '../panels/BottomPanel';
import { CommandPalette } from '../ui/CommandPalette';
import { TweaksPanel } from '../ui/TweaksPanel';
import { SettingsModal } from '../settings/SettingsModal';
import { ExportModal } from '../export/ExportModal';
import { TakeSnapshotModal } from '../versions/TakeSnapshotModal';
import { UpdateBanner } from '../ui/UpdateBanner';
import { BackendBanner } from '../ui/BackendBanner';
import { AboutModal } from '../ui/AboutModal';
import { EditorContextMenu } from '../ui/EditorContextMenu';
import { InternalLinkContext } from '../../contexts/InternalLinkContext';
import type { InternalLinkType } from '../../contexts/InternalLinkContext';
import { getWebView, requestUpdate } from '../../lib/webview';
import { logInfo } from '../../lib/logger';
import * as shellApi from '../../api/shell';

export function AppLayout() {
  const [bootStart] = useState<number>(() => performance.now());
  const bootStartRef = useRef<number>(bootStart);
  const startupLoggedRef = useRef(false);
  const autoOpenStartedAtRef = useRef<number | null>(null);
  const autoOpenAttemptedRef = useRef(false);
  const autoOpenLoggedRef = useRef(false);

  const editorRef = useRef<SceneEditorAreaHandle>(null);
  const {
    seriesTitle, dirtySceneIds,
    typewriterMode, inspectorOpen, setSeries, totalWordCount,
    bottomOpen, setBottomOpen,
    prefsLoaded, getPrefs,
  } = useWorkspace();
  const editorSettings = useEditorSettings();
  const goalSettings = useWordCountGoal(totalWordCount);
  const explorer = useSeriesExplorer();

  const dirtyRef = useRef(dirtySceneIds);
  useEffect(() => { dirtyRef.current = dirtySceneIds; }, [dirtySceneIds]);

  const [lastAutosaved, setLastAutosaved] = useState<Date | null>(null);

  useEffect(() => {
    if (editorSettings.autosaveInterval === 0) return;
    const id = setInterval(async () => {
      if (dirtyRef.current.size === 0) return;
      await editorRef.current?.saveAll();
      setLastAutosaved(new Date());
    }, editorSettings.autosaveInterval * 1000);
    return () => clearInterval(id);
  }, [editorSettings.autosaveInterval]);

  const [focusMode, setFocusMode] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('manuscript');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'appearance' | 'editor' | 'goals' | 'ai' | 'modules'>('appearance');
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'epub' | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Update banner state
  type UpdatePhase = 'available' | 'working' | 'error';
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>('available');

  useEffect(() => {
    setSeries(explorer.series ?? null);
  }, [explorer.series, setSeries]);

  useEffect(() => {
    const hasUnsaved = dirtySceneIds.size > 0;
    document.title = seriesTitle
      ? `${hasUnsaved ? '● ' : ''}${seriesTitle} — TextForge Studio`
      : 'TextForge Studio';
  }, [seriesTitle, dirtySceneIds]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); editorRef.current?.openHelp(); }
      if (e.key === 'F11') { e.preventDefault(); setFocusMode(f => !f); }
      if (e.key === 'Escape') { setFocusMode(false); setPaletteOpen(false); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        explorer.openSeries();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(o => !o);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        editorRef.current?.openFind(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        editorRef.current?.openFind(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        void editorRef.current?.saveAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // explorer.openSeries intentionally excluded — stable across renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSceneOpen = useCallback((sceneId: string, sceneTitle: string) => {
    editorRef.current?.openScene(sceneId, sceneTitle);
  }, []);

  const handleCharacterOpen = useCallback((characterId: string, name: string) => {
    editorRef.current?.openCharacter(characterId, name);
  }, []);

  const handleCharacterSaved = useCallback((character: import('../../api/characters').CharacterDto) => {
    explorer.patchCharacterInList(character);
  }, [explorer]);

  const handleLocationOpen = useCallback((locationId: string, name: string) => {
    editorRef.current?.openLocation(locationId, name);
  }, []);

  const handleLocationSaved = useCallback((location: import('../../api/locations').LocationDto) => {
    explorer.patchLocationInList(location);
  }, [explorer]);

  const handleOutlineOpen = useCallback((outlineId: string, name: string) => {
    editorRef.current?.openOutline(outlineId, name);
  }, []);

  const handleOutlineSaved = useCallback((outline: import('../../api/outlines').OutlineDto) => {
    explorer.patchOutlineInList(outline);
  }, [explorer]);

  const handlePlotGridOpen = useCallback((plotGridId: string, name: string) => {
    editorRef.current?.openPlotGrid(plotGridId, name);
  }, []);

  const handleModuleOpen = useCallback((moduleId: string, name: string, entryPoint: string, previousVersion: string | null, currentVersion: string) => {
    editorRef.current?.openModule(moduleId, name, entryPoint, previousVersion, currentVersion);
  }, []);

  const handlePlotGridSaved = useCallback((dto: import('../../api/plotGrids').PlotGridDto) => {
    explorer.patchPlotGridInList(dto);
  }, [explorer]);

  const toggleFocus = useCallback(() => setFocusMode(f => !f), []);
  const toggleBottom = useCallback(() => setBottomOpen(!bottomOpen), [bottomOpen, setBottomOpen]);

  const handleSave = useCallback(() => editorRef.current?.saveActive(), []);
  const handleSaveAll = useCallback(() => editorRef.current?.saveAll(), []);

  const handleCloseSeries = useCallback(async () => {
    await editorRef.current?.saveAll();
    editorRef.current?.closeAll();
    await explorer.closeSeries();
  }, [explorer]);

  const handleOpenRecentSeries = useCallback((path: string) => {
    explorer.openSeriesFromPath(path);
  }, [explorer]);

  // Eagerly load characters/locations/outlines when a series opens so the
  // "Link to…" context menu works without requiring sidebar expansion first.
  useEffect(() => {
    if (!explorer.series) return;
    if (!explorer.charactersLoaded) void explorer.loadCharacters();
    if (!explorer.locationsLoaded) void explorer.loadLocations();
    if (!explorer.outlinesLoaded) void explorer.loadOutlines();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorer.series]);

  const navigateTo = useCallback((type: InternalLinkType, id: string, name: string) => {
    if (type === 'character') editorRef.current?.openCharacter(id, name);
    else if (type === 'location') editorRef.current?.openLocation(id, name);
    else if (type === 'outline') editorRef.current?.openOutline(id, name);
  }, []);

  // Ctrl+click on internal links to navigate
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = (e.target as HTMLElement).closest?.('.tf-link') as HTMLElement | null;
      if (!target) return;
      e.preventDefault();
      const type = target.dataset.tfType as InternalLinkType | undefined;
      const id = target.dataset.tfId;
      const name = target.dataset.tfName ?? '';
      if (type && id) navigateTo(type, id, name);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [navigateTo]);

  const internalLinkValue = useMemo(() => ({
    characters: explorer.characters,
    locations: explorer.locations,
    outlines: explorer.outlines,
    navigateTo,
  }), [explorer.characters, explorer.locations, explorer.outlines, navigateTo]);

  // WebView2 message bridge
  useEffect(() => {
    const webview = getWebView();
    if (!webview) return;

    // Signal the host that React is mounted and ready to receive messages.
    logInfo(`[perf] app_ready_post_message ms=${Math.round(performance.now() - bootStartRef.current)}`);
    webview.postMessage('app-ready');

    const handler = async (e: MessageEvent) => {
      if (e.data === 'save-all') {
        await editorRef.current?.saveAll();
        webview.postMessage('save-complete');
        return;
      }
      // Structured messages arrive as JSON strings.
      try {
        const msg = JSON.parse(e.data as string) as { type: string; version?: string };
        if (msg.type === 'update-available' && msg.version) {
          setUpdateVersion(msg.version);
          setUpdatePhase('available');
        } else if (msg.type === 'update-error') {
          setUpdatePhase('error');
        }
      } catch { /* not JSON — ignore */ }
    };

    webview.addEventListener('message', handler);
    return () => webview.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;

    logInfo(
      `[perf] navigation dcl=${Math.round(nav.domContentLoadedEventEnd)}ms load=${Math.round(nav.loadEventEnd)}ms response=${Math.round(nav.responseEnd)}ms`
    );
  }, []);

  // Auto-open last series once prefs have loaded from the backend.
  useEffect(() => {
    if (!prefsLoaded) return;
    const last = getPrefs().lastSeriesPath;
    if (last) {
      autoOpenAttemptedRef.current = true;
      autoOpenStartedAtRef.current = performance.now();
      void explorer.openSeriesFromPath(last);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded]);

  useEffect(() => {
    if (autoOpenAttemptedRef.current && !autoOpenLoggedRef.current && !explorer.loading) {
      autoOpenLoggedRef.current = true;
      const started = autoOpenStartedAtRef.current ?? bootStartRef.current;
      const elapsed = Math.round(performance.now() - started);
      logInfo(`[perf] auto_open_complete ms=${elapsed} seriesLoaded=${explorer.series ? 'yes' : 'no'}`);
    }
  }, [explorer.loading, explorer.series]);

  useEffect(() => {
    if (startupLoggedRef.current || explorer.loading) return;
    startupLoggedRef.current = true;
    logInfo(
      `[perf] startup_settled ms=${Math.round(performance.now() - bootStartRef.current)} seriesLoaded=${explorer.series ? 'yes' : 'no'}`
    );
  }, [explorer.loading, explorer.series]);

  // First-run: auto-open HelpTab once after the initial load settles.
  const firstRunChecked = useRef(false);
  useEffect(() => {
    if (firstRunChecked.current || explorer.loading) return;
    firstRunChecked.current = true;
    if (!localStorage.getItem('tf-first-run')) {
      localStorage.setItem('tf-first-run', '1');
      setTimeout(() => editorRef.current?.openHelp(), 150);
    }
  }, [explorer.loading]);

  return (
    <InternalLinkContext.Provider value={internalLinkValue}>
    <Shell focusMode={focusMode} typewriterMode={typewriterMode}>
      <TitleBar />
      <MenuBar
        focusMode={focusMode}
        onFocusToggle={toggleFocus}
        onPaletteOpen={() => setPaletteOpen(o => !o)}
        onOpenSeries={explorer.openSeries}
        onCreateSeries={explorer.createSeries}
        onSave={handleSave}
        onSaveAll={handleSaveAll}
        onOpenRecentSeries={handleOpenRecentSeries}
        onCloseSeries={handleCloseSeries}
        onFind={() => editorRef.current?.openFind(false)}
        onFindReplace={() => editorRef.current?.openFind(true)}
        onOpenSettings={() => { setSettingsSection('appearance'); setSettingsOpen(true); }}
        onOpenHelp={() => editorRef.current?.openHelp()}
        onOpenLogFolder={() => { void shellApi.openLogFolder(); }}
        onAbout={() => setAboutOpen(true)}
        bottomOpen={bottomOpen}
        onBottomToggle={toggleBottom}
        onViewHistory={() => setSidebarMode('versions')}
      />
      <ShellBody noInspector={!inspectorOpen}>
        <ActivityBar
          mode={sidebarMode}
          onModeChange={setSidebarMode}
          dirtyCount={dirtySceneIds.size}
          onOpenSettings={() => { setSettingsSection('appearance'); setSettingsOpen(true); }}
        />
        <Sidebar mode={sidebarMode} explorer={explorer} onSceneOpen={handleSceneOpen} onCharacterOpen={handleCharacterOpen} onLocationOpen={handleLocationOpen} onOutlineOpen={handleOutlineOpen} onPlotGridOpen={handlePlotGridOpen} onModuleOpen={handleModuleOpen} onOpenHelp={() => editorRef.current?.openHelp()} />
        <div className={`center-col${bottomOpen ? '' : ' no-bottom'}`}>
          <div className="editor-col">
            <SceneEditorArea ref={editorRef} onCharacterSaved={handleCharacterSaved} onLocationSaved={handleLocationSaved} onOutlineSaved={handleOutlineSaved} onPlotGridSaved={handlePlotGridSaved} />
          </div>
          {bottomOpen && <BottomPanel onClose={() => setBottomOpen(false)} />}
        </div>
        {inspectorOpen && <RightPanel onViewHistory={() => setSidebarMode('versions')} />}
      </ShellBody>
      <StatusBar
        focusMode={focusMode}
        onFocusToggle={toggleFocus}
        panelOpen={bottomOpen}
        onPanelToggle={toggleBottom}
        onTweaksToggle={() => setTweaksOpen(o => !o)}
        dailyGoal={goalSettings.dailyGoal}
        dailyWritten={goalSettings.dailyWritten}
        projectGoal={goalSettings.projectGoal}
        onGoalsClick={() => { setSettingsSection('goals'); setSettingsOpen(true); }}
        lastAutosaved={lastAutosaved}
      />
      <button className="exit-focus" onClick={toggleFocus}>
        Exit focus · esc
      </button>
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onOpenScene={handleSceneOpen}
          hasSeries={!!seriesTitle}
          onSave={handleSave}
          onSaveAll={handleSaveAll}
          onOpenSeries={explorer.openSeries}
          onCreateSeries={explorer.createSeries}
          onExportPdf={() => setExportFormat('pdf')}
          onExportEpub={() => setExportFormat('epub')}
          onTakeSnapshot={() => setSnapshotModalOpen(true)}
          onViewHistory={() => setSidebarMode('versions')}
          onToggleFocus={toggleFocus}
          onToggleBottom={toggleBottom}
          onFind={() => editorRef.current?.openFind(false)}
          onFindReplace={() => editorRef.current?.openFind(true)}
          onOpenSettings={() => { setSettingsSection('appearance'); setSettingsOpen(true); }}
        />
      )}
      {tweaksOpen && (
        <TweaksPanel
          editorSettings={editorSettings}
          onClose={() => setTweaksOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          editorSettings={editorSettings}
          goalSettings={goalSettings}
          initialSection={settingsSection}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {snapshotModalOpen && (
        <TakeSnapshotModal onClose={() => setSnapshotModalOpen(false)} />
      )}
      {exportFormat && seriesTitle && (
        <ExportModal
          seriesTitle={seriesTitle}
          initialFormat={exportFormat}
          onClose={() => setExportFormat(null)}
        />
      )}
      {updateVersion && (
        <UpdateBanner
          version={updateVersion}
          phase={updatePhase}
          onUpdate={() => {
            setUpdatePhase('working');
            requestUpdate();
          }}
          onDismiss={() => setUpdateVersion(null)}
        />
      )}
      {explorer.networkError && (
        <BackendBanner onDismiss={() => explorer.clearNetworkError()} />
      )}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      <EditorContextMenu />
    </Shell>
    </InternalLinkContext.Provider>
  );
}
