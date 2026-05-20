import { useState } from 'react';

interface Props {
  onSubmit: (label: string, message: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function TakeSnapshotForm({ onSubmit, onCancel, isSubmitting }: Props) {
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    onSubmit(label.trim(), message.trim());
  }

  return (
    <form className="vs-form" onSubmit={handleSubmit}>
      <div className="vs-form-title">New Snapshot</div>
      <input
        className="vs-form-input"
        placeholder="Label (required)"
        value={label}
        onChange={e => setLabel(e.target.value)}
        autoFocus
        disabled={isSubmitting}
      />
      <textarea
        className="vs-form-msg"
        placeholder="Description (optional)"
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        disabled={isSubmitting}
      />
      <div className="vs-form-actions">
        <button type="button" className="vs-btn secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="vs-btn primary" disabled={!label.trim() || isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Take Snapshot'}
        </button>
      </div>
    </form>
  );
}
