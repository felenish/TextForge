import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';

interface TitleBarProps {
  focusMode: boolean;
  onFocusToggle: () => void;
}

const MENU_ITEMS = ['File', 'Edit', 'Manuscript', 'Version', 'View', 'Help'];

export function TitleBar({ focusMode, onFocusToggle }: TitleBarProps) {
  const { bookTitle, dirtySceneIds, theme, cycleTheme } = useWorkspace();
  const hasUnsaved = dirtySceneIds.size > 0;
  const themeIcon = theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'feather';

  return (
    <div className="titlebar">
      <div className="tb-dots">
        <div className="tb-dot r" />
        <div className="tb-dot y" />
        <div className="tb-dot g" />
      </div>
      <nav className="tb-menu">
        {MENU_ITEMS.map(m => <button key={m}>{m}</button>)}
      </nav>
      <div className="tb-title">
        {bookTitle ? (
          <>
            {hasUnsaved && <span className="dirty">● </span>}
            <span className="accent">{bookTitle}</span>
          </>
        ) : (
          'TextForge Studio'
        )}
      </div>
      <div className="tb-actions">
        <button title="Command Palette (Ctrl+P)">
          <Icon name="command" size={14} />
        </button>
        <button
          className={focusMode ? 'active' : undefined}
          onClick={onFocusToggle}
          title="Focus Mode (F11)"
        >
          <Icon name="focus" size={14} />
        </button>
        <button onClick={cycleTheme} title={`Theme: ${theme}`}>
          <Icon name={themeIcon} size={14} />
        </button>
      </div>
    </div>
  );
}
