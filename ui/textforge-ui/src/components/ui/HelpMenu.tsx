import { useEffect, useRef, useState } from 'react';

interface HelpMenuProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenLogFolder: () => void;
  onAbout: () => void;
}

export function HelpMenu({ onOpenSettings, onOpenHelp, onOpenLogFolder, onAbout }: HelpMenuProps) {
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

  function item(label: string, kbd: string | null, action: () => void) {
    return (
      <button
        className="filemenu-item"
        onMouseDown={e => e.preventDefault()}
        onClick={() => { action(); setOpen(false); }}
      >
        <span>{label}</span>
        {kbd && <span className="filemenu-kbd">{kbd}</span>}
      </button>
    );
  }

  return (
    <div className="filemenu">
      <button
        ref={triggerRef}
        className={`mb-menu-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        Help
      </button>
      {open && (
        <div ref={panelRef} className="filemenu-panel">
          {item('Help', 'F1', onOpenHelp)}
          {item('Open Log Folder', null, onOpenLogFolder)}
          <div className="filemenu-sep" />
          {item('Settings…', 'Ctrl+,', onOpenSettings)}
          <div className="filemenu-sep" />
          {item('About TextForge Studio', null, onAbout)}
        </div>
      )}
    </div>
  );
}
