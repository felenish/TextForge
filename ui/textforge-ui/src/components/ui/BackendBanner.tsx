interface Props {
  onDismiss: () => void;
}

export function BackendBanner({ onDismiss }: Props) {
  return (
    <div className="backend-banner">
      <span className="backend-banner-msg">
        Cannot connect to the TextForge backend. Try restarting the app.
      </span>
      <button className="update-banner-btn dismiss" onClick={onDismiss} title="Dismiss">
        ✕
      </button>
    </div>
  );
}
