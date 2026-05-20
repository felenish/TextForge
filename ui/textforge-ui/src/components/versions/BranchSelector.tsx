import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import type { BranchDto } from '../../api/versions';

interface Props {
  current: string;
  branches: BranchDto[];
  onSwitch: (name: string) => Promise<void>;
  onCreate: (name: string) => Promise<void>;
}

export function BranchSelector({ current, branches, onSwitch, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    }
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleSwitch(name: string) {
    if (name !== current) await onSwitch(name);
    setOpen(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreate(newName.trim());
    setNewName('');
    setCreating(false);
    setOpen(false);
  }

  return (
    <div className="vs-branch-wrap" ref={wrapRef}>
      <button className="versions-branch-bar" onClick={() => setOpen(v => !v)}>
        <span className="br-icon"><Icon name="branch" size={13} /></span>
        <span className="br-name">{current || '…'}</span>
        <span className="br-chev"><Icon name="chev-down" size={11} /></span>
      </button>
      {open && (
        <div className="vs-branch-drop">
          {branches.map(b => (
            <button
              key={b.name}
              className={`vs-branch-item ${b.isCurrent ? 'current' : ''}`}
              onClick={() => void handleSwitch(b.name)}
            >
              <Icon name="branch" size={12} />
              <span>{b.name}</span>
              {b.isCurrent && <span className="vs-branch-tag">current</span>}
            </button>
          ))}
          <div className="vs-branch-sep" />
          {creating ? (
            <form className="vs-branch-new" onSubmit={e => void handleCreate(e)}>
              <input
                className="vs-branch-input"
                placeholder="Branch name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="vs-btn primary" disabled={!newName.trim()}>
                Create
              </button>
              <button type="button" className="vs-icon-btn" onClick={() => setCreating(false)}>
                <Icon name="x" size={12} />
              </button>
            </form>
          ) : (
            <button className="vs-branch-item" onClick={() => setCreating(true)}>
              <Icon name="plus" size={12} />
              <span>New branch…</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
