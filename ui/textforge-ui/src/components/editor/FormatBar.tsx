import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorSettings, type EditorFont } from '../../hooks/useEditorSettings';
import { Icon } from '../ui/Icon';

interface FormatBarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
}

const TRACKED_COMMANDS = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'] as const;
const ALIGN_COMMANDS = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'] as const;

export function FormatBar({ editorRef }: FormatBarProps) {
  const { font, setFont } = useEditorSettings();
  const [active, setActive] = useState<Set<string>>(new Set());
  const [activeAlign, setActiveAlign] = useState<string>('justifyLeft');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [highlightColor, setHighlightColor] = useState<string>('#ffff00');

  const savedSelectionRef = useRef<Range | null>(null);

  const refreshActive = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current?.contains(sel.anchorNode)) {
      setActive(new Set());
      return;
    }

    const next = new Set<string>();
    for (const cmd of TRACKED_COMMANDS) {
      if (document.queryCommandState(cmd)) next.add(cmd);
    }
    setActive(next);

    // Detect active alignment
    for (const cmd of ALIGN_COMMANDS) {
      if (document.queryCommandState(cmd)) {
        setActiveAlign(cmd);
        break;
      }
    }

  }, [editorRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActive);
    return () => document.removeEventListener('selectionchange', refreshActive);
  }, [refreshActive]);

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    refreshActive();
  }

  // Save selection before a color input steals focus, restore it before applying.
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const range = savedSelectionRef.current;
    if (!range) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function handleFont(e: React.ChangeEvent<HTMLSelectElement>) {
    setFont(e.target.value as EditorFont);
    editorRef.current?.focus();
  }

  function handleTextColor(e: React.ChangeEvent<HTMLInputElement>) {
    const color = e.target.value;
    setTextColor(color);
    restoreSelection();
    exec('foreColor', color);
  }

  function handleHighlightColor(e: React.ChangeEvent<HTMLInputElement>) {
    const color = e.target.value;
    setHighlightColor(color);
    restoreSelection();
    exec('hiliteColor', color);
  }

  function insertTable() {
    const html = `<table><tbody><tr><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td></tr></tbody></table><p><br></p>`;
    exec('insertHTML', html);
  }

  const btn = (cmd: string, content: React.ReactNode, title: string, isAlign = false) => (
    <button
      className={(isAlign ? activeAlign === cmd : active.has(cmd)) ? 'active' : ''}
      onMouseDown={e => { e.preventDefault(); exec(cmd); }}
      title={title}
    >
      {content}
    </button>
  );

  return (
    <div className="format-bar">
      {/* Font family */}
      <div className="format-bar-group">
        <select value={font} onChange={handleFont} title="Font family">
          <option value="serif">Spectral — Serif</option>
          <option value="sans">Geist — Sans</option>
          <option value="mono">JetBrains — Mono</option>
        </select>
      </div>

      {/* Bold / Italic / Underline */}
      <div className="format-bar-group">
        {btn('bold', <strong>B</strong>, 'Bold (Ctrl+B)')}
        {btn('italic', <em>I</em>, 'Italic (Ctrl+I)')}
        {btn('underline', <u>U</u>, 'Underline (Ctrl+U)')}
      </div>

      {/* Color + clear formatting */}
      <div className="format-bar-group">
        <label className="format-bar-color-btn" title="Text color" onMouseDown={saveSelection}>
          <span className="format-bar-color-preview" style={{ background: textColor, borderBottom: `3px solid ${textColor}` }}>
            <Icon name="type" size={12} stroke={2} />
          </span>
          <input
            type="color"
            value={textColor}
            onChange={handleTextColor}
            className="format-bar-color-input"
          />
        </label>
        <label className="format-bar-color-btn" title="Highlight color" onMouseDown={saveSelection}>
          <span className="format-bar-color-preview" style={{ background: highlightColor }}>
            <Icon name="pencil" size={12} stroke={2} />
          </span>
          <input
            type="color"
            value={highlightColor}
            onChange={handleHighlightColor}
            className="format-bar-color-input"
          />
        </label>
        <button
          onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }}
          title="Clear formatting"
        >
          <Icon name="eraser" size={13} stroke={1.5} />
        </button>
      </div>

      {/* Alignment */}
      <div className="format-bar-group">
        {btn('justifyLeft',   <Icon name="align-left"    size={13} stroke={1.5} />, 'Align left',   true)}
        {btn('justifyCenter', <Icon name="align-center"  size={13} stroke={1.5} />, 'Align center', true)}
        {btn('justifyRight',  <Icon name="align-right"   size={13} stroke={1.5} />, 'Align right',  true)}
        {btn('justifyFull',   <Icon name="align-justify" size={13} stroke={1.5} />, 'Justify',      true)}
      </div>

      {/* Lists */}
      <div className="format-bar-group">
        {btn('insertUnorderedList', <Icon name="list"         size={13} stroke={2} />, 'Bullet list')}
        {btn('insertOrderedList',   <Icon name="list-ordered" size={13} stroke={2} />, 'Numbered list')}
      </div>

      {/* Table */}
      <div className="format-bar-group">
        <button onMouseDown={e => { e.preventDefault(); insertTable(); }} title="Insert table">
          <Icon name="table" size={13} stroke={1.5} />
        </button>
      </div>
    </div>
  );
}
