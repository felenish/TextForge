import { useEffect, useRef, useState } from 'react';
import { getRecentSeries, type RecentSeriesEntry } from '../../api/settings';

interface FileMenuProps {
  hasSeries: boolean;
  onOpenSeries: () => void;
  onCreateSeries: () => void;
  onSave: () => void;
  onSaveAll: () => void;
  onOpenRecentSeries: (path: string) => void;
  onCloseSeries: () => void;
}

export function FileMenu({
  hasSeries,
  onOpenSeries,
  onCreateSeries,
  onSave,
  onSaveAll,
  onOpenRecentSeries,
  onCloseSeries,
}: FileMenuProps) {
  const [open, setOpen] = useState(false);
  const [recentHover, setRecentHover] = useState(false);
  const [recent, setRecent] = useState<RecentSeriesEntry[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    getRecentSeries().then(setRecent).catch(() => setRecent([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setRecentHover(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setRecentHover(false); }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  function close() { setOpen(false); setRecentHover(false); }

  function item(label: string, kbd: string | null, action: () => void, disabled = false, danger = false) {
    return (
      <button
        className={`filemenu-item${disabled ? ' disabled' : ''}${danger ? ' danger' : ''}`}
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
    <div className="filemenu">
      <button
        ref={triggerRef}
        className={`mb-menu-btn${open ? ' open' : ''}`}
        onClick={() => { setOpen(o => !o); setRecentHover(false); }}
      >
        File
      </button>
      {open && (
        <div ref={panelRef} className="filemenu-panel">
          {item('Open Series…', 'Ctrl+O', onOpenSeries)}
          {item('New Series…', null, onCreateSeries)}
          <div className="filemenu-sep" />
          {item('Save', 'Ctrl+S', onSave, !hasSeries)}
          {item('Save All', 'Ctrl+Shift+S', onSaveAll, !hasSeries)}
          <div className="filemenu-sep" />
          <div
            className="filemenu-sub-container"
            onMouseEnter={() => setRecentHover(true)}
            onMouseLeave={() => setRecentHover(false)}
          >
            <div className={`filemenu-item has-sub${recentHover ? ' hovered' : ''}`}>
              <span>Recent Series</span>
              <span className="filemenu-arrow">›</span>
            </div>
            {recentHover && (
              <div className="filemenu-sub">
                {recent.length === 0 ? (
                  <div className="filemenu-item disabled"><span>No recent series</span></div>
                ) : (
                  recent.map(r => (
                    <button
                      key={r.path}
                      className="filemenu-item"
                      title={r.path}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { onOpenRecentSeries(r.path); close(); }}
                    >
                      <span className="filemenu-recent-title">{r.title}</span>
                      <span className="filemenu-recent-path">{r.path}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="filemenu-sep" />
          {item('Close Series', null, onCloseSeries, !hasSeries, true)}
        </div>
      )}
    </div>
  );
}
