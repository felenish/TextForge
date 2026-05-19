import { Icon } from '../ui/Icon';

export type SidebarMode = 'manuscript' | 'versions' | 'search';

interface ActivityBarProps {
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
  dirtyCount?: number;
}

const MODES: { id: SidebarMode; icon: string; title: string }[] = [
  { id: 'manuscript', icon: 'book', title: 'Manuscript' },
  { id: 'versions', icon: 'git', title: 'Versions' },
  { id: 'search', icon: 'search', title: 'Search' },
];

export function ActivityBar({ mode, onModeChange, dirtyCount = 0 }: ActivityBarProps) {
  return (
    <div className="activity">
      {MODES.map(m => (
        <button
          key={m.id}
          className={`act-btn${mode === m.id ? ' active' : ''}`}
          onClick={() => onModeChange(m.id)}
          title={m.title}
        >
          <Icon name={m.icon} size={20} stroke={1.5} />
          {m.id === 'manuscript' && dirtyCount > 0 && (
            <span className="badge">{dirtyCount}</span>
          )}
        </button>
      ))}
      <div className="spacer" />
      <button className="act-btn" title="Settings">
        <Icon name="settings" size={20} stroke={1.5} />
      </button>
    </div>
  );
}
