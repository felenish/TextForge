import { useState } from 'react';
import { useBookExplorer } from '../../hooks/useBookExplorer';
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

  const [emptyMenu, setEmptyMenu] = useState<{ x: number; y: number } | null>(null);

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
      {/* Header */}
      <div style={{
        padding: '8px 10px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#bbb',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        Explorer
        {book && (
          <button
            title="Add Chapter"
            onClick={handleAddChapter}
            style={{
              background: 'none', border: 'none', color: '#bbb',
              cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px',
            }}
          >
            +
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: '#5a1e1e', color: '#f48771', fontSize: '12px',
          padding: '6px 10px', borderBottom: '1px solid #7a3f3f',
        }}>
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div style={{ color: '#888', fontSize: '12px', padding: '4px 10px' }}>
          Loading…
        </div>
      )}

      {/* Empty state */}
      {!book && !loading && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#666', fontSize: '13px', gap: '10px', padding: '16px',
          textAlign: 'center',
        }}>
          <span>No book open — create or open a book</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={createBook}
              style={{
                padding: '5px 12px', background: '#0e639c', color: '#fff',
                border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px',
              }}
            >
              New Book
            </button>
            <button
              onClick={openBook}
              style={{
                padding: '5px 12px', background: '#3c3c3c', color: '#d4d4d4',
                border: '1px solid #555', borderRadius: '3px', cursor: 'pointer', fontSize: '12px',
              }}
            >
              Open Book
            </button>
          </div>
        </div>
      )}

      {/* Book title */}
      {book && (
        <div style={{
          padding: '6px 10px', fontSize: '12px', color: '#9cdcfe',
          borderBottom: '1px solid #2a2a2a', fontWeight: 500,
        }}>
          {book.title}
        </div>
      )}

      {/* Chapter / scene tree */}
      {book && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {book.chapters.length === 0 && (
            <div style={{ color: '#555', fontSize: '12px', padding: '10px' }}>
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
