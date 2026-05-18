import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { SceneEditorArea, type SceneEditorAreaHandle } from '../editor/SceneEditorArea';
import { Shell } from './Shell';
import { ShellBody } from './ShellBody';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';
import { ActivityBar, type SidebarMode } from './ActivityBar';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const editorRef = useRef<SceneEditorAreaHandle>(null);
  const { bookTitle, dirtySceneIds } = useWorkspace();
  const [focusMode, setFocusMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('manuscript');

  useEffect(() => {
    const hasUnsaved = dirtySceneIds.size > 0;
    document.title = bookTitle
      ? `${hasUnsaved ? '● ' : ''}${bookTitle} — TextForge Studio`
      : 'TextForge Studio';
  }, [bookTitle, dirtySceneIds]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F11') { e.preventDefault(); setFocusMode(f => !f); }
      if (e.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSceneOpen = useCallback((sceneId: string, sceneTitle: string) => {
    editorRef.current?.openScene(sceneId, sceneTitle);
  }, []);

  const toggleFocus = useCallback(() => setFocusMode(f => !f), []);
  const toggleTypewriter = useCallback(() => setTypewriterMode(t => !t), []);

  return (
    <Shell focusMode={focusMode} typewriterMode={typewriterMode}>
      <TitleBar focusMode={focusMode} onFocusToggle={toggleFocus} />
      <ShellBody noInspector>
        <ActivityBar
          mode={sidebarMode}
          onModeChange={setSidebarMode}
          dirtyCount={dirtySceneIds.size}
        />
        <Sidebar mode={sidebarMode} onSceneOpen={handleSceneOpen} />
        <div className="editor-col">
          <SceneEditorArea ref={editorRef} />
        </div>
      </ShellBody>
      <StatusBar
        focusMode={focusMode}
        onFocusToggle={toggleFocus}
        typewriterMode={typewriterMode}
        onTypewriterToggle={toggleTypewriter}
      />
      <button className="exit-focus" onClick={toggleFocus}>
        Exit focus · esc
      </button>
    </Shell>
  );
}
