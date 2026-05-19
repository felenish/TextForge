import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { OutlineDto } from '../../api/outlines';
import * as outlinesApi from '../../api/outlines';
import { FormatBar } from './FormatBar';

interface OutlineEditorProps {
  outlineId: string;
  onSaved?: (outline: OutlineDto) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function OutlineEditor({ outlineId, onSaved }: OutlineEditorProps) {
  const [outline, setOutline] = useState<OutlineDto | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loading = loadedId !== outlineId;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<OutlineDto | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    latestRef.current = null;
    initializedRef.current = false;
    outlinesApi.getOutline(outlineId)
      .then(o => {
        if (cancelled) return;
        setOutline(o);
        setLoadedId(outlineId);
        latestRef.current = o;
      })
      .catch(() => { if (!cancelled) setLoadedId(outlineId); });
    return () => { cancelled = true; };
  }, [outlineId]);

  useLayoutEffect(() => {
    if (loading || !editorRef.current || initializedRef.current) return;
    initializedRef.current = true;
    editorRef.current.innerHTML = outline?.content ?? '<p></p>';
  }, [loading, outline?.content]);

  const flushSave = useCallback(async (o: OutlineDto) => {
    setSaveStatus('saving');
    try {
      const saved = await outlinesApi.saveOutlineDetails(o.id, {
        name: o.name,
        content: o.content,
      });
      setSaveStatus('saved');
      onSaved?.(saved);
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 1500);
    } catch {
      setSaveStatus('error');
    }
  }, [onSaved]);

  const scheduleSave = useCallback((updated: OutlineDto) => {
    latestRef.current = updated;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(updated), 800);
  }, [flushSave]);

  const handleInput = useCallback(() => {
    if (!editorRef.current || !latestRef.current) return;
    const isEmpty = editorRef.current.textContent?.trim() === '';
    const content = isEmpty ? null : editorRef.current.innerHTML;
    const updated = { ...latestRef.current, content };
    setOutline(updated);
    scheduleSave(updated);
  }, [scheduleSave]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOutline(prev => {
      if (!prev) return prev;
      const updated = { ...prev, name: e.target.value };
      scheduleSave(updated);
      return updated;
    });
  }, [scheduleSave]);

  if (loading) {
    return (
      <div className="char-ed-wrap">
        <div className="char-ed-loading">Loading…</div>
      </div>
    );
  }

  if (!outline) {
    return (
      <div className="char-ed-wrap">
        <div className="char-ed-loading">Outline not found.</div>
      </div>
    );
  }

  return (
    <div className="outline-ed-wrap">
      <div className="outline-ed-header">
        <input
          className="outline-ed-title"
          value={outline.name}
          onChange={handleNameChange}
          placeholder="Outline title"
        />
      </div>
      <FormatBar editorRef={editorRef} />
      <div className="outline-ed-scroll">
        <div className="editor-doc">
          <div style={{ position: 'relative' }}>
            {!outline.content && (
              <div className="prose-placeholder">Start outlining your story…</div>
            )}
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
      </div>
      <div className={`char-ed-status char-ed-status--${saveStatus}`}>
        {saveStatus === 'saving' && 'Saving…'}
        {saveStatus === 'saved' && 'Saved'}
        {saveStatus === 'error' && 'Save failed'}
      </div>
    </div>
  );
}
