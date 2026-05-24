import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useOutput } from '../../contexts/OutputContext';
import * as workspaceApi from '../../api/workspace';
import * as scenesApi from '../../api/scenes';
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

interface SelectedImage {
  width: number;
  align: string;
  rect: DOMRect;
}

// Optional alignment field: [[img:file:width:align]] — align defaults to 'center'
const IMG_RE = /^\[\[img:([^:]+):(\d+)(?::(left|center|right))?\]\]$/;

function blockStyle(widthPct: string, align: string): string {
  const ml = align === 'left' ? '0' : 'auto';
  const mr = align === 'right' ? '0' : 'auto';
  return `width:${widthPct}%;margin-left:${ml};margin-right:${mr};display:block;`;
}

function countWords(text: string): number {
  const stripped = text.replace(/\[\[img:[^\]]*\]\]/g, '').trim();
  return stripped === '' ? 0 : stripped.split(/\s+/).length;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function contentToHtml(content: string, sceneId: string): string {
  const paras = content.split(/\n{2,}/).filter(p => p.trim());
  if (paras.length === 0) return '<p><br></p>';
  return paras.map(p => {
    const m = p.trim().match(IMG_RE);
    if (m) {
      const [, filename, width, align = 'center'] = m;
      const src = scenesApi.getSceneAssetUrl(sceneId, filename);
      const style = blockStyle(width, align);
      return `<div class="image-block" contenteditable="false" data-filename="${filename}" data-width="${width}" data-align="${align}" style="${style}"><img src="${src}" style="width:100%;display:block;max-width:100%;"/></div>`;
    }
    return `<p>${escapeHtml(p)}</p>`;
  }).join('');
}

function serializeEditorContent(el: HTMLDivElement): string {
  const parts: string[] = [];
  for (const child of Array.from(el.childNodes)) {
    const node = child as HTMLElement;
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    if (node.tagName === 'P') {
      const text = node.textContent ?? '';
      if (text.trim()) parts.push(text);
    } else if (node.classList?.contains('image-block')) {
      const filename = node.dataset.filename ?? '';
      const width = node.dataset.width ?? '100';
      const align = node.dataset.align ?? 'center';
      if (filename) parts.push(`[[img:${filename}:${width}:${align}]]`);
    }
  }
  return parts.join('\n\n');
}

