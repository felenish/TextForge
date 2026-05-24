import { useEffect, useState } from 'react';
import { getVersion } from '../../api/workspace';
import { openUrl } from '../../lib/webview';
import { Icon } from './Icon';

const REPO_URL = 'https://github.com/felenish/TextForge';

interface Props {
  onClose: () => void;
}

export function AboutModal({ onClose }: Props) {
  const [version, setVersion] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    getVersion().then(v => setVersion(v)).catch(() => {});
  }, []);

  return (
    <div className="vs-modal-overlay" onMouseDown={onClose}>
      <div className="vs-modal about-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="vs-modal-header">
          <div className="vs-modal-title">About</div>
          <button className="vs-icon-btn" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="about-body">
          <div className="about-icon">
            <Icon name="feather" size={36} stroke={1.5} />
          </div>
          <div className="about-name">TextForge Studio</div>
          {version && <div className="about-version">{version}</div>}
          <div className="about-copy">© {new Date().getFullYear()} Scott Morgan</div>
          <button
            className="about-link"
            onClick={() => openUrl(REPO_URL)}
          >
            github.com/felenish/TextForge
          </button>
        </div>
      </div>
    </div>
  );
}
