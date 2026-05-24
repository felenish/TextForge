import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

const AI_ACTIONS = [
  { id: 'copy-edit', label: 'Copy Edit'    },
  { id: 'revise',    label: 'Revise'        },
  { id: 'improve',   label: 'Improve Prose' },
  { id: 'analyze',   label: 'Analyze'       },
  { id: 'summarize', label: 'Summarize'     },
] as const;

function isEditable(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement) {
    const skip = ['checkbox','radio','range','color','file','submit','button','reset','hidden','image'];
    return !el.disabled && !el.readOnly && !skip.includes(el.type);
  }
  if (el instanceof HTMLTextAreaElement) return !el.disabled && !el.readOnly;
  return el.isContentEditable;
}

// Capture the selection at contextmenu time — before the menu appears and
// potentially steals focus, clearing the DOM selection.
interface SavedInputSel { kind: 'input'; el: HTMLInputElement | HTMLTextAreaElement; start: number; end: number; }
interface SavedRangeSel  { kind: 'range'; range: Range; }
type SavedSel = SavedInputSel | SavedRangeSel | null;

function captureSel(target: HTMLElement): { text: string; sel: SavedSel } {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? 0;
    const end   = target.selectionEnd   ?? 0;
    return { text: target.value.slice(start, end), sel: { kind: 'input', el: target, start, end } };
  }
  const domSel = window.getSelection();
  const text   = domSel?.toString() ?? '';
  const sel: SavedSel = (domSel && domSel.rangeCount > 0)
    ? { kind: 'range', range: domSel.getRangeAt(0).cloneRange() }
    : null;
  return { text, sel };
}

export function EditorContextMenu() {
  const [visible, setVisible]       = useState(false);
  const [pos, setPos]               = useState({ x: 0, y: 0 });
  const [selectedText, setSelected] = useState('');
  const [aiOpen, setAiOpen]         = useState(false);
  const menuRef  = useRef<HTMLDivElement>(null);
  const savedSel = useRef<SavedSel>(null);

  const close = useCallback(() => { setVisible(false); setAiOpen(false); }, []);

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!isEditable(target)) return;
      e.preventDefault();
      const { text, sel } = captureSel(target);
      savedSel.current = sel;
      setSelected(text);
      setAiOpen(false);
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    document.addEventListener('contextmenu', onContext);
    return () => document.removeEventListener('contextmenu', onContext);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onMouse = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [visible, close]);

  // Clamp to viewport after render
  useEffect(() => {
    if (!visible || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    setPos(prev => ({
      x: rect.right  > vw ? Math.max(0, vw - rect.width  - 4) : prev.x,
      y: rect.bottom > vh ? Math.max(0, vh - rect.height - 4) : prev.y,
    }));
  }, [visible]);

  if (!visible) return null;

  const hasSelection = selectedText.length > 0;

  function restoreSel() {
    const s = savedSel.current;
    if (!s) return;
    if (s.kind === 'input') {
      s.el.focus();
      s.el.setSelectionRange(s.start, s.end);
    } else {
      const domSel = window.getSelection();
      domSel?.removeAllRanges();
      domSel?.addRange(s.range);
    }
  }

  function insertText(text: string) {
    const s = savedSel.current;
    if (!s) return;
    if (s.kind === 'input') {
      s.el.focus();
      s.el.setRangeText(text, s.start, s.end, 'end');
      s.el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      restoreSel();
      document.execCommand('insertText', false, text);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(selectedText).catch(() => {});
    close();
  }

  async function cut() {
    await navigator.clipboard.writeText(selectedText).catch(() => {});
    const s = savedSel.current;
    if (s?.kind === 'input') {
      s.el.focus();
      s.el.setRangeText('', s.start, s.end, 'end');
      s.el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (s?.kind === 'range') {
      restoreSel();
      s.range.deleteContents();
      s.range.startContainer.parentElement?.dispatchEvent(new Event('input', { bubbles: true }));
    }
    close();
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      insertText(text);
    } catch { /* clipboard-read not permitted */ }
    close();
  }

  async function pastePlain() {
    try {
      const text = await navigator.clipboard.readText();
      // Strip any residual line-break normalisation — always insert as-is plain text
      insertText(text.replace(/\r\n/g, '\n'));
    } catch { /* clipboard-read not permitted */ }
    close();
  }

  function aiAction(id: string) {
    window.dispatchEvent(new CustomEvent('tf-ai-action', {
      detail: { templateId: id, selectedText },
    }));
    close();
  }

  return (
    // onMouseDown preventDefault keeps the editor focused and preserves its
    // DOM selection so cut/copy/paste can act on the right content.
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={e => e.preventDefault()}
    >
      <div className={`ctx-item${!hasSelection ? ' ctx-disabled' : ''}`}
        onClick={hasSelection ? () => void cut() : undefined}>Cut</div>
      <div className={`ctx-item${!hasSelection ? ' ctx-disabled' : ''}`}
        onClick={hasSelection ? () => void copy() : undefined}>Copy</div>
      <div className="ctx-item" onClick={() => void paste()}>Paste</div>
      <div className="ctx-item" onClick={() => void pastePlain()}>Paste as Plain Text</div>

      {hasSelection && (
        <>
          <div className="ctx-sep" />
          <div className="ctx-item ctx-ai-toggle" onClick={() => setAiOpen(o => !o)}>
            <Icon name="sparkles" size={11} />
            <span>AI Assistant</span>
            <span className="ctx-chevron">{aiOpen ? '▾' : '▸'}</span>
          </div>
          {aiOpen && AI_ACTIONS.map(a => (
            <div key={a.id} className="ctx-item ctx-ai-item" onClick={() => aiAction(a.id)}>
              {a.label}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
