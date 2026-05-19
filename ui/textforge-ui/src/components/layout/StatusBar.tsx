import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';

interface StatusBarProps {
  focusMode: boolean;
  onFocusToggle: () => void;
  typewriterMode: boolean;
  onTypewriterToggle: () => void;
  panelOpen: boolean;
  onPanelToggle: () => void;
}

export function StatusBar({
  focusMode, onFocusToggle,
  typewriterMode, onTypewriterToggle,
  panelOpen, onPanelToggle,
}: StatusBarProps) {
  const { dirtySceneIds, wordCount, theme } = useWorkspace();
  const hasDirty = dirtySceneIds.size > 0;
  const readingTime = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : 0;

  return (
    <div className="statusbar">
      <div className="sb-item">
        <Icon name="branch" size={12} />
        <span>main</span>
      </div>
      <div className="sb-item">
        <div className="dot" style={{ background: hasDirty ? 'var(--signal-warn)' : 'var(--status-final)' }} />
        <span>{hasDirty ? 'Unsaved' : 'Saved'}</span>
      </div>
      <div className="sb-item">
        <span>v0001</span>
      </div>
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
        onClick={onTypewriterToggle}
        style={{ color: typewriterMode ? 'var(--accent)' : undefined }}
        title="Typewriter Mode"
      >
        <Icon name="type" size={12} />
        <span>TW</span>
      </div>
      <div className="sb-item" title="Command Palette">
        <Icon name="command" size={12} />
        <span>⌘K</span>
      </div>
      <div className="sb-item accent">
        <span>{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
      </div>
    </div>
  );
}
