import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { ExportModal } from '../export/ExportModal';

interface ManuscriptMenuProps {
  hasSeries: boolean;
}

export function ManuscriptMenu({ hasSeries }: ManuscriptMenuProps) {
  const { seriesTitle } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'epub' | null>(null);
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

  function close() { setOpen(false); }

  function item(label: string, kbd: string | null, action: () => void, disabled = false) {
    return (
      <button
        className={`filemenu-item${disabled ? ' disabled' : ''}`}
        disabled={disabled}
        onMouseDown={e => e.preventDefault()}
        onClick={() => { if (!disabled) { action(); close(); } }}
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
          Manuscript
        </button>
        {open && (
          <div ref={panelRef} className="filemenu-panel">
            {item('Export PDF…', null, () => setExportFormat('pdf'), !hasSeries)}
            {item('Export EPUB…', null, () => setExportFormat('epub'), !hasSeries)}
          </div>
        )}
      </div>

      {exportFormat && (
        <ExportModal
          seriesTitle={seriesTitle ?? ''}
          initialFormat={exportFormat}
          onClose={() => setExportFormat(null)}
        />
      )}
    </>
  );
}
