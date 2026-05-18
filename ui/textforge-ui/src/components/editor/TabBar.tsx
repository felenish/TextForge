import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';

interface Tab {
  id: string;
  title: string;
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
        const isDirty = dirtySceneIds.has(tab.id);
        return (
          <div
            key={tab.id}
            className={`tab${isActive ? ' active' : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            <span className="tab-icon">
              <Icon name="scene" size={13} stroke={1.5} />
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
