import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';

const MENU_ITEMS = ['File', 'Edit', 'Manuscript', 'Version', 'View', 'Help'];

interface MenuBarProps {
  focusMode: boolean;
  onFocusToggle: () => void;
  onPaletteOpen: () => void;
}

export function MenuBar({ focusMode, onFocusToggle, onPaletteOpen }: MenuBarProps) {
  const { theme, cycleTheme } = useWorkspace();
  const themeIcon = theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'feather';

  return (
    <div className="menubar">
      <nav className="mb-menu">
        {MENU_ITEMS.map(m => <button key={m}>{m}</button>)}
      </nav>
      <div className="mb-actions">
        <button onClick={onPaletteOpen} title="Command Palette (Ctrl+P)">
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
