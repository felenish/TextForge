import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useInternalLink } from '../../contexts/InternalLinkContext';
import type { InternalLinkType } from '../../contexts/InternalLinkContext';

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

// Returns true if the element is (or is inside) a scene editor — excluded from link feature.
function isInSceneEditor(el: HTMLElement): boolean {
  let node: HTMLElement | null = el;
  while (node) {
    if (node.dataset?.sceneEditor === 'true') return true;
    node = node.parentElement;
  }
  return false;
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

type LinkSubMenu = 'character' | 'location' | 'outline' | null;

export function EditorContextMenu() {
  const { characters, locations, outlines } = useInternalLink();
  const [visible, setVisible]             = useState(false);
  const [pos, setPos]                     = useState({ x: 0, y: 0 });
  const [selectedText, setSelected]       = useState('');
  const [aiOpen, setAiOpen]               = useState(false);
  const [linkOpen, setLinkOpen]           = useState(false);
  const [linkSubMenu, setLinkSubMenu]     = useState<LinkSubMenu>(null);
  const [inContentEditable, setInCE]      = useState(false);
  const [canLink, setCanLink]             = useState(false);
  const menuRef  = useRef<HTMLDivElement>(null);
  const savedSel = useRef<SavedSel>(null);

  const close = useCallback(() => {
    setVisible(false);
    setAiOpen(false);
    setLinkOpen(false);
    setLinkSubMenu(null);
  }, []);

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!isEditable(target)) return;
      e.preventDefault();
      const { text, sel } = captureSel(target);
      savedSel.current = sel;
      setSelected(text);
      setInCE(sel?.kind === 'range');
      setCanLink(sel?.kind === 'range' && !isInSceneEditor(target));
      setAiOpen(false);
      setLinkOpen(false);
      setLinkSubMenu(null);
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
  }, [visible, linkOpen, linkSubMenu, aiOpen]);

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

  // Route all mutations through execCommand so the browser's undo stack stays intact.
  function execOnSel(cmd: string, value?: string) {
    const s = savedSel.current;
    if (!s) return;
    if (s.kind === 'input') {
      s.el.focus();
      s.el.setSelectionRange(s.start, s.end);
    } else {
      restoreSel();
    }
    document.execCommand(cmd, false, value);
  }

  async function copy() {
    await navigator.clipboard.writeText(selectedText).catch(() => {});
    close();
  }

  async function cut() {
    await navigator.clipboard.writeText(selectedText).catch(() => {});
    execOnSel('delete');
    close();
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      execOnSel('insertText', text);
    } catch { /* clipboard-read not permitted */ }
    close();
  }

  async function pastePlain() {
    try {
      const text = await navigator.clipboard.readText();
      execOnSel('insertText', text.replace(/\r\n/g, '\n'));
    } catch { /* clipboard-read not permitted */ }
    close();
  }

  function aiAction(id: string) {
    window.dispatchEvent(new CustomEvent('tf-ai-action', {
      detail: { templateId: id, selectedText },
    }));
    close();
  }

  function insertLink(type: InternalLinkType, id: string, name: string) {
    const s = savedSel.current;
    if (!s || s.kind !== 'range') { close(); return; }
    restoreSel();
    const html = `<a class="tf-link" data-tf-type="${type}" data-tf-id="${id}" data-tf-name="${escapeAttr(name)}" contenteditable="false" title="Ctrl+click to open">${escapeHtml(selectedText)}</a>`;
    document.execCommand('insertHTML', false, html);
    close();
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeAttr(s: string) {
    return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const linkCategories: { key: LinkSubMenu; label: string; icon: string; items: { id: string; name: string }[] }[] = [
    { key: 'character', label: 'Character',  icon: 'user',    items: characters.map(c => ({ id: c.id, name: c.name })) },
    { key: 'location',  label: 'Location',   icon: 'map-pin', items: locations.map(l => ({ id: l.id, name: l.name })) },
    { key: 'outline',   label: 'Outline',    icon: 'layout',  items: outlines.map(o => ({ id: o.id, name: o.name })) },
  ];

  return (
    // onMouseDown preventDefault keeps the editor focused and preserves its
    // DOM selection so cut/copy/paste can act on the right content.
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={e => e.preventDefault()}
    >
      <div className={`ctx-item${!inContentEditable ? ' ctx-disabled' : ''}`}
        onClick={inContentEditable ? () => { document.execCommand('undo'); close(); } : undefined}>Undo</div>
      <div className={`ctx-item${!inContentEditable ? ' ctx-disabled' : ''}`}
        onClick={inContentEditable ? () => { document.execCommand('redo'); close(); } : undefined}>Redo</div>
      <div className="ctx-sep" />
      <div className={`ctx-item${!hasSelection ? ' ctx-disabled' : ''}`}
        onClick={hasSelection ? () => void cut() : undefined}>Cut</div>
      <div className={`ctx-item${!hasSelection ? ' ctx-disabled' : ''}`}
        onClick={hasSelection ? () => void copy() : undefined}>Copy</div>
      <div className="ctx-item" onClick={() => void paste()}>Paste</div>
      <div className="ctx-item" onClick={() => void pastePlain()}>Paste as Plain Text</div>

      {hasSelection && canLink && (
        <>
          <div className="ctx-sep" />
          <div className="ctx-item ctx-link-toggle" onClick={() => { setLinkOpen(o => !o); setLinkSubMenu(null); setAiOpen(false); }}>
            <Icon name="link" size={11} />
            <span>Link to…</span>
            <span className="ctx-chevron">{linkOpen ? '▾' : '▸'}</span>
          </div>
          {linkOpen && !linkSubMenu && linkCategories.map(cat => (
            <div key={cat.key} className="ctx-item ctx-link-cat" onClick={() => setLinkSubMenu(cat.key)}>
              <Icon name={cat.icon as Parameters<typeof Icon>[0]['name']} size={12} />
              <span>{cat.label}</span>
              <span className="ctx-chevron">▸</span>
            </div>
          ))}
          {linkOpen && linkSubMenu && (() => {
            const cat = linkCategories.find(c => c.key === linkSubMenu)!;
            return (
              <>
                <div className="ctx-item ctx-link-back" onClick={() => setLinkSubMenu(null)}>
                  <span className="ctx-chevron">◂</span>
                  <span>{cat.label}</span>
                </div>
                {cat.items.length === 0 && (
                  <div className="ctx-item ctx-disabled ctx-link-empty">No {cat.label.toLowerCase()}s yet</div>
                )}
                {cat.items.map(item => (
                  <div key={item.id} className="ctx-item ctx-link-item" onClick={() => insertLink(linkSubMenu, item.id, item.name)}>
                    {item.name}
                  </div>
                ))}
              </>
            );
          })()}
        </>
      )}

      {hasSelection && (
        <>
          <div className="ctx-sep" />
          <div className="ctx-item ctx-ai-toggle" onClick={() => { setAiOpen(o => !o); setLinkOpen(false); setLinkSubMenu(null); }}>
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
