import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';
import { FileMenu } from '../ui/FileMenu';
import { EditMenu } from '../ui/EditMenu';

interface MenuBarProps {
  focusMode: boolean;
  onFocusToggle: () => void;
  onPaletteOpen: () => void;
  onOpenSeries: () => void;
  onCreateSeries: () => void;
  onSave: () => void;
  onSaveAll: () => void;
  onOpenRecentSeries: (path: string) => void;
  onCloseSeries: () => void;
  onFind: () => void;
  onFindReplace: () => void;
}

export function MenuBar({
  focusMode, onFocusToggle, onPaletteOpen,
  onOpenSeries, onCreateSeries, onSave, onSaveAll, onOpenRecentSeries, onCloseSeries,
  onFind, onFindReplace,
}: MenuBarProps) {
  const { theme, cycleTheme, seriesTitle } = useWorkspace();
  const themeIcon = theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'feather';

  return (
    <div className="menubar">
      <nav className="mb-menu">
        <FileMenu
          hasSeries={!!seriesTitle}
          onOpenSeries={onOpenSeries}
          onCreateSeries={onCreateSeries}
          onSave={onSave}
          onSaveAll={onSaveAll}
          onOpenRecentSeries={onOpenRecentSeries}
          onCloseSeries={onCloseSeries}
        />
        <EditMenu onFind={onFind} onFindReplace={onFindReplace} />
        {['Manuscript', 'Version', 'View', 'Help'].map(m => (
          <button key={m} className="mb-menu-btn">{m}</button>
        ))}
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
