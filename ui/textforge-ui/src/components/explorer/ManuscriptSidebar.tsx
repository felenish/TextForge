import { useState } from 'react';
import type { UseBookExplorerResult } from '../../hooks/useBookExplorer';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { ContextMenu, type ContextMenuEntry } from '../ui/ContextMenu';
import { Icon } from '../ui/Icon';
import * as shellApi from '../../api/shell';

interface ManuscriptSidebarProps extends UseBookExplorerResult {
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
}

export function ManuscriptSidebar({
  book, loading, error,
  createBook, openBook,
  addChapter, renameChapter, deleteChapter,
  addScene, renameScene, deleteScene,
  onSceneOpen,
}: ManuscriptSidebarProps) {
  const { dirtySceneIds } = useWorkspace();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuEntry[] } | null>(null);

  const isExpanded = (id: string) => expanded[id] !== false;

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    book?.chapters.forEach(c => { all[c.id] = false; });
    setExpanded(all);
  };

  const toggleChapter = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !isExpanded(id) }));

  const showMenu = (e: React.MouseEvent, items: ContextMenuEntry[]) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  const bookMenuItems = (): ContextMenuEntry[] => [
    { label: 'New Book', onClick: createBook },
    { label: 'Open Book', onClick: openBook },
  ];

  const chapterMenuItems = (chapterId: string, chapterTitle: string): ContextMenuEntry[] => [
    {
      label: 'Add Scene',
      onClick: () => {
        const t = window.prompt('Scene title:');
        if (t?.trim()) addScene(chapterId, t.trim());
      },
    },
    {
      label: 'Rename',
      onClick: () => {
        const t = window.prompt('New chapter title:', chapterTitle);
        if (t?.trim() && t !== chapterTitle) renameChapter(chapterId, t.trim());
      },
    },
    { type: 'separator' },
    {
      label: 'Delete Chapter',
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete "${chapterTitle}" and all its scenes?`)) deleteChapter(chapterId);
      },
    },
  ];

  const sceneMenuItems = (sceneId: string, sceneTitle: string): ContextMenuEntry[] => [
    { label: 'Open', onClick: () => onSceneOpen(sceneId, sceneTitle) },
    {
      label: 'Rename',
      onClick: () => {
        const t = window.prompt('New scene title:', sceneTitle);
        if (t?.trim() && t !== sceneTitle) renameScene(sceneId, t.trim());
      },
    },
    { label: 'Reveal in Explorer', onClick: () => shellApi.revealScene(sceneId).catch(() => {}) },
    { type: 'separator' },
    {
      label: 'Delete Scene',
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete "${sceneTitle}"?`)) deleteScene(sceneId);
      },
    },
  ];

  const totalScenes = book?.chapters.reduce((n, c) => n + c.scenes.length, 0) ?? 0;

  const ql = search.toLowerCase().trim();
  const filteredChapters = !book ? [] : book.chapters
    .map(ch => ({
      ...ch,
      scenes: ql ? ch.scenes.filter(s => s.title.toLowerCase().includes(ql)) : ch.scenes,
    }))
    .filter(ch => !ql || ch.scenes.length > 0 || ch.title.toLowerCase().includes(ql));

  if (!book && !loading) {
    return (
      <>
        <div className="sb-header"><span>Manuscript</span></div>
        <div className="sb-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px 16px' }}>
          <Icon name="book" size={28} stroke={1} style={{ color: 'var(--text-faint)', opacity: 0.5 }} />
          <span style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
            No book open
          </span>
          <button
            onClick={createBook}
            style={{ width: '100%', padding: '5px 10px', background: 'var(--accent)', color: '#16140f', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)' }}
          >
            New Book
          </button>
          <button
            onClick={openBook}
            style={{ width: '100%', padding: '5px 10px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)' }}
          >
            Open Book
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sb-header">
        <span>Manuscript</span>
        <div className="actions">
          <button
            title="New Chapter"
            onClick={() => { const t = window.prompt('Chapter title:'); if (t?.trim()) addChapter(t.trim()); }}
          >
            <Icon name="plus" size={14} />
          </button>
          <button title="Collapse All" onClick={collapseAll}>
            <Icon name="minus" size={14} />
          </button>
          <button title="More" onClick={e => showMenu(e, bookMenuItems())}>
            <Icon name="more" size={14} />
          </button>
        </div>
      </div>

      <div className="sb-search">
        <Icon name="search" size={12} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Find in manuscript…"
        />
      </div>

      {error && (
        <div style={{ color: 'var(--signal-error)', fontSize: 11, padding: '4px 14px', flexShrink: 0 }}>
          {error}
        </div>
      )}

      <div className="sb-body">
        {loading && (
          <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '10px 14px' }}>Loading…</div>
        )}
        {book && (
          <div className="tree">
            <div
              className="tree-row is-book"
              onContextMenu={e => showMenu(e, bookMenuItems())}
            >
              <span className="chev open"><Icon name="chev-right" size={11} /></span>
              <span className="icon"><Icon name="book" size={13} /></span>
              <span className="label" style={{ fontWeight: 500, color: 'var(--text-strong)' }}>{book.title}</span>
              <span className="meta-right">{totalScenes} sc</span>
            </div>

            {filteredChapters.map(ch => {
              const open = isExpanded(ch.id);
              return (
                <div key={ch.id}>
                  <div
                    className="tree-row is-chapter"
                    style={{ paddingLeft: 20 }}
                    onClick={() => toggleChapter(ch.id)}
                    onContextMenu={e => showMenu(e, chapterMenuItems(ch.id, ch.title))}
                  >
                    <span className={`chev${open ? ' open' : ''}`}>
                      <Icon name="chev-right" size={11} />
                    </span>
                    <span className="icon"><Icon name="folder" size={13} /></span>
                    <span className="label">{ch.title}</span>
                    <span className="meta-right">{ch.scenes.length}</span>
                  </div>

                  {open && ch.scenes.map(sc => (
                    <div
                      key={sc.id}
                      className="tree-row is-scene"
                      style={{ paddingLeft: 36 }}
                      onClick={() => onSceneOpen(sc.id, sc.title)}
                      onContextMenu={e => showMenu(e, sceneMenuItems(sc.id, sc.title))}
                    >
                      <span className="chev leaf"><Icon name="chev-right" size={11} /></span>
                      <span className="icon"><Icon name="scene" size={12} /></span>
                      <span className="label">{sc.title}</span>
                      {sc.status && sc.status !== 'draft' && (
                        <span className={`dot ${sc.status}`} title={sc.status} />
                      )}
                      {dirtySceneIds.has(sc.id) && (
                        <span className="unsaved" title="Unsaved" />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {book.chapters.length === 0 && (
              <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '8px 14px 8px 28px' }}>
                No chapters yet
              </div>
            )}
          </div>
        )}
      </div>

      {book && (
        <div className="sb-footer">
          <span><span className="num">{totalScenes}</span> scenes</span>
          <span><span className="num">{book.chapters.length}</span> chapters</span>
        </div>
      )}

      {menu && (
        <ContextMenu items={menu.items} position={menu} onClose={() => setMenu(null)} />
      )}
    </>
  );
}
