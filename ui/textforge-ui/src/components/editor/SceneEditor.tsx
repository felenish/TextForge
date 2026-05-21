import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useOutput } from '../../contexts/OutputContext';
import * as workspaceApi from '../../api/workspace';
import { useSceneEditor } from '../../hooks/useSceneEditor';
import { Minimap } from './Minimap';
import { FormatBar } from './FormatBar';

interface SceneEditorProps {
  sceneId: string;
  sceneTitle: string;
  isActive: boolean;
  onRegisterSave: (sceneId: string, save: () => Promise<void>) => void;
  onUnregisterSave: (sceneId: string) => void;
  onRegisterEditorEl: (sceneId: string, el: HTMLDivElement | null) => void;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function contentToHtml(content: string): string {
  const paras = content.split(/\n{2,}/).filter(p => p.trim());
  return paras.length > 0
    ? paras.map(p => `<p>${escapeHtml(p)}</p>`).join('')
    : '<p><br></p>';
}

export function SceneEditor({ sceneId, sceneTitle, isActive, onRegisterSave, onUnregisterSave, onRegisterEditorEl }: SceneEditorProps) {
  const { content, isDirty, loading, saving, error, onChange, save } = useSceneEditor(sceneId);
  const { markDirty, markClean, setSceneWordCount, setContentStats, typewriterMode, minimapOpen } = useWorkspace();
  const { log } = useOutput();
  const editorRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  // Set innerHTML once when the scene finishes loading, before first paint.
  // useLayoutEffect runs synchronously after React's commit so the content
  // is in the DOM before the browser draws. The guard prevents re-applying
  // on every re-render so user edits are never overwritten.
  const initializedRef = useRef(false);
  useLayoutEffect(() => {
    if (loading || !editorRef.current || initializedRef.current) return;
    initializedRef.current = true;
    editorRef.current.innerHTML = contentToHtml(content);
  }, [loading, content]);

  useLayoutEffect(() => {
    if (loading || !editorRef.current) return;
    const el = editorRef.current;
    onRegisterEditorEl(sceneId, el);
    return () => onRegisterEditorEl(sceneId, null);
  }, [loading, sceneId, onRegisterEditorEl]);

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

  // Track isActive in a ref so the input listener closure doesn't go stale.
  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; });

  // Native input listener — more reliable than React's synthetic onInput in WebView2
  // because React delegates events to its root and WebView2 can swallow bubbling.
  useEffect(() => {
    const el = editorRef.current;
    if (!el || loading) return;
    function onInput() {
      const pEls = Array.from(el!.querySelectorAll('p'));
      const value = pEls.length > 0
        ? pEls.map(p => p.textContent ?? '').join('\n\n')
        : (el!.textContent ?? '').trim();
      onChange(value);
      if (isActiveRef.current) {
        const nonEmpty = pEls.map(p => p.textContent ?? '').filter(p => p.trim());
        setContentStats({
          paragraphCount: nonEmpty.length,
          sentenceCount: nonEmpty.reduce(
            (n, p) => n + (p.match(/[.!?]+/g)?.length ?? 0),
            0
          ),
        });
      }
    }
    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [loading, onChange, setContentStats]);

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
      <FormatBar editorRef={editorRef} />
      <div className={`editor-area${minimapOpen ? '' : ' no-minimap'}`}>
        <div ref={setScrollEl} className="editor-scroll">
          <div className="editor-doc">
            <div style={{ position: 'relative' }}>
              {content === '' && (
                <div className="prose-placeholder">Begin writing your scene…</div>
              )}
              <div
                ref={editorRef}
                className="prose prose-editable"
                contentEditable
                suppressContentEditableWarning
                spellCheck
              />
            </div>
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
