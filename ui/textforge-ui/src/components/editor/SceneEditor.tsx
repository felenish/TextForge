import { useEffect, useRef } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import * as workspaceApi from '../../api/workspace';
import { useSceneEditor } from '../../hooks/useSceneEditor';

interface SceneEditorProps {
  sceneId: string;
  isActive: boolean;
  onRegisterSave: (sceneId: string, save: () => Promise<void>) => void;
  onUnregisterSave: (sceneId: string) => void;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

export function SceneEditor({ sceneId, isActive, onRegisterSave, onUnregisterSave }: SceneEditorProps) {
  const { content, isDirty, loading, saving, error, onChange, save } = useSceneEditor(sceneId);
  const { markDirty, markClean, setWordCount } = useWorkspace();

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    onRegisterSave(sceneId, () => saveRef.current());
    return () => onUnregisterSave(sceneId);
  }, [sceneId, onRegisterSave, onUnregisterSave]);

  useEffect(() => {
    if (isDirty) {
      markDirty(sceneId);
      workspaceApi.markSceneDirty(sceneId).catch(() => {});
    } else {
      markClean(sceneId);
    }
  }, [isDirty, sceneId, markDirty, markClean]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);

  useEffect(() => {
    if (isActive) setWordCount(countWords(content));
  }, [isActive, content, setWordCount]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: '#888', fontSize: '13px',
      }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {error && (
        <div style={{
          background: '#5a1e1e', color: '#f48771', fontSize: '12px',
          padding: '4px 10px', flexShrink: 0,
        }}>
          {error}
        </div>
      )}
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1,
          background: '#1e1e1e',
          color: '#d4d4d4',
          border: 'none',
          outline: 'none',
          resize: 'none',
          padding: '24px 32px',
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: '15px',
          lineHeight: '1.8',
          boxSizing: 'border-box',
        }}
      />
      <div style={{
        height: '22px',
        background: '#252526',
        borderTop: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        fontSize: '11px',
        color: '#888',
        flexShrink: 0,
      }}>
        {saving ? 'Saving…' : isDirty ? 'Unsaved changes  (Ctrl+S to save)' : 'Saved'}
      </div>
    </div>
  );
}
