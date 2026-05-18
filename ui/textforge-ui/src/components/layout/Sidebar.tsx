import { BookExplorer } from '../explorer/BookExplorer';

interface SidebarProps {
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
}

export function Sidebar({ onSceneOpen }: SidebarProps) {
  return (
    <aside style={{
      width: '240px',
      minWidth: '180px',
      borderRight: '1px solid #333',
      overflow: 'hidden',
      background: '#252526',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <BookExplorer onSceneOpen={onSceneOpen} />
    </aside>
  );
}
