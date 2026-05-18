import { useState } from 'react';
import { Icon } from '../ui/Icon';

export function CharactersSidebar() {
  const [search, setSearch] = useState('');

  return (
    <>
      <div className="sb-header">
        <span>Characters</span>
        <div className="actions">
          <button title="New Character"><Icon name="plus" size={14} /></button>
          <button title="Filter"><Icon name="filter" size={13} /></button>
          <button title="More"><Icon name="more" size={14} /></button>
        </div>
      </div>
      <div className="sb-search">
        <Icon name="search" size={12} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter characters…"
        />
      </div>
      <div className="sb-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px 16px' }}>
        <Icon name="users" size={28} stroke={1} style={{ color: 'var(--text-faint)', opacity: 0.5 }} />
        <span style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center' }}>
          No characters yet
        </span>
      </div>
      <div className="sb-footer">
        <span><span className="num">0</span> characters</span>
      </div>
    </>
  );
}
