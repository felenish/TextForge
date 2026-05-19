import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { TabBar } from './TabBar';
import { Breadcrumb } from './Breadcrumb';
import { SceneEditor } from './SceneEditor';
import { FindReplaceBar } from './FindReplaceBar';

interface Tab {
  id: string;
  title: string;
}

interface TabsState {
  tabs: Tab[];
  activeId: string | null;
}

export interface SceneEditorAreaHandle {
  openScene: (sceneId: string, sceneTitle: string) => void;
  saveAll: () => Promise<void>;
  saveActive: () => Promise<void>;
  closeAll: () => void;
  openFind: (withReplace: boolean) => void;
}

export const SceneEditorArea = forwardRef<SceneEditorAreaHandle>(
  function SceneEditorArea(_, ref) {
    const [{ tabs, activeId }, setState] = useState<TabsState>({ tabs: [], activeId: null });
    const { dirtySceneIds, markClean, clearSceneWordCount, setActiveScene } = useWorkspace();
    const saveRegistry = useRef(new Map<string, () => Promise<void>>());

    const openScene = useCallback((sceneId: string, sceneTitle: string) => {
      setState(prev => {
        if (prev.tabs.some(t => t.id === sceneId))
          return { ...prev, activeId: sceneId };
        return { tabs: [...prev.tabs, { id: sceneId, title: sceneTitle }], activeId: sceneId };
      });
    }, []);

    const saveAll = useCallback(async () => {
      await Promise.all(
        Array.from(saveRegistry.current.values()).map(save => save().catch(() => {}))
      );
    }, []);

    const activeIdRef = useRef(activeId);
    useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

    const saveActive = useCallback(async () => {
      const save = activeIdRef.current ? saveRegistry.current.get(activeIdRef.current) : undefined;
      if (save) await save().catch(() => {});
    }, []);

    const tabsRef = useRef(tabs);
    useEffect(() => { tabsRef.current = tabs; }, [tabs]);

    const closeAll = useCallback(() => {
      const currentTabs = tabsRef.current;
      setState({ tabs: [], activeId: null });
      for (const tab of currentTabs) {
        markClean(tab.id);
        clearSceneWordCount(tab.id);
        saveRegistry.current.delete(tab.id);
      }
    }, [markClean, clearSceneWordCount]);

    // Editor element registry — each SceneEditor registers its contentEditable div
    const editorElRegistry = useRef(new Map<string, HTMLDivElement>());
    const handleRegisterEditorEl = useCallback((sceneId: string, el: HTMLDivElement | null) => {
      if (el) editorElRegistry.current.set(sceneId, el);
      else editorElRegistry.current.delete(sceneId);
    }, []);

    // Find / Replace bar state
    const [findOpen, setFindOpen] = useState(false);
    const [findWithReplace, setFindWithReplace] = useState(false);
    const openFind = useCallback((withReplace: boolean) => {
      setFindWithReplace(withReplace);
      setFindOpen(true);
    }, []);

    useImperativeHandle(ref, () => ({ openScene, saveAll, saveActive, closeAll, openFind }), [openScene, saveAll, saveActive, closeAll, openFind]);

    const handleRegisterSave = useCallback((sceneId: string, save: () => Promise<void>) => {
      saveRegistry.current.set(sceneId, save);
    }, []);

    const handleUnregisterSave = useCallback((sceneId: string) => {
      saveRegistry.current.delete(sceneId);
    }, []);

    const closeTab = useCallback((id: string) => {
      setState(prev => {
        const idx = prev.tabs.findIndex(t => t.id === id);
        const tabs = prev.tabs.filter(t => t.id !== id);
        let activeId = prev.activeId;
        if (activeId === id)
          activeId = tabs.length > 0 ? tabs[Math.min(idx, tabs.length - 1)].id : null;
        return { tabs, activeId };
      });
      markClean(id);
      clearSceneWordCount(id);
      saveRegistry.current.delete(id);
    }, [markClean, clearSceneWordCount]);

    const handleClose = useCallback(async (sceneId: string) => {
      if (dirtySceneIds.has(sceneId)) {
        const tab = tabs.find(t => t.id === sceneId);
        const shouldSave = window.confirm(
          `"${tab?.title ?? 'Scene'}" has unsaved changes.\n\nClick OK to save, Cancel to discard.`
        );
        if (shouldSave) {
          const save = saveRegistry.current.get(sceneId);
          if (save) {
            try { await save(); } catch { /* error shown in editor */ }
          }
        }
      }
      closeTab(sceneId);
    }, [dirtySceneIds, tabs, closeTab]);

    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'w') {
          e.preventDefault();
          if (activeId) handleClose(activeId);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [activeId, handleClose]);

    const activeTab = tabs.find(t => t.id === activeId) ?? null;

    useEffect(() => {
      setActiveScene(activeTab?.id ?? null, activeTab?.title ?? null);
    }, [activeTab?.id, activeTab?.title, setActiveScene]);

    if (tabs.length === 0) {
      return (
        <div className="editor-empty">
          <div className="glyph">⁂</div>
          <div>No scene open.</div>
          <div style={{ fontSize: 11 }}>
            Pick a scene from the Manuscript explorer, or open the command palette.
          </div>
          <div className="kb">
            <kbd>Ctrl</kbd>
            <span style={{ color: 'var(--text-faint)', padding: '0 4px' }}>click scene</span>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <TabBar
          tabs={tabs}
          activeId={activeId}
          onSelect={id => setState(prev => ({ ...prev, activeId: id }))}
          onClose={handleClose}
        />
        {activeTab && <Breadcrumb sceneTitle={activeTab.title} />}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              style={{
                position: 'absolute',
                inset: 0,
                display: tab.id === activeId ? 'flex' : 'none',
                flexDirection: 'column',
              }}
            >
              <SceneEditor
                sceneId={tab.id}
                sceneTitle={tab.title}
                isActive={tab.id === activeId}
                onRegisterSave={handleRegisterSave}
                onUnregisterSave={handleUnregisterSave}
                onRegisterEditorEl={handleRegisterEditorEl}
              />
            </div>
          ))}
          {findOpen && (
            <FindReplaceBar
              editorEl={activeId ? (editorElRegistry.current.get(activeId) ?? null) : null}
              initialShowReplace={findWithReplace}
              onClose={() => setFindOpen(false)}
            />
          )}
        </div>
      </div>
    );
  }
);
