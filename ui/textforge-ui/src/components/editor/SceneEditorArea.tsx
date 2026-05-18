import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { TabBar } from './TabBar';
import { SceneEditor } from './SceneEditor';

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
}

export const SceneEditorArea = forwardRef<SceneEditorAreaHandle>(
  function SceneEditorArea(_, ref) {
    const [{ tabs, activeId }, setState] = useState<TabsState>({ tabs: [], activeId: null });
    const { dirtySceneIds, markClean, setWordCount } = useWorkspace();
    const saveRegistry = useRef(new Map<string, () => Promise<void>>());

    const openScene = useCallback((sceneId: string, sceneTitle: string) => {
      setState(prev => {
        if (prev.tabs.some(t => t.id === sceneId))
          return { ...prev, activeId: sceneId };
        return { tabs: [...prev.tabs, { id: sceneId, title: sceneTitle }], activeId: sceneId };
      });
    }, []);

    useImperativeHandle(ref, () => ({ openScene }), [openScene]);

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
        if (tabs.length === 0) setWordCount(0);
        return { tabs, activeId };
      });
      markClean(id);
      saveRegistry.current.delete(id);
    }, [markClean, setWordCount]);

    const handleClose = useCallback(async (sceneId: string) => {
      if (dirtySceneIds.has(sceneId)) {
        const tab = tabs.find(t => t.id === sceneId);
        const shouldSave = window.confirm(
          `"${tab?.title ?? 'Scene'}" has unsaved changes.\n\nClick OK to save, Cancel to discard.`
        );
        if (shouldSave) {
          const save = saveRegistry.current.get(sceneId);
          if (save) {
            try { await save(); } catch { /* error is shown in the editor */ }
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

    if (tabs.length === 0) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          minHeight: 0,
          color: 'var(--text-faint)',
          fontSize: 'var(--fs-mono-sm)',
          fontFamily: 'var(--font-mono)',
        }}>
          Open a scene from the sidebar
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
                isActive={tab.id === activeId}
                onRegisterSave={handleRegisterSave}
                onUnregisterSave={handleUnregisterSave}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);
