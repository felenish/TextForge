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
  const { setBook, activeSceneId } = useWorkspace();

  useEffect(() => {
    setBook(explorer.book ?? null);
  }, [explorer.book, setBook]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.key !== 'N') return;
      e.preventDefault();
      const book = explorer.book;
      if (!book) return;
      const chapter = activeSceneId
        ? book.chapters.find(c => c.scenes.some(s => s.id === activeSceneId))
        : book.chapters[0];
      if (!chapter) return;
      const title = window.prompt('New scene title:');
      if (title?.trim()) explorer.addScene(chapter.id, title.trim());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [explorer, activeSceneId]);

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
