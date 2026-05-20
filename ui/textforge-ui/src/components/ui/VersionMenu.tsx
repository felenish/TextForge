import { useEffect, useRef, useState } from 'react';
import { TakeSnapshotModal } from '../versions/TakeSnapshotModal';

interface VersionMenuProps {
  hasSeries: boolean;
  onViewHistory: () => void;
}

export function VersionMenu({ hasSeries, onViewHistory }: VersionMenuProps) {
  const [open, setOpen] = useState(false);
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
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

  function item(label: string, kbd: string | null, action: () => void, disabled = false) {
    return (
      <button
        className={`filemenu-item${disabled ? ' disabled' : ''}`}
        disabled={disabled}
        onMouseDown={e => e.preventDefault()}
        onClick={() => { if (!disabled) { action(); setOpen(false); } }}
      >
        <span>{label}</span>
        {kbd && <span className="filemenu-kbd">{kbd}</span>}
      </button>
    );
  }

  return (
    <>
      <div className="filemenu">
        <button
          ref={triggerRef}
          className={`mb-menu-btn${open ? ' open' : ''}`}
          onClick={() => setOpen(o => !o)}
        >
          Version
        </button>
        {open && (
          <div ref={panelRef} className="filemenu-panel">
            {item('Take Snapshot…', null, () => setSnapshotModalOpen(true), !hasSeries)}
            {item('View History', null, () => { onViewHistory(); }, !hasSeries)}
          </div>
        )}
      </div>

      {snapshotModalOpen && (
        <TakeSnapshotModal onClose={() => setSnapshotModalOpen(false)} />
      )}
    </>
  );
}
