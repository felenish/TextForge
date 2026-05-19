import { useEffect } from 'react';
import { useBookExplorer } from '../../hooks/useBookExplorer';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import type { SidebarMode } from './ActivityBar';
import { ManuscriptSidebar } from '../explorer/ManuscriptSidebar';
import { CharactersSidebar } from '../explorer/CharactersSidebar';
import { VersionsSidebar } from '../explorer/VersionsSidebar';
import { SearchSidebar } from '../explorer/SearchSidebar';

interface SidebarProps {
  mode: SidebarMode;
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
}

export function Sidebar({ mode, onSceneOpen }: SidebarProps) {
  const explorer = useBookExplorer();
  const { setBook } = useWorkspace();

  useEffect(() => {
    setBook(explorer.book ?? null);
  }, [explorer.book, setBook]);

  return (
    <aside className="sidebar">
      {mode === 'manuscript' && (
        <ManuscriptSidebar {...explorer} onSceneOpen={onSceneOpen} />
      )}
      {mode === 'characters' && <CharactersSidebar />}
      {mode === 'versions' && <VersionsSidebar />}
      {mode === 'search' && (
        <SearchSidebar book={explorer.book} onSceneOpen={onSceneOpen} />
      )}
    </aside>
  );
}
