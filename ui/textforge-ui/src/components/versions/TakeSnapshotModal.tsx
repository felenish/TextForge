import { useEffect, useState } from 'react';
import { takeSnapshot } from '../../api/versions';
import { useToast } from '../../contexts/ToastContext';
import { Icon } from '../ui/Icon';
import { TakeSnapshotForm } from './TakeSnapshotForm';

interface Props {
  onClose: () => void;
  onTaken?: () => void;
}

export function TakeSnapshotModal({ onClose, onTaken }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(label: string, message: string) {
    setSubmitting(true);
    try {
      await takeSnapshot(label, message);
      showToast(`Snapshot "${label}" saved.`);
      onTaken?.();
      onClose();
    } catch (err: unknown) {
      showToast((err as { message?: string })?.message ?? 'Failed to take snapshot.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="vs-modal-overlay" onMouseDown={onClose}>
      <div className="vs-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="vs-modal-header">
          <div className="vs-modal-title">Take Snapshot</div>
          <button className="vs-icon-btn" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="vs-modal-body">
          <TakeSnapshotForm
            onSubmit={(label, message) => void handleSubmit(label, message)}
            onCancel={onClose}
            isSubmitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}
