import { useCallback, useEffect, useState } from 'react';
import { useEditorSettings, type EditorFont } from '../../hooks/useEditorSettings';
import { Icon } from '../ui/Icon';

interface FormatBarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
}

const TRACKED_COMMANDS = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'] as const;

export function FormatBar({ editorRef }: FormatBarProps) {
  const { font, setFont } = useEditorSettings();
  const [active, setActive] = useState<Set<string>>(new Set());

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
  }, [editorRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActive);
    return () => document.removeEventListener('selectionchange', refreshActive);
  }, [refreshActive]);

  function exec(cmd: string) {
    document.execCommand(cmd, false);
    refreshActive();
  }

  function insertTable() {
    const html = `<table><tbody><tr><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td></tr></tbody></table><p><br></p>`;
    document.execCommand('insertHTML', false, html);
  }

  function handleFont(e: React.ChangeEvent<HTMLSelectElement>) {
    setFont(e.target.value as EditorFont);
    editorRef.current?.focus();
  }

  const btn = (cmd: string, content: React.ReactNode, title: string) => (
    <button
      className={active.has(cmd) ? 'active' : ''}
      onMouseDown={e => { e.preventDefault(); exec(cmd); }}
      title={title}
    >
      {content}
    </button>
  );

  return (
    <div className="format-bar">
      <select value={font} onChange={handleFont}>
        <option value="serif">Spectral — Serif</option>
        <option value="sans">Geist — Sans</option>
        <option value="mono">JetBrains — Mono</option>
      </select>
      <span className="format-bar-sep" />
      {btn('bold', <strong>B</strong>, 'Bold (Ctrl+B)')}
      {btn('italic', <em>I</em>, 'Italic (Ctrl+I)')}
      {btn('underline', <u>U</u>, 'Underline (Ctrl+U)')}
      <span className="format-bar-sep" />
      {btn('insertUnorderedList', <Icon name="list" size={13} stroke={2} />, 'Bullet list')}
      {btn('insertOrderedList', <Icon name="list-ordered" size={13} stroke={2} />, 'Numbered list')}
      <span className="format-bar-sep" />
      <button onMouseDown={e => { e.preventDefault(); insertTable(); }} title="Insert table">
        <Icon name="table" size={13} stroke={1.5} />
      </button>
    </div>
  );
}
