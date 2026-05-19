import { useEditorSettings, type EditorFont } from '../../hooks/useEditorSettings';

interface FormatBarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
}

export function FormatBar({ editorRef }: FormatBarProps) {
  const { font, setFont } = useEditorSettings();

  function exec(cmd: string) {
    document.execCommand(cmd, false);
  }

  function handleFont(e: React.ChangeEvent<HTMLSelectElement>) {
    setFont(e.target.value as EditorFont);
    editorRef.current?.focus();
  }

  return (
    <div className="format-bar">
      <select value={font} onChange={handleFont}>
        <option value="serif">Spectral — Serif</option>
        <option value="sans">Geist — Sans</option>
        <option value="mono">JetBrains — Mono</option>
      </select>
      <span className="format-bar-sep" />
      <button onMouseDown={e => { e.preventDefault(); exec('bold'); }} title="Bold (Ctrl+B)">
        <strong>B</strong>
      </button>
      <button onMouseDown={e => { e.preventDefault(); exec('italic'); }} title="Italic (Ctrl+I)">
        <em>I</em>
      </button>
      <button onMouseDown={e => { e.preventDefault(); exec('underline'); }} title="Underline (Ctrl+U)">
        <u>U</u>
      </button>
    </div>
  );
}
