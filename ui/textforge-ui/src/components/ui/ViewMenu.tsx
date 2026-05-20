import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface ViewMenuProps {
  focusMode: boolean;
  onFocusToggle: () => void;
  bottomOpen: boolean;
  onBottomToggle: () => void;
  onPaletteOpen: () => void;
}

export function ViewMenu({ focusMode, onFocusToggle, bottomOpen, onBottomToggle, onPaletteOpen }: ViewMenuProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const {
    typewriterMode, setTypewriterMode,
    inspectorOpen, setInspectorOpen,
    minimapOpen, setMinimapOpen,
  } = useWorkspace();

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

  function close() { setOpen(false); }

  function toggleItem(label: string, checked: boolean, action: () => void, kbd?: string) {
    return (
      <button
        className="filemenu-item"
        onMouseDown={e => e.preventDefault()}
        onClick={() => { action(); close(); }}
      >
        <span className="filemenu-check">{checked ? '✓' : ''}</span>
        <span>{label}</span>
        {kbd && <span className="filemenu-kbd">{kbd}</span>}
      </button>
    );
  }

  function actionItem(label: string, kbd: string, action: () => void) {
    return (
      <button
        className="filemenu-item"
        onMouseDown={e => e.preventDefault()}
        onClick={() => { action(); close(); }}
      >
        <span className="filemenu-check" />
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
        onClick={() => setOpen(o => !o)}
      >
        View
      </button>
      {open && (
        <div ref={panelRef} className="filemenu-panel">
          {toggleItem('Focus Mode', focusMode, onFocusToggle, 'F11')}
          {toggleItem('Typewriter Mode', typewriterMode, () => setTypewriterMode(!typewriterMode))}
          <div className="filemenu-sep" />
          {toggleItem('Inspector', inspectorOpen, () => setInspectorOpen(!inspectorOpen))}
          {toggleItem('Minimap', minimapOpen, () => setMinimapOpen(!minimapOpen))}
          {toggleItem('Bottom Panel', bottomOpen, onBottomToggle)}
          <div className="filemenu-sep" />
          {actionItem('Command Palette', 'Ctrl+P', onPaletteOpen)}
        </div>
      )}
    </div>
  );
}
