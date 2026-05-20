import type { SnapshotSummaryDto } from '../../api/versions';
import { Icon } from '../ui/Icon';

interface Props {
  snapshot: SnapshotSummaryDto;
  isLast: boolean;
  onViewDetails: () => void;
  onRestore: () => void;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function SnapshotCard({ snapshot, isLast, onViewDetails, onRestore }: Props) {
  return (
    <div className={`commit-row vs-card ${isLast ? 'last' : ''}`}>
      <div className="commit-rail">
        <span className="commit-dot" />
      </div>
      <div className="commit-body" onClick={onViewDetails} style={{ cursor: 'pointer' }}>
        <div className="commit-msg">{snapshot.label}</div>
        <div className="commit-meta">
          <span>{formatRelative(snapshot.timestampUtc)}</span>
          <span>{snapshot.sceneCount} scene{snapshot.sceneCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="vs-card-actions">
        <button className="vs-icon-btn" title="View details" onClick={onViewDetails}>
          <Icon name="info" size={13} />
        </button>
        <button className="vs-icon-btn" title="Restore" onClick={onRestore}>
          <Icon name="history" size={13} />
        </button>
      </div>
    </div>
  );
}
