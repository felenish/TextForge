import { useEffect, useState } from 'react';
import { useBookExplorer } from '../../hooks/useBookExplorer';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { ContextMenu, type ContextMenuItem } from '../ui/ContextMenu';
import { ChapterNode } from './ChapterNode';

interface BookExplorerProps {
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
}

export function BookExplorer({ onSceneOpen }: BookExplorerProps) {
  const {
    book, loading, error,
    createBook, openBook,
    addChapter, renameChapter, deleteChapter,
    addScene, renameScene, deleteScene,
  } = useBookExplorer();
  const { setBookTitle } = useWorkspace();

  useEffect(() => {
    setBookTitle(book?.title ?? null);
  }, [book?.title, setBookTitle]);

  const [emptyMenu, setEmptyMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N')) return;
      e.preventDefault();
      if (!book || book.chapters.length === 0) return;
      let chapterId = book.chapters[0].id;
      if (book.chapters.length > 1) {
        const list = book.chapters.map((c, i) => `${i + 1}. ${c.title}`).join('\n');
        const input = window.prompt(`Select chapter:\n${list}`, '1');
        const idx = parseInt(input ?? '', 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= book.chapters.length) return;
        chapterId = book.chapters[idx].id;
      }
      const title = window.prompt('Scene title:');
      if (title?.trim()) addScene(chapterId, title.trim());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [book, addScene]);

  const emptyAreaMenuItems: ContextMenuItem[] = [
    { label: 'New Book', onClick: createBook },
    { label: 'Open Book', onClick: openBook },
  ];

  const handleAddChapter = () => {
    const title = window.prompt('Chapter title:');
    if (title?.trim()) addChapter(title.trim());
  };

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      onContextMenu={e => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          setEmptyMenu({ x: e.clientX, y: e.clientY });
        }
      }}
    >
      <div className="sb-header">
        <span>Explorer</span>
        {book && (
          <div className="actions">
            <button title="Add Chapter" onClick={handleAddChapter}>+</button>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: 'var(--signal-error)', color: 'var(--text-strong)',
          fontSize: 'var(--fs-mono-sm)', padding: '6px 12px', flexShrink: 0, opacity: 0.85,
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ color: 'var(--text-faint)', fontSize: 'var(--fs-mono-sm)', padding: '6px 12px' }}>
          Loading…
        </div>
      )}

      {!book && !loading && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', fontSize: 'var(--fs-mono-sm)',
          gap: '12px', padding: '20px', textAlign: 'center',
        }}>
          <span>No book open</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={createBook}
              style={{
                padding: '5px 12px', background: 'var(--accent)', color: '#16140f',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontSize: 'var(--fs-mono-sm)', fontFamily: 'var(--font-mono)',
              }}
            >
              New Book
            </button>
            <button
              onClick={openBook}
              style={{
                padding: '5px 12px', background: 'var(--bg-editor)',
                color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontSize: 'var(--fs-mono-sm)', fontFamily: 'var(--font-mono)',
              }}
            >
              Open Book
            </button>
          </div>
        </div>
      )}

      {book && (
        <div style={{
          padding: '6px 12px', fontSize: 'var(--fs-mono-sm)',
          color: 'var(--accent)', borderBottom: '1px solid var(--border-subtle)',
          fontWeight: 500, flexShrink: 0,
        }}>
          {book.title}
        </div>
      )}

      {book && (
        <div className="sb-body">
          {book.chapters.length === 0 && (
            <div style={{ color: 'var(--text-faint)', fontSize: 'var(--fs-mono-sm)', padding: '10px 12px' }}>
              No chapters yet — right-click to add one
            </div>
          )}
          {book.chapters.map(chapter => (
            <ChapterNode
              key={chapter.id}
              chapter={chapter}
              onAddScene={addScene}
              onRenameChapter={renameChapter}
              onDeleteChapter={deleteChapter}
              onSceneOpen={onSceneOpen}
              onRenameScene={renameScene}
              onDeleteScene={deleteScene}
            />
          ))}
        </div>
      )}

      {emptyMenu && (
        <ContextMenu
          items={emptyAreaMenuItems}
          position={emptyMenu}
          onClose={() => setEmptyMenu(null)}
        />
      )}
    </div>
  );
}
