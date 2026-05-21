type Phase = 'available' | 'working' | 'error';

interface Props {
  version: string;
  phase: Phase;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ version, phase, onUpdate, onDismiss }: Props) {
  return (
    <div className="update-banner">
      <span className="update-banner-msg">
        {phase === 'available' && `TextForge Studio ${version} is available.`}
        {phase === 'working'   && 'Saving and downloading update…'}
        {phase === 'error'     && 'Download failed. Try again later.'}
      </span>
      {phase === 'available' && (
        <button className="update-banner-btn primary" onClick={onUpdate}>
          Update now
        </button>
      )}
      {(phase === 'available' || phase === 'error') && (
        <button className="update-banner-btn dismiss" onClick={onDismiss} title="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

