import { Icon } from '../ui/Icon';

export function VersionsSidebar() {
  return (
    <>
      <div className="sb-header">
        <span>Version History</span>
        <div className="actions">
          <button title="New Snapshot"><Icon name="plus" size={14} /></button>
          <button title="Filter"><Icon name="filter" size={13} /></button>
          <button title="More"><Icon name="more" size={14} /></button>
        </div>
      </div>
      <div className="versions-branch-bar">
        <span className="br-icon"><Icon name="branch" size={13} /></span>
        <span className="br-name">main</span>
        <span className="br-chev"><Icon name="chev-down" size={11} /></span>
      </div>
      <div className="sb-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px 16px' }}>
        <Icon name="history" size={28} stroke={1} style={{ color: 'var(--text-faint)', opacity: 0.5 }} />
        <span style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center' }}>
          No snapshots yet
        </span>
      </div>
      <div className="sb-footer">
        <span><span className="num">0</span> snapshots</span>
        <span>main</span>
      </div>
    </>
  );
}
