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
        flex: 1, color: 'var(--text-faint)', fontSize: 'var(--fs-mono-sm)',
      }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && (
        <div style={{
          background: 'var(--signal-error)', color: 'var(--text-strong)', fontSize: 'var(--fs-mono-sm)',
          padding: '4px 10px', flexShrink: 0, opacity: 0.9,
        }}>
          {error}
        </div>
      )}
      <div className="editor-scroll" style={{ flex: 1 }}>
        <div className="editor-doc">
          <textarea
            value={content}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
            className="prose"
            style={{
              width: '100%',
              minHeight: '60vh',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: 0,
              lineHeight: 'var(--editor-lh)',
            }}
          />
        </div>
      </div>
      <div style={{
        padding: '4px 16px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        fontSize: 'var(--fs-mono-xs)',
        color: 'var(--text-faint)',
        flexShrink: 0,
        background: 'var(--bg-editor)',
      }}>
        {saving ? 'Saving…' : isDirty ? 'Unsaved · Ctrl+S to save' : 'Saved'}
      </div>
    </div>
  );
}