export function SceneEditor({ sceneId, sceneTitle, isActive, onRegisterSave, onUnregisterSave, onRegisterEditorEl }: SceneEditorProps) {
  const { content, isDirty, loading, saving, error, onChange, save } = useSceneEditor(sceneId);
  const { markDirty, markClean, setSceneWordCount, setContentStats, typewriterMode, minimapOpen } = useWorkspace();
  const { log } = useOutput();
  const editorRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const selectedImageEl = useRef<HTMLElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const initializedRef = useRef(false);
  useLayoutEffect(() => {
    if (loading || !editorRef.current || initializedRef.current) return;
    initializedRef.current = true;
    editorRef.current.innerHTML = contentToHtml(content, sceneId);
  }, [loading, content, sceneId]);

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

  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; });

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  // Native input listener — more reliable in WebView2 than React's synthetic onInput
  useEffect(() => {
    const el = editorRef.current;
    if (!el || loading) return;
    function onInput() {
      const value = serializeEditorContent(el!);
      onChangeRef.current(value);
      if (isActiveRef.current) {
        const pEls = Array.from(el!.querySelectorAll('p'));
        const nonEmpty = pEls.map(p => p.textContent ?? '').filter(p => p.trim());
        setContentStats({
          paragraphCount: nonEmpty.length,
          sentenceCount: nonEmpty.reduce((n, p) => n + (p.match(/[.!?]+/g)?.length ?? 0), 0),
        });
      }
    }
    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [loading, setContentStats]);

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

  // Insert an image block after the current cursor paragraph (or at end)
  const insertImageBlock = useCallback((filename: string, width: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    const align = 'center';
    const block = document.createElement('div');
    block.className = 'image-block';
    block.contentEditable = 'false';
    block.dataset.filename = filename;
    block.dataset.width = String(width);
    block.dataset.align = align;
    block.style.cssText = blockStyle(String(width), align);
    const img = document.createElement('img');
    img.src = scenesApi.getSceneAssetUrl(sceneId, filename);
    img.style.cssText = 'width:100%;display:block;max-width:100%;';
    block.appendChild(img);

    // Find the paragraph containing the cursor to insert after it
    const sel = window.getSelection();
    let anchor: Element | null = null;
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).startContainer;
      while (node && node !== editor) {
        if ((node as Element).tagName === 'P') { anchor = node as Element; break; }
        node = node.parentNode;
      }
    }
    editor.insertBefore(block, anchor ? anchor.nextSibling : null);

    // Ensure a paragraph follows the image so the cursor has somewhere to go
    if (!block.nextSibling || (block.nextSibling as Element).tagName !== 'P') {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      editor.insertBefore(p, block.nextSibling);
    }

    // Move cursor into that next paragraph
    const next = block.nextSibling as HTMLElement;
    if (next && sel) {
      const range = document.createRange();
      range.setStart(next, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    onChangeRef.current(serializeEditorContent(editor));
  }, [sceneId]);

  // Drop and paste image files
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || loading) return;

    const onDragOver = (e: DragEvent) => {
      const isAsset = e.dataTransfer?.types.includes('application/textforge-asset');
      const hasImg = [...(e.dataTransfer?.items ?? [])].some(i => i.kind === 'file' && i.type.startsWith('image/'));
      if (!isAsset && !hasImg) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };

    const onDrop = async (e: DragEvent) => {
      const assetFilename = e.dataTransfer?.getData('application/textforge-asset');
      if (assetFilename) {
        e.preventDefault();
        e.stopPropagation();
        if (document.caretRangeFromPoint) {
          const r = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (r) { const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); }
        }
        insertImageBlock(assetFilename, 100);
        return;
      }

      const files = [...(e.dataTransfer?.files ?? [])].filter(f => f.type.startsWith('image/'));
      if (files.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      // Place cursor at the drop point so insertImageBlock inserts there
      if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (r) { const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); }
      }
      setUploading(true);
      try {
        const { filename } = await scenesApi.uploadSceneAsset(sceneId, files[0]);
        insertImageBlock(filename, 100);
        window.dispatchEvent(new CustomEvent('tf-asset-uploaded'));
      } catch {
        log('warn', 'Failed to upload image.');
      } finally {
        setUploading(false);
      }
    };

    const onPaste = async (e: ClipboardEvent) => {
      const items = [...(e.clipboardData?.items ?? [])].filter(i => i.type.startsWith('image/'));
      if (items.length === 0) return;
      e.preventDefault();
      const file = items[0].getAsFile();
      if (!file) return;
      setUploading(true);
      try {
        const { filename } = await scenesApi.uploadSceneAsset(sceneId, file);
        insertImageBlock(filename, 100);
        window.dispatchEvent(new CustomEvent('tf-asset-uploaded'));
      } catch {
        log('warn', 'Failed to upload pasted image.');
      } finally {
        setUploading(false);
      }
    };

    editor.addEventListener('dragover', onDragOver);
    editor.addEventListener('drop', onDrop);
    editor.addEventListener('paste', onPaste);
    return () => {
      editor.removeEventListener('dragover', onDragOver);
      editor.removeEventListener('drop', onDrop);
      editor.removeEventListener('paste', onPaste);
    };
  }, [loading, sceneId, insertImageBlock, log]);

  // Image click → show resize toolbar
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || loading) return;
    const handleClick = (e: MouseEvent) => {
      const block = (e.target as HTMLElement).closest?.('.image-block') as HTMLElement | null;
      editor.querySelectorAll('.image-block.is-selected').forEach(b => b.classList.remove('is-selected'));
      if (block) {
        block.classList.add('is-selected');
        selectedImageEl.current = block;
        setSelectedImage({ width: Number(block.dataset.width ?? 100), align: block.dataset.align ?? 'center', rect: block.getBoundingClientRect() });
      } else {
        selectedImageEl.current = null;
        setSelectedImage(null);
      }
    };
    editor.addEventListener('click', handleClick);
    return () => editor.removeEventListener('click', handleClick);
  }, [loading]);

  // Dismiss toolbar when clicking outside
  useEffect(() => {
    if (!selectedImage) return;
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.('.image-block') && !t.closest?.('.image-toolbar')) {
        editorRef.current?.querySelectorAll('.image-block.is-selected').forEach(b => b.classList.remove('is-selected'));
        selectedImageEl.current = null;
        setSelectedImage(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [selectedImage]);

  const resizeImage = useCallback((widthPct: number) => {
    const el = selectedImageEl.current;
    if (!el) return;
    el.dataset.width = String(widthPct);
    el.style.width = `${widthPct}%`;
    setSelectedImage(prev => prev ? { ...prev, width: widthPct } : null);
    if (editorRef.current) onChangeRef.current(serializeEditorContent(editorRef.current));
  }, []);

  const alignImage = useCallback((align: string) => {
    const el = selectedImageEl.current;
    if (!el) return;
    el.dataset.align = align;
    el.style.marginLeft = align === 'left' ? '0' : 'auto';
    el.style.marginRight = align === 'right' ? '0' : 'auto';
    setSelectedImage(prev => prev ? { ...prev, align } : null);
    if (editorRef.current) onChangeRef.current(serializeEditorContent(editorRef.current));
  }, []);

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
        {uploading ? 'Uploading image…' : saving ? 'Saving…' : isDirty ? 'Unsaved · Ctrl+S to save' : 'Saved'}
      </div>

      {selectedImage && (
        <div
          className="image-toolbar"
          style={{ position: 'fixed', top: selectedImage.rect.top - 6, left: selectedImage.rect.left + selectedImage.rect.width / 2, transform: 'translate(-50%, -100%)', zIndex: 9999 }}
        >
          <span className="image-toolbar-label">Width</span>
          <input
            type="range"
            min={25}
            max={100}
            step={1}
            value={selectedImage.width}
            className="image-toolbar-slider"
            onMouseDown={e => e.stopPropagation()}
            onChange={e => resizeImage(Number(e.target.value))}
          />
          <span className="image-toolbar-width-value">{selectedImage.width}%</span>
          <span className="image-toolbar-divider" />
          <span className="image-toolbar-label">Align</span>
          {(['left', 'center', 'right'] as const).map(a => (
            <button
              key={a}
              className={selectedImage.align === a ? 'active' : ''}
              onMouseDown={e => { e.preventDefault(); alignImage(a); }}
              title={a.charAt(0).toUpperCase() + a.slice(1)}
            >
              {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
