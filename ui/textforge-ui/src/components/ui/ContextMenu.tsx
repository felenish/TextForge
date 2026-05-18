import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  kbd?: string;
  onClick: () => void;
  danger?: boolean;
}

export interface ContextMenuSeparator {
  type: 'separator';
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface ContextMenuProps {
  items: ContextMenuEntry[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mouseHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', mouseHandler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', mouseHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((entry, i) => {
        if ('type' in entry)
          return <div key={i} className="ctx-sep" />;
        return (
          <div
            key={entry.label}
            className={`ctx-item${entry.danger ? ' danger' : ''}`}
            onClick={() => { entry.onClick(); onClose(); }}
          >
            {entry.icon && <span className="icon">{entry.icon}</span>}
            <span>{entry.label}</span>
            {entry.kbd && <span className="kbd">{entry.kbd}</span>}
          </div>
        );
      })}
    </div>
  );
}
