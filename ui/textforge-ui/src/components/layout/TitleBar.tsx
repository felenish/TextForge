import { useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';
import * as windowApi from '../../api/window';

interface TitleBarProps {
  focusMode: boolean;
  onFocusToggle: () => void;
}

const MENU_ITEMS = ['File', 'Edit', 'Manuscript', 'Version', 'View', 'Help'];

export function TitleBar({ focusMode, onFocusToggle }: TitleBarProps) {
  const { seriesTitle, dirtySceneIds, theme, cycleTheme } = useWorkspace();
  const hasUnsaved = dirtySceneIds.size > 0;
  const themeIcon = theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'feather';

  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => windowApi.minimizeWindow().catch(() => {});
  const handleToggleMaximize = () => {
    windowApi.maximizeWindow().catch(() => {});
    setIsMaximized(m => !m);
  };
  const handleClose = () => windowApi.closeWindow().catch(() => {});

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.tb-menu, .tb-actions, .tb-wc')) return;
    handleToggleMaximize();
  };

  return (
    <div className="titlebar" onDoubleClick={handleDoubleClick}>
      <div className="tb-brand">
        <Icon name="feather" size={13} stroke={1.5} />
        <span>TextForge Studio</span>
        <span className="tb-version">v0.1</span>
      </div>
      <nav className="tb-menu">
        {MENU_ITEMS.map(m => <button key={m}>{m}</button>)}
      </nav>
      <div className="tb-title">
        {seriesTitle ? (
          <>
            {hasUnsaved && <span className="dirty">● </span>}
            <span className="accent">{seriesTitle}</span>
          </>
        ) : null}
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
      <div className="tb-wc">
        <button className="wc-min" onClick={handleMinimize} title="Minimize">
          <Icon name="minus" size={10} stroke={2} />
        </button>
        <button className="wc-max" onClick={handleToggleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
          <Icon name={isMaximized ? 'win-restore' : 'win-maximize'} size={10} />
        </button>
        <button className="wc-close" onClick={handleClose} title="Close">
          <Icon name="x" size={10} stroke={2} />
        </button>
      </div>
    </div>
  );
}
