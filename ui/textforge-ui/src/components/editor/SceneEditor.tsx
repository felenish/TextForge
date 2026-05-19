import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useOutput } from '../../contexts/OutputContext';
import * as workspaceApi from '../../api/workspace';
import { useSceneEditor } from '../../hooks/useSceneEditor';
import { Minimap } from './Minimap';

interface SceneEditorProps {
  sceneId: string;
  sceneTitle: string;
  isActive: boolean;
  onRegisterSave: (sceneId: string, save: () => Promise<void>) => void;
  onUnregisterSave: (sceneId: string) => void;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function SceneEditor({ sceneId, sceneTitle, isActive, onRegisterSave, onUnregisterSave }: SceneEditorProps) {
  const { content, isDirty, loading, saving, error, onChange, save } = useSceneEditor(sceneId);
  const { markDirty, markClean, setSceneWordCount, setContentStats, typewriterMode, minimapOpen } = useWorkspace();
  const { log } = useOutput();
  const editorRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const initializedSceneRef = useRef<string | null>(null);
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });

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
      if (!(e.ctrlKey || e.metaKey) || e.key !== 's') return;
      if (!isActive) return;
      e.preventDefault();
      save()
        .then(() => log('ok', `Saved "${sceneTitle}"`))
        .catch(() => log('warn', `Failed to save "${sceneTitle}"`));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save, isActive, sceneTitle, log]);

  useEffect(() => {
    setSceneWordCount(sceneId, countWords(content));
  }, [sceneId, content, setSceneWordCount]);

  // Typewriter mode: mark the paragraph under the caret with .is-current
  useEffect(() => {
    if (!typewriterMode || !isActive) return;
    const editor = editorRef.current;
    const handler = () => {
      if (!editor) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node: Node | null = sel.getRangeAt(0).startContainer;
      while (node && node !== editor) {
        if ((node as Element).tagName === 'P') break;
        node = node.parentNode;
      }
      editor.querySelectorAll('p.is-current').forEach(el => el.classList.remove('is-current'));
      if (node && (node as Element).tagName === 'P' && editor.contains(node)) {
        (node as Element).classList.add('is-current');
      }
    };
    document.addEventListener('selectionchange', handler);
    return () => {
      document.removeEventListener('selectionchange', handler);
      editor?.querySelectorAll('p.is-current').forEach(el => el.classList.remove('is-current'));
    };
  }, [typewriterMode, isActive]);

  // Initialize contenteditable DOM once per scene load; gated by ref so typing doesn't reset it
  useEffect(() => {
    if (loading || !editorRef.current) return;
    if (initializedSceneRef.current === sceneId) return;
    initializedSceneRef.current = sceneId;
    const paras = (content || '').split(/\n{2,}/).filter(p => p.trim());
    editorRef.current.innerHTML = paras.length > 0
      ? paras.map(p => `<p>${escapeHtml(p)}</p>`).join('')
      : '<p></p>';
  }, [sceneId, loading, content]);

  function handleInput() {
    if (!editorRef.current) return;
    const paras = Array.from(editorRef.current.querySelectorAll('p'))
      .map(p => p.textContent ?? '');
    onChange(paras.join('\n\n'));
    if (isActive) {
      const nonEmpty = paras.filter(p => p.trim());
      setContentStats({
        paragraphCount: nonEmpty.length,
        sentenceCount: nonEmpty.reduce(
          (n, p) => n + (p.match(/[.!?]+/g)?.length ?? 0),
          0
        ),
      });
    }
  }

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
          background: 'var(--signal-error)', color: 'var(--text-strong)',
          fontSize: 'var(--fs-mono-sm)', padding: '4px 10px', flexShrink: 0, opacity: 0.9,
        }}>
          {error}
        </div>
      )}
      <div className={`editor-area${minimapOpen ? '' : ' no-minimap'}`}>
        <div ref={setScrollEl} className="editor-scroll">
          <div className="editor-doc">
            <div className="scene-head">
              <div className="eyebrow">scene</div>
              <h1>{sceneTitle}</h1>
            </div>
            <div
              ref={editorRef}
              className="prose prose-editable"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              onInput={handleInput}
            />
          </div>
        </div>
        {minimapOpen && <Minimap content={content} scrollEl={scrollEl} />}
      </div>
      <div style={{
        padding: '4px 16px', borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', fontSize: 'var(--fs-mono-xs)',
        color: 'var(--text-faint)', flexShrink: 0, background: 'var(--bg-editor)',
      }}>
        {saving ? 'Saving…' : isDirty ? 'Unsaved · Ctrl+S to save' : 'Saved'}
      </div>
    </div>
  );
}
