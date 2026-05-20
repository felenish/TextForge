import { useEffect, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';
import { getVersionStatus } from '../../api/versions';

interface StatusBarProps {
  focusMode: boolean;
  onFocusToggle: () => void;
  panelOpen: boolean;
  onPanelToggle: () => void;
  onTweaksToggle: () => void;
}

export function StatusBar({
  focusMode, onFocusToggle,
  panelOpen, onPanelToggle,
  onTweaksToggle,
}: StatusBarProps) {
  const { dirtySceneIds, wordCount, theme, typewriterMode, setTypewriterMode } = useWorkspace();
  const hasDirty = dirtySceneIds.size > 0;
  const readingTime = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : 0;

  const [branch, setBranch] = useState('main');
  const [snapshotRef, setSnapshotRef] = useState<string | null>(null);

  useEffect(() => {
    getVersionStatus()
      .then(s => {
        setBranch(s.branch);
        setSnapshotRef(s.latestSnapshot ? `#${s.latestSnapshot.id.slice(0, 7)}` : null);
      })
      .catch(() => {});

    function onBranchChange() {
      getVersionStatus()
        .then(s => { setBranch(s.branch); setSnapshotRef(s.latestSnapshot ? `#${s.latestSnapshot.id.slice(0, 7)}` : null); })
        .catch(() => {});
    }
    window.addEventListener('tf:branch-switched', onBranchChange);
    window.addEventListener('tf:snapshot-taken', onBranchChange);
    return () => {
      window.removeEventListener('tf:branch-switched', onBranchChange);
      window.removeEventListener('tf:snapshot-taken', onBranchChange);
    };
  }, []);

  return (
    <div className="statusbar">
      <div className="sb-item">
        <Icon name="branch" size={12} />
        <span>{branch}</span>
      </div>
      <div className="sb-item">
        <div className="dot" style={{ background: hasDirty ? 'var(--signal-warn)' : 'var(--status-final)' }} />
        <span>{hasDirty ? 'Unsaved' : 'Saved'}</span>
      </div>
      {snapshotRef && (
        <div className="sb-item" style={{ color: 'var(--text-faint)' }}>
          <span>{snapshotRef}</span>
        </div>
      )}
      <div className="spacer" />
      {wordCount > 0 && (
        <div
          className="sb-item"
          onClick={onPanelToggle}
          title="Word Count panel"
          style={{ color: panelOpen ? 'var(--accent)' : undefined }}
        >
          <span>{wordCount.toLocaleString()} words</span>
          {readingTime > 0 && <span style={{ color: 'var(--text-faint)' }}>· {readingTime} min</span>}
        </div>
      )}
      <div
        className="sb-item"
        onClick={onPanelToggle}
        title="Toggle bottom panel"
        style={{ color: panelOpen ? 'var(--accent)' : undefined }}
      >
        <Icon name="panel-right" size={12} />
      </div>
      <div
        className="sb-item"
        onClick={onFocusToggle}
        style={{ color: focusMode ? 'var(--accent)' : undefined }}
        title="Focus Mode (F11)"
      >
        <Icon name="focus" size={12} />
        <span>Focus</span>
      </div>
      <div
        className="sb-item"
        onClick={() => setTypewriterMode(!typewriterMode)}
        style={{ color: typewriterMode ? 'var(--accent)' : undefined }}
        title="Typewriter Mode"
      >
        <Icon name="type" size={12} />
        <span>TW</span>
      </div>
      <div
        className="sb-item"
        title="Command Palette (Ctrl+K)"
        onClick={() => {
          const ev = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
          window.dispatchEvent(ev);
        }}
      >
        <Icon name="command" size={12} />
        <span>⌘K</span>
      </div>
      <div
        className="sb-item accent"
        onClick={onTweaksToggle}
        title="Tweaks"
        style={{ cursor: 'pointer' }}
      >
        <span>{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
      </div>
    </div>
  );
}
