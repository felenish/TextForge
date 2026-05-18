import { useWorkspace } from '../../contexts/WorkspaceContext';

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
    <div style={{
      display: 'flex',
      height: '35px',
      background: '#2d2d2d',
      borderBottom: '1px solid #333',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === activeId;
        const isDirty = dirtySceneIds.has(tab.id);
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px 0 12px',
              gap: '6px',
              cursor: 'pointer',
              background: isActive ? '#1e1e1e' : 'transparent',
              borderRight: '1px solid #333',
              borderTop: isActive ? '2px solid #007acc' : '2px solid transparent',
              minWidth: '100px',
              maxWidth: '180px',
              flexShrink: 0,
              color: isActive ? '#ccc' : '#888',
              fontSize: '13px',
              userSelect: 'none',
            }}
          >
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {isDirty && (
                <span style={{ color: '#e5c07b', marginRight: '3px' }}>●</span>
              )}
              {tab.title}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onClose(tab.id); }}
              title="Close"
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
