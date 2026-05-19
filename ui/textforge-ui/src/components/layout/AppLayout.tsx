import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useEditorSettings } from '../../hooks/useEditorSettings';
import { useSeriesExplorer } from '../../hooks/useSeriesExplorer';
import { SceneEditorArea, type SceneEditorAreaHandle } from '../editor/SceneEditorArea';
import { Shell } from './Shell';
import { ShellBody } from './ShellBody';
import { TitleBar } from './TitleBar';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';
import { ActivityBar, type SidebarMode } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { Inspector } from '../inspector/Inspector';
import { BottomPanel } from '../panels/BottomPanel';
import { CommandPalette } from '../ui/CommandPalette';
import { TweaksPanel } from '../ui/TweaksPanel';

export function AppLayout() {
  const editorRef = useRef<SceneEditorAreaHandle>(null);
  const {
    seriesTitle, dirtySceneIds,
    typewriterMode, inspectorOpen, setSeries,
  } = useWorkspace();
  const editorSettings = useEditorSettings();
  const explorer = useSeriesExplorer();

  const [focusMode, setFocusMode] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('manuscript');
  const [bottomOpen, setBottomOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);

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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // explorer.openSeries intentionally excluded — stable across renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSceneOpen = useCallback((sceneId: string, sceneTitle: string) => {
    editorRef.current?.openScene(sceneId, sceneTitle);
  }, []);

  const toggleFocus = useCallback(() => setFocusMode(f => !f), []);
  const toggleBottom = useCallback(() => setBottomOpen(b => !b), []);

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

  // WebView2 message bridge — C# posts "save-all" before exit; we save and reply "save-complete"
  useEffect(() => {
    const webview = (window as { chrome?: { webview?: { addEventListener: (type: string, fn: (e: MessageEvent) => void) => void; removeEventListener: (type: string, fn: (e: MessageEvent) => void) => void; postMessage: (msg: string) => void } } }).chrome?.webview;
    if (!webview) return;
    const handler = async (e: MessageEvent) => {
      if (e.data !== 'save-all') return;
      await editorRef.current?.saveAll();
      webview.postMessage('save-complete');
    };
    webview.addEventListener('message', handler);
    return () => webview.removeEventListener('message', handler);
  }, []);

  return (
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
      />
      <ShellBody noInspector={!inspectorOpen}>
        <ActivityBar
          mode={sidebarMode}
          onModeChange={setSidebarMode}
          dirtyCount={dirtySceneIds.size}
        />
        <Sidebar mode={sidebarMode} explorer={explorer} onSceneOpen={handleSceneOpen} />
        <div className={`center-col${bottomOpen ? '' : ' no-bottom'}`}>
          <div className="editor-col">
            <SceneEditorArea ref={editorRef} />
          </div>
          {bottomOpen && <BottomPanel onClose={() => setBottomOpen(false)} />}
        </div>
        {inspectorOpen && <Inspector />}
      </ShellBody>
      <StatusBar
        focusMode={focusMode}
        onFocusToggle={toggleFocus}
        panelOpen={bottomOpen}
        onPanelToggle={toggleBottom}
        onTweaksToggle={() => setTweaksOpen(o => !o)}
      />
      <button className="exit-focus" onClick={toggleFocus}>
        Exit focus · esc
      </button>
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onOpenScene={handleSceneOpen}
          onToggleFocus={toggleFocus}
          onToggleBottom={toggleBottom}
          onOpenTweaks={() => { setTweaksOpen(o => !o); }}
        />
      )}
      {tweaksOpen && (
        <TweaksPanel
          editorSettings={editorSettings}
          onClose={() => setTweaksOpen(false)}
        />
      )}
    </Shell>
  );
}
