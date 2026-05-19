import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CharacterDto } from '../../api/characters';
import type { LocationDto } from '../../api/locations';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { TabBar, type Tab } from './TabBar';
import { Breadcrumb } from './Breadcrumb';
import { SceneEditor } from './SceneEditor';
import { CharacterEditor } from './CharacterEditor';
import { LocationEditor } from './LocationEditor';
import { FindReplaceBar } from './FindReplaceBar';

interface TabsState {
  tabs: Tab[];
  activeId: string | null;
}

export interface SceneEditorAreaHandle {
  openScene: (sceneId: string, sceneTitle: string) => void;
  openCharacter: (characterId: string, name: string) => void;
  openLocation: (locationId: string, name: string) => void;
  saveAll: () => Promise<void>;
  saveActive: () => Promise<void>;
  closeAll: () => void;
  openFind: (withReplace: boolean) => void;
}

interface SceneEditorAreaProps {
  onCharacterSaved?: (character: CharacterDto) => void;
  onLocationSaved?: (location: LocationDto) => void;
}

export const SceneEditorArea = forwardRef<SceneEditorAreaHandle, SceneEditorAreaProps>(
  function SceneEditorArea({ onCharacterSaved, onLocationSaved }, ref) {
    const [{ tabs, activeId }, setState] = useState<TabsState>({ tabs: [], activeId: null });
    const { dirtySceneIds, markClean, clearSceneWordCount, setActiveScene } = useWorkspace();
    const saveRegistry = useRef(new Map<string, () => Promise<void>>());

    const openScene = useCallback((sceneId: string, sceneTitle: string) => {
      setState(prev => {
        if (prev.tabs.some(t => t.id === sceneId))
          return { ...prev, activeId: sceneId };
        return { tabs: [...prev.tabs, { id: sceneId, title: sceneTitle, kind: 'scene' }], activeId: sceneId };
      });
    }, []);

    const openCharacter = useCallback((characterId: string, name: string) => {
      setState(prev => {
        if (prev.tabs.some(t => t.id === characterId))
          return { ...prev, activeId: characterId };
        return { tabs: [...prev.tabs, { id: characterId, title: name, kind: 'character' }], activeId: characterId };
      });
    }, []);

    const openLocation = useCallback((locationId: string, name: string) => {
      setState(prev => {
        if (prev.tabs.some(t => t.id === locationId))
          return { ...prev, activeId: locationId };
        return { tabs: [...prev.tabs, { id: locationId, title: name, kind: 'location' }], activeId: locationId };
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
        if (tab.kind === 'scene') {
          markClean(tab.id);
          clearSceneWordCount(tab.id);
          saveRegistry.current.delete(tab.id);
        }
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

    useImperativeHandle(ref, () => ({ openScene, openCharacter, openLocation, saveAll, saveActive, closeAll, openFind }), [openScene, openCharacter, openLocation, saveAll, saveActive, closeAll, openFind]);

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

    const handleClose = useCallback(async (tabId: string) => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab?.kind === 'scene' && dirtySceneIds.has(tabId)) {
        const shouldSave = window.confirm(
          `"${tab.title}" has unsaved changes.\n\nClick OK to save, Cancel to discard.`
        );
        if (shouldSave) {
          const save = saveRegistry.current.get(tabId);
          if (save) {
            try { await save(); } catch { /* error shown in editor */ }
          }
        }
      }
      closeTab(tabId);
    }, [dirtySceneIds, tabs, closeTab]);

    const handleCharacterSaved = useCallback((character: CharacterDto) => {
      setState(prev => ({
        ...prev,
        tabs: prev.tabs.map(t =>
          t.id === character.id && t.kind === 'character' ? { ...t, title: character.name } : t
        ),
      }));
      onCharacterSaved?.(character);
    }, [onCharacterSaved]);

    const handleLocationSaved = useCallback((location: LocationDto) => {
      setState(prev => ({
        ...prev,
        tabs: prev.tabs.map(t =>
          t.id === location.id && t.kind === 'location' ? { ...t, title: location.name } : t
        ),
      }));
      onLocationSaved?.(location);
    }, [onLocationSaved]);

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
      if (activeTab?.kind === 'scene') {
        setActiveScene(activeTab.id, activeTab.title);
      } else {
        setActiveScene(null, null);
      }
    }, [activeTab?.id, activeTab?.kind, activeTab?.title, setActiveScene]);

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
        {activeTab?.kind === 'scene' && <Breadcrumb sceneTitle={activeTab.title} />}
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
              {tab.kind === 'scene' ? (
                <SceneEditor
                  sceneId={tab.id}
                  sceneTitle={tab.title}
                  isActive={tab.id === activeId}
                  onRegisterSave={handleRegisterSave}
                  onUnregisterSave={handleUnregisterSave}
                  onRegisterEditorEl={handleRegisterEditorEl}
                />
              ) : tab.kind === 'character' ? (
                <CharacterEditor
                  characterId={tab.id}
                  onSaved={handleCharacterSaved}
                />
              ) : (
                <LocationEditor
                  locationId={tab.id}
                  onSaved={handleLocationSaved}
                />
              )}
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
