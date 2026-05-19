import { useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';
import * as windowApi from '../../api/window';

export function TitleBar() {
  const { seriesTitle, dirtySceneIds } = useWorkspace();
  const hasUnsaved = dirtySceneIds.size > 0;
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => windowApi.minimizeWindow().catch(() => {});
  const handleToggleMaximize = () => {
    windowApi.maximizeWindow().catch(() => {});
    setIsMaximized(m => !m);
  };
  const handleClose = () => windowApi.closeWindow().catch(() => {});

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.tb-wc')) return;
    handleToggleMaximize();
  };

  return (
    <div className="titlebar" onDoubleClick={handleDoubleClick}>
      <div className="tb-brand">
        <Icon name="feather" size={13} stroke={1.5} />
        <span>TextForge Studio</span>
        <span className="tb-version">v0.1</span>
      </div>
      <div className="tb-title">
        {seriesTitle ? (
          <>
            {hasUnsaved && <span className="dirty">● </span>}
            <span className="accent">{seriesTitle}</span>
          </>
        ) : null}
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
