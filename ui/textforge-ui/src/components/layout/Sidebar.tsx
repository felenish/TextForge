import { useEffect } from 'react';
import type { UseSeriesExplorerResult } from '../../hooks/useSeriesExplorer';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import type { SidebarMode } from './ActivityBar';
import { ManuscriptSidebar } from '../explorer/ManuscriptSidebar';
import { VersionsSidebar } from '../explorer/VersionsSidebar';
import { SearchSidebar } from '../explorer/SearchSidebar';

interface SidebarProps {
  mode: SidebarMode;
  explorer: UseSeriesExplorerResult;
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
  onCharacterOpen: (characterId: string, name: string) => void;
}

export function Sidebar({ mode, explorer, onSceneOpen, onCharacterOpen }: SidebarProps) {
  const { activeSceneId } = useWorkspace();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.key !== 'N') return;
      e.preventDefault();
      const { series } = explorer;
      if (!series) return;
      const activeBook = activeSceneId
        ? series.books.find(b => b.chapters.some(c => c.scenes.some(s => s.id === activeSceneId)))
        : series.books[0];
      if (!activeBook) return;
      const chapter = activeSceneId
        ? activeBook.chapters.find(c => c.scenes.some(s => s.id === activeSceneId))
        : activeBook.chapters[0];
      if (!chapter) return;
      const title = window.prompt('New scene title:');
      if (title?.trim()) explorer.addScene(activeBook.id, chapter.id, title.trim());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [explorer, activeSceneId]);

  return (
    <aside className="sidebar">
      {mode === 'manuscript' && (
        <ManuscriptSidebar {...explorer} onSceneOpen={onSceneOpen} onCharacterOpen={onCharacterOpen} />
      )}
      {mode === 'versions' && <VersionsSidebar />}
      {mode === 'search' && (
        <SearchSidebar series={explorer.series} onSceneOpen={onSceneOpen} />
      )}
    </aside>
  );
}
