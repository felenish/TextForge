import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';
import { FileMenu } from '../ui/FileMenu';
import { EditMenu } from '../ui/EditMenu';
import { ManuscriptMenu } from '../ui/ManuscriptMenu';
import { HelpMenu } from '../ui/HelpMenu';
import { ViewMenu } from '../ui/ViewMenu';
import { VersionMenu } from '../ui/VersionMenu';

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
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenLogFolder: () => void;
  onAbout: () => void;
  bottomOpen: boolean;
  onBottomToggle: () => void;
  onViewHistory: () => void;
}

export function MenuBar({
  focusMode, onFocusToggle, onPaletteOpen,
  onOpenSeries, onCreateSeries, onSave, onSaveAll, onOpenRecentSeries, onCloseSeries,
  onFind, onFindReplace, onOpenSettings, onOpenHelp, onOpenLogFolder, onAbout,
  bottomOpen, onBottomToggle, onViewHistory,
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
        <ManuscriptMenu hasSeries={!!seriesTitle} />
        <VersionMenu hasSeries={!!seriesTitle} onViewHistory={onViewHistory} />
        <ViewMenu
          focusMode={focusMode}
          onFocusToggle={onFocusToggle}
          bottomOpen={bottomOpen}
          onBottomToggle={onBottomToggle}
          onPaletteOpen={onPaletteOpen}
        />
        <HelpMenu
          onOpenSettings={onOpenSettings}
          onOpenHelp={onOpenHelp}
          onOpenLogFolder={onOpenLogFolder}
          onAbout={onAbout}
        />
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
