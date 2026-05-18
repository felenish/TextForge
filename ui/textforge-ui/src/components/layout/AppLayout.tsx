import { useCallback, useEffect, useRef } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { SceneEditorArea, type SceneEditorAreaHandle } from '../editor/SceneEditorArea';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const editorRef = useRef<SceneEditorAreaHandle>(null);
  const { bookTitle, dirtySceneIds, wordCount } = useWorkspace();

  useEffect(() => {
    const hasUnsaved = dirtySceneIds.size > 0;
    if (bookTitle) {
      document.title = `${hasUnsaved ? '● ' : ''}${bookTitle} — TextForge Studio`;
    } else {
      document.title = 'TextForge Studio';
    }
  }, [bookTitle, dirtySceneIds]);

  const handleSceneOpen = useCallback((sceneId: string, sceneTitle: string) => {
    editorRef.current?.openScene(sceneId, sceneTitle);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: '#1e1e1e',
      color: '#d4d4d4',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar onSceneOpen={handleSceneOpen} />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <SceneEditorArea ref={editorRef} />
        </main>
      </div>
      <div style={{
        height: '22px',
        background: '#007acc',
        color: '#fff',
        fontSize: '12px',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span>TextForge Studio</span>
        {wordCount > 0 && (
          <span>{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
        )}
      </div>
    </div>
  );
}
