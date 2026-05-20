import { useEffect, useState } from 'react';
import { getSceneAtSnapshot } from '../../api/versions';
import type { SceneAtSnapshotDto } from '../../api/versions';
import { Icon } from '../ui/Icon';

interface Props {
  sceneId: string;
  sceneTitle: string;
  snapshotId: string;
  snapshotLabel: string;
  onClose: () => void;
}

export function ScenePreviewModal({ sceneId, sceneTitle, snapshotId, snapshotLabel, onClose }: Props) {
  const [data, setData] = useState<SceneAtSnapshotDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    getSceneAtSnapshot(sceneId, snapshotId)
      .then(setData)
      .catch((err: unknown) => {
        setError((err as { message?: string })?.message ?? 'Failed to load content.');
      });
  }, [sceneId, snapshotId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="vs-modal-overlay" onMouseDown={onClose}>
      <div className="vs-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="vs-modal-header">
          <div className="vs-modal-title">
            <span>{sceneTitle}</span>
            <span className="vs-modal-at">@ {snapshotLabel}</span>
          </div>
          <button className="vs-icon-btn" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="vs-modal-body">
          {error && <div className="vs-modal-msg error">{error}</div>}
          {!error && !data && <div className="vs-modal-msg">Loading…</div>}
          {data && (
            data.content
              ? <pre className="vs-modal-content">{data.content}</pre>
              : <div className="vs-modal-msg">No content recorded at this snapshot.</div>
          )}
        </div>
      </div>
    </div>
  );
}
