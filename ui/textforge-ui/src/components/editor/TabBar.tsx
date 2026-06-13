import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';

export interface Tab {
  id: string;
  title: string;
  kind: 'scene' | 'character' | 'location' | 'outline' | 'plotgrid' | 'help' | 'module';
  /** Module id — only set when kind === 'module'. */
  moduleId?: string;
  /** Stable board instance id — only set when kind === 'module'. */
  boardId?: string;
  /** User-facing board name — only set when kind === 'module'. */
  boardName?: string;
  /** Resolved asset URL for the module entry point — only set when kind === 'module'. */
  entryPoint?: string;
  /** Version stored in book.tfbook at last save — only set when kind === 'module'. */
  previousVersion?: string | null;
  /** Installed module version — only set when kind === 'module'. */
  currentVersion?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeId, onSelect, onClose }: TabBarProps) {
  const { dirtySceneIds } = useWorkspace();

  return (
    <div className="tabs">
      {tabs.map(tab => {
        const isActive = tab.id === activeId;
        const isDirty = tab.kind === 'scene' && dirtySceneIds.has(tab.id);
        return (
          <div
            key={tab.id}
            className={`tab${isActive ? ' active' : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            <span className="tab-icon">
              <Icon name={tab.kind === 'character' ? 'user' : tab.kind === 'location' ? 'map-pin' : tab.kind === 'outline' ? 'list' : tab.kind === 'plotgrid' ? 'layout-grid' : tab.kind === 'help' ? 'help-circle' : tab.kind === 'module' ? 'puzzle' : 'scene'} size={13} stroke={1.5} />
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {tab.title}
            </span>
            {isDirty ? (
              <span className="tab-dirty" />
            ) : (
              <button
                className="tab-close"
                onClick={e => { e.stopPropagation(); onClose(tab.id); }}
                title="Close"
              >
                <Icon name="x" size={12} stroke={2} />
              </button>
            )}
          </div>
        );
      })}
      <div className="tab-spacer" />
    </div>
  );
}
