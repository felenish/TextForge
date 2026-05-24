import { useEffect, useRef, useState } from 'react';

interface EditMenuProps {
  onFind: () => void;
  onFindReplace: () => void;
}

export function EditMenu({ onFind, onFindReplace }: EditMenuProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  function clipboardItem(label: string, kbd: string, cmd: string) {
    return (
      <button
        className="filemenu-item"
        onMouseDown={e => e.preventDefault()}
        onClick={() => { document.execCommand(cmd); setOpen(false); }}
      >
        <span>{label}</span>
        <span className="filemenu-kbd">{kbd}</span>
      </button>
    );
  }

  return (
    <div className="filemenu">
      <button
        ref={triggerRef}
        className={`mb-menu-btn${open ? ' open' : ''}`}
        onMouseDown={e => e.preventDefault()}
        onClick={() => setOpen(o => !o)}
      >
        Edit
      </button>
      {open && (
        <div ref={panelRef} className="filemenu-panel">
          {clipboardItem('Undo', 'Ctrl+Z', 'undo')}
          {clipboardItem('Redo', 'Ctrl+Y', 'redo')}
          <div className="filemenu-sep" />
          {clipboardItem('Cut', 'Ctrl+X', 'cut')}
          {clipboardItem('Copy', 'Ctrl+C', 'copy')}
          {clipboardItem('Paste', 'Ctrl+V', 'paste')}
          <div className="filemenu-sep" />
          <button
            className="filemenu-item"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onFind(); setOpen(false); }}
          >
            <span>Find…</span>
            <span className="filemenu-kbd">Ctrl+F</span>
          </button>
          <button
            className="filemenu-item"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onFindReplace(); setOpen(false); }}
          >
            <span>Find &amp; Replace…</span>
            <span className="filemenu-kbd">Ctrl+H</span>
          </button>
        </div>
      )}
    </div>
  );
}
