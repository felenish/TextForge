import { useEffect, useState } from 'react';
import { getSceneAtSnapshot, restoreScene } from '../../api/versions';
import type { SceneAtSnapshotDto } from '../../api/versions';
import { Icon } from '../ui/Icon';
import { useToast } from '../../contexts/ToastContext';

interface Props {
  sceneId: string;
  sceneTitle: string;
  snapshotId: string;
  snapshotLabel: string;
  onClose: () => void;
}

export function ScenePreviewModal({ sceneId, sceneTitle, snapshotId, snapshotLabel, onClose }: Props) {
  const { showToast } = useToast();
  const [data, setData] = useState<SceneAtSnapshotDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  async function handleRestore() {
    setRestoring(true);
    try {
      await restoreScene(sceneId, snapshotId);
      window.dispatchEvent(new CustomEvent('tf:scene-restored', { detail: { sceneId } }));
      showToast(`"${sceneTitle}" restored to snapshot "${snapshotLabel}".`);
      onClose();
    } catch (err: unknown) {
      showToast((err as { message?: string })?.message ?? 'Restore failed.');
    } finally {
      setRestoring(false);
    }
  }

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
        {data?.content && (
          <div className="vs-modal-footer">
            {confirmRestore ? (
              <>
                <span className="vs-modal-confirm-text">Replace current content with this version?</span>
                <button className="vs-btn secondary" onClick={() => setConfirmRestore(false)}>Cancel</button>
                <button className="vs-btn danger" onClick={() => void handleRestore()} disabled={restoring}>
                  {restoring ? 'Restoring…' : 'Restore'}
                </button>
              </>
            ) : (
              <button className="vs-btn danger-outline" onClick={() => setConfirmRestore(true)}>
                <Icon name="history" size={13} /> Restore this scene
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
