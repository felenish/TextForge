import { BookExplorer } from '../explorer/BookExplorer';

interface SidebarProps {
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
}

export function Sidebar({ onSceneOpen }: SidebarProps) {
  return (
    <aside className="sidebar">
      <BookExplorer onSceneOpen={onSceneOpen} />
    </aside>
  );
}
