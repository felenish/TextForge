import { useState, useEffect } from 'react';
import type { UseSeriesExplorerResult } from '../../hooks/useSeriesExplorer';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useDialog } from '../../contexts/DialogContext';
import type { LocationDto } from '../../api/locations';
import { ContextMenu, type ContextMenuEntry } from '../ui/ContextMenu';
import { Icon } from '../ui/Icon';
import * as shellApi from '../../api/shell';
import { listSeriesAssets, getSeriesAssetUrl } from '../../api/series';
import { setSceneStatus } from '../../api/scenes';

interface ManuscriptSidebarProps extends UseSeriesExplorerResult {
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
  onCharacterOpen: (characterId: string, name: string) => void;
  onLocationOpen: (locationId: string, name: string) => void;
  onOutlineOpen: (outlineId: string, name: string) => void;
  onPlotGridOpen: (plotGridId: string, name: string) => void;
}

interface DragState {
  kind: 'book' | 'chapter' | 'scene';
  id: string;
  bookId: string;
  chapterId?: string;
}

interface DropTarget {
  id: string;
  position: 'before' | 'after';
}

function applyReorder<T extends { id: string }>(
  items: T[], dragId: string, targetId: string, position: 'before' | 'after',
): T[] | null {
  if (dragId === targetId) return null;
  const dragged = items.find(i => i.id === dragId);
  if (!dragged) return null;
  const without = items.filter(i => i.id !== dragId);
  const targetIdx = without.findIndex(i => i.id === targetId);
  if (targetIdx === -1) return null;
  const result = [...without];
  result.splice(position === 'before' ? targetIdx : targetIdx + 1, 0, dragged);
  return result;
}

export function ManuscriptSidebar({
  series, loading, error,
  characters, charactersLoaded,
  locations, locationsLoaded,
  outlines, outlinesLoaded,
  plotGrids, plotGridsLoaded,
  createSeries, openSeries, addBook, renameBook, deleteBook, reorderBooks,
  addChapter, renameChapter, deleteChapter, reorderChapters,
  addScene, renameScene, deleteScene, reorderScenes, moveScene,
  loadCharacters, addCharacter, renameCharacter, deleteCharacter,
  loadLocations, addLocation, renameLocation, deleteLocation,
  loadOutlines, addOutline, renameOutline, deleteOutline,
  loadPlotGrids, addPlotGrid, renamePlotGrid, deletePlotGrid,
  onSceneOpen, onCharacterOpen, onLocationOpen, onOutlineOpen, onPlotGridOpen,
}: ManuscriptSidebarProps) {
  const { dirtySceneIds, activeSceneId, activeBookId, patchSceneMeta } = useWorkspace();
  const { prompt, confirm } = useDialog();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [assetsCache, setAssetsCache] = useState<{ seriesId: string; filenames: string[] } | null>(null);
  const [charsOpen, setCharsOpen] = useState(false);
  const [locsOpen, setLocsOpen] = useState(false);
  const [outlinesOpen, setOutlinesOpen] = useState(false);
  const [plotGridsOpen, setPlotGridsOpen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuEntry[] } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const assetsLoaded = !!assetsCache && !!series && assetsCache.seriesId === series.id;
  const assets = assetsLoaded ? assetsCache!.filenames : [];

  const loadAssets = async (seriesId: string) => {
    try {
      const list = await listSeriesAssets();
      setAssetsCache({ seriesId, filenames: list.map(a => a.filename) });
    } catch {
      setAssetsCache({ seriesId, filenames: [] });
    }
  };

  const toggleAssets = () => {
    if (!assetsOpen && !assetsLoaded && series) loadAssets(series.id);
    setAssetsOpen(v => !v);
  };

  useEffect(() => {
    const handleAssetUploaded = async () => {
      if (!series) return;
      const seriesId = series.id;
      try {
        const list = await listSeriesAssets();
        setAssetsCache({ seriesId, filenames: list.map(a => a.filename) });
      } catch {
        setAssetsCache({ seriesId, filenames: [] });
      }
    };
    window.addEventListener('tf-asset-uploaded', handleAssetUploaded);
    return () => window.removeEventListener('tf-asset-uploaded', handleAssetUploaded);
  }, [series]);

  const isExpanded = (id: string) => expanded[id] !== false;

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    series?.books.forEach(b => {
      all[b.id] = false;
      b.chapters.forEach(c => { all[c.id] = false; });
    });
    setExpanded(all);
  };

  const toggle = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !isExpanded(id) }));

  const onDragStart = (e: React.DragEvent, state: DragState) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', state.id);
    setDrag(state);
  };

  const onDragOver = (e: React.DragEvent, id: string, kind: DragState['kind']) => {
    if (!drag || drag.kind !== kind) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDropTarget(prev => prev?.id === id && prev.position === position ? prev : { id, position });
  };

  const onDragOverChapter = (e: React.DragEvent, id: string, bookId: string) => {
    if (!drag) return;
    if (drag.kind === 'chapter' && drag.bookId !== bookId) return;
    if (drag.kind !== 'chapter' && drag.kind !== 'scene') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDropTarget(prev => prev?.id === id && prev.position === position ? prev : { id, position });
  };

  const onDragEnd = () => { setDrag(null); setDropTarget(null); };

  const onDropBook = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!drag || drag.kind !== 'book' || !dropTarget || !series) return;
    const reordered = applyReorder(series.books, drag.id, targetId, dropTarget.position);
    if (reordered) reorderBooks(reordered.map(b => b.id));
    setDrag(null); setDropTarget(null);
  };

  const onDropChapter = (e: React.DragEvent, targetId: string, bookId: string) => {
    e.preventDefault();
    if (!drag || !dropTarget || !series) return;
    const book = series.books.find(b => b.id === bookId);
    if (!book) return;

    if (drag.kind === 'chapter' && drag.bookId === bookId) {
      const reordered = applyReorder(book.chapters, drag.id, targetId, dropTarget.position);
      if (reordered) reorderChapters(bookId, reordered.map(c => c.id));
    } else if (drag.kind === 'scene') {
      const targetChapter = book.chapters.find(c => c.id === targetId);
      if (targetChapter) moveScene(bookId, drag.id, targetId, targetChapter.scenes.length);
    }
    setDrag(null); setDropTarget(null);
  };

  const onDropScene = (e: React.DragEvent, targetId: string, bookId: string, chapterId: string) => {
    e.preventDefault();
    if (!drag || drag.kind !== 'scene' || !dropTarget || !series) return;
    const book = series.books.find(b => b.id === bookId);
    const chapter = book?.chapters.find(c => c.id === chapterId);
    if (!book || !chapter) return;

    if (drag.chapterId === chapterId) {
      const reordered = applyReorder(chapter.scenes, drag.id, targetId, dropTarget.position);
      if (reordered) reorderScenes(bookId, chapterId, reordered.map(s => s.id));
    } else {
      const idx = chapter.scenes.findIndex(s => s.id === targetId);
      const insertAt = idx === -1 ? chapter.scenes.length
        : dropTarget.position === 'before' ? idx : idx + 1;
      moveScene(bookId, drag.id, chapterId, insertAt);
    }
    setDrag(null); setDropTarget(null);
  };

  const dropClass = (id: string) =>
    dropTarget?.id === id ? ` drop-${dropTarget.position}` : '';

  const showMenu = (e: React.MouseEvent, items: ContextMenuEntry[]) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  const toggleChars = () => {
    if (!charsOpen && !charactersLoaded) loadCharacters();
    setCharsOpen(v => !v);
  };

  const characterMenuItems = (id: string, name: string): ContextMenuEntry[] => [
    {
      label: 'Rename',
      onClick: async () => {
        const t = await prompt({ title: 'Rename Character', defaultValue: name, placeholder: 'Character name' });
        if (t && t !== name) renameCharacter(id, t);
      },
    },
    { type: 'separator' },
    {
      label: 'Delete',
      danger: true,
      onClick: async () => {
        const ok = await confirm({ title: 'Delete Character', message: `Delete "${name}"? This cannot be undone.`, confirmLabel: 'Delete', dangerous: true });
        if (ok) deleteCharacter(id);
      },
    },
  ];

  const toggleLocs = () => {
    if (!locsOpen && !locationsLoaded) loadLocations();
    setLocsOpen(v => !v);
  };

  const toggleOutlines = () => {
    if (!outlinesOpen && !outlinesLoaded) loadOutlines();
    setOutlinesOpen(v => !v);
  };

  const togglePlotGrids = () => {
    if (!plotGridsOpen && !plotGridsLoaded) loadPlotGrids();
    setPlotGridsOpen(v => !v);
  };

  const plotGridMenuItems = (id: string, name: string): ContextMenuEntry[] => [
    {
      label: 'Rename',
      onClick: async () => {
        const t = await prompt({ title: 'Rename Plot Grid', defaultValue: name, placeholder: 'Plot grid name' });
        if (t && t !== name) renamePlotGrid(id, t);
      },
    },
    { type: 'separator' },
    {
      label: 'Delete',
      danger: true,
      onClick: async () => {
        const ok = await confirm({ title: 'Delete Plot Grid', message: `Delete "${name}"? This cannot be undone.`, confirmLabel: 'Delete', dangerous: true });
        if (ok) deletePlotGrid(id);
      },
    },
  ];

  const outlineMenuItems = (id: string, name: string): ContextMenuEntry[] => [
    {
      label: 'Rename',
      onClick: async () => {
        const t = await prompt({ title: 'Rename Outline', defaultValue: name, placeholder: 'Outline name' });
        if (t && t !== name) renameOutline(id, t);
      },
    },
    { type: 'separator' },
    {
      label: 'Delete',
      danger: true,
      onClick: async () => {
        const ok = await confirm({ title: 'Delete Outline', message: `Delete "${name}"? This cannot be undone.`, confirmLabel: 'Delete', dangerous: true });
        if (ok) deleteOutline(id);
      },
    },
  ];

  const locationMenuItems = (id: string, name: string): ContextMenuEntry[] => [
    {
      label: 'Rename',
      onClick: async () => {
        const t = await prompt({ title: 'Rename Location', defaultValue: name, placeholder: 'Location name' });
        if (t && t !== name) renameLocation(id, t);
      },
    },
    { type: 'separator' },
    {
      label: 'Delete',
      danger: true,
      onClick: async () => {
        const ok = await confirm({ title: 'Delete Location', message: `Delete "${name}"? This cannot be undone.`, confirmLabel: 'Delete', dangerous: true });
        if (ok) deleteLocation(id);
      },
    },
  ];

  const activeBook = activeBookId ? series?.books.find(b => b.id === activeBookId) ?? null : null;

  const seriesMenuItems = (): ContextMenuEntry[] => [
    { label: 'New Series', onClick: createSeries },
    { label: 'Open Series', onClick: openSeries },
    { type: 'separator' },
    { label: 'Add Book', onClick: addBook },
  ];

  const bookMenuItems = (bookId: string, bookTitle: string): ContextMenuEntry[] => [
    {
      label: 'Add Chapter',
      onClick: async () => {
        const t = await prompt({ title: 'Add Chapter', placeholder: 'Chapter title', confirmLabel: 'Add' });
        if (t) addChapter(bookId, t);
      },
    },
    {
      label: 'Rename Book',
      onClick: async () => {
        const t = await prompt({ title: 'Rename Book', defaultValue: bookTitle, placeholder: 'Book title' });
        if (t && t !== bookTitle) renameBook(bookId, t);
      },
    },
    { type: 'separator' },
    {
      label: 'Delete Book',
      danger: true,
      onClick: async () => {
        const ok = await confirm({ title: 'Delete Book', message: `Delete "${bookTitle}" and all its contents? This cannot be undone.`, confirmLabel: 'Delete', dangerous: true });
        if (ok) deleteBook(bookId);
      },
    },
  ];

  const chapterMenuItems = (bookId: string, chapterId: string, chapterTitle: string): ContextMenuEntry[] => [
    {
      label: 'Add Scene',
      onClick: async () => {
        const t = await prompt({ title: 'Add Scene', placeholder: 'Scene title', confirmLabel: 'Add' });
        if (t) addScene(bookId, chapterId, t);
      },
    },
    {
      label: 'Rename',
      onClick: async () => {
        const t = await prompt({ title: 'Rename Chapter', defaultValue: chapterTitle, placeholder: 'Chapter title' });
        if (t && t !== chapterTitle) renameChapter(bookId, chapterId, t);
      },
    },
    { type: 'separator' },
    {
      label: 'Delete Chapter',
      danger: true,
      onClick: async () => {
        const ok = await confirm({ title: 'Delete Chapter', message: `Delete "${chapterTitle}" and all its scenes? This cannot be undone.`, confirmLabel: 'Delete', dangerous: true });
        if (ok) deleteChapter(bookId, chapterId);
      },
    },
  ];

  const sceneMenuItems = (bookId: string, sceneId: string, sceneTitle: string): ContextMenuEntry[] => [
    { label: 'Open', onClick: () => onSceneOpen(sceneId, sceneTitle) },
    {
      label: 'Rename',
      onClick: async () => {
        const t = await prompt({ title: 'Rename Scene', defaultValue: sceneTitle, placeholder: 'Scene title' });
        if (t && t !== sceneTitle) renameScene(bookId, sceneId, t);
      },
    },
    { label: 'Reveal in Explorer', onClick: () => shellApi.revealScene(sceneId).catch(() => {}) },
    { type: 'separator' },
    { label: 'Set Draft', onClick: () => { setSceneStatus(sceneId, 'draft').then(() => patchSceneMeta(sceneId, { status: 'draft' })).catch(() => {}); } },
    { label: 'Set Revised', onClick: () => { setSceneStatus(sceneId, 'revised').then(() => patchSceneMeta(sceneId, { status: 'revised' })).catch(() => {}); } },
    { label: 'Set Final', onClick: () => { setSceneStatus(sceneId, 'final').then(() => patchSceneMeta(sceneId, { status: 'final' })).catch(() => {}); } },
    { type: 'separator' },
    {
      label: 'Delete Scene',
      danger: true,
      onClick: async () => {
        const ok = await confirm({ title: 'Delete Scene', message: `Delete "${sceneTitle}"? This cannot be undone.`, confirmLabel: 'Delete', dangerous: true });
        if (ok) deleteScene(bookId, sceneId);
      },
    },
  ];

  const totalScenes = series?.books.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.scenes.length, 0), 0) ?? 0;
  const totalChapters = series?.books.reduce((n, b) => n + b.chapters.length, 0) ?? 0;

  const ql = search.toLowerCase().trim();

  if (!series && !loading) {
    return (
      <>
        <div className="sb-header"><span>Manuscript</span></div>
        <div className="sb-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px 16px' }}>
          <Icon name="book" size={28} stroke={1} style={{ color: 'var(--text-faint)', opacity: 0.5 }} />
          <span style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
            No series open
          </span>
          <button
            onClick={createSeries}
            style={{ width: '100%', padding: '5px 10px', background: 'var(--accent)', color: '#16140f', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)' }}
          >
            New Series
          </button>
          <button
            onClick={openSeries}
            style={{ width: '100%', padding: '5px 10px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)' }}
          >
            Open Series
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
            title={series?.books.length === 0 ? 'Add Book' : 'New Chapter'}
            onClick={async () => {
              if (series?.books.length === 0) { addBook(); return; }
              const target = activeBook ?? series?.books[0];
              if (!target) return;
              const t = await prompt({ title: 'Add Chapter', placeholder: 'Chapter title', confirmLabel: 'Add' });
              if (t) addChapter(target.id, t);
            }}
          >
            <Icon name="plus" size={14} />
          </button>
          <button title="Collapse All" onClick={collapseAll}>
            <Icon name="minus" size={14} />
          </button>
          <button title="More" onClick={e => showMenu(e, seriesMenuItems())}>
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
        {series && (
          <div className="tree">
            {series.books.map(book => {
              const bookOpen = isExpanded(book.id);
              const bookSceneCount = book.chapters.reduce((n, c) => n + c.scenes.length, 0);
              const filteredChapters = book.chapters
                .map(ch => ({
                  ...ch,
                  scenes: ql ? ch.scenes.filter(s => s.title.toLowerCase().includes(ql)) : ch.scenes,
                }))
                .filter(ch => !ql || ch.scenes.length > 0 || ch.title.toLowerCase().includes(ql));

              return (
                <div key={book.id}>
                  <div
                    className={`tree-row is-book${drag?.id === book.id ? ' dragging' : ''}${dropClass(book.id)}`}
                    draggable
                    onDragStart={e => onDragStart(e, { kind: 'book', id: book.id, bookId: book.id })}
                    onDragOver={e => onDragOver(e, book.id, 'book')}
                    onDrop={e => onDropBook(e, book.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => toggle(book.id)}
                    onContextMenu={e => showMenu(e, bookMenuItems(book.id, book.title))}
                  >
                    <span className={`chev${bookOpen ? ' open' : ''}`}>
                      <Icon name="chev-right" size={11} />
                    </span>
                    <span className="icon"><Icon name="book" size={13} /></span>
                    <span className="label" style={{ fontWeight: 500, color: 'var(--text-strong)' }}>{book.title}</span>
                    <span className="meta-right">{bookSceneCount} sc</span>
                  </div>

                  {bookOpen && filteredChapters.map(ch => {
                    const chOpen = isExpanded(ch.id);
                    return (
                      <div key={ch.id}>
                        <div
                          className={`tree-row is-chapter${drag?.id === ch.id ? ' dragging' : ''}${dropClass(ch.id)}`}
                          style={{ paddingLeft: 20 }}
                          draggable
                          onDragStart={e => onDragStart(e, { kind: 'chapter', id: ch.id, bookId: book.id })}
                          onDragOver={e => onDragOverChapter(e, ch.id, book.id)}
                          onDrop={e => onDropChapter(e, ch.id, book.id)}
                          onDragEnd={onDragEnd}
                          onClick={() => toggle(ch.id)}
                          onContextMenu={e => showMenu(e, chapterMenuItems(book.id, ch.id, ch.title))}
                        >
                          <span className={`chev${chOpen ? ' open' : ''}`}>
                            <Icon name="chev-right" size={11} />
                          </span>
                          <span className="icon"><Icon name="folder" size={13} /></span>
                          <span className="label">{ch.title}</span>
                          <span className="meta-right">{ch.scenes.length}</span>
                        </div>

                        {chOpen && ch.scenes.map(sc => (
                          <div
                            key={sc.id}
                            className={`tree-row is-scene${sc.id === activeSceneId ? ' active' : ''}${drag?.id === sc.id ? ' dragging' : ''}${dropClass(sc.id)}`}
                            style={{ paddingLeft: 36 }}
                            draggable
                            onDragStart={e => onDragStart(e, { kind: 'scene', id: sc.id, bookId: book.id, chapterId: ch.id })}
                            onDragOver={e => onDragOver(e, sc.id, 'scene')}
                            onDrop={e => onDropScene(e, sc.id, book.id, ch.id)}
                            onDragEnd={onDragEnd}
                            onClick={() => onSceneOpen(sc.id, sc.title)}
                            onContextMenu={e => showMenu(e, sceneMenuItems(book.id, sc.id, sc.title))}
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

                  {bookOpen && book.chapters.length === 0 && (
                    <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '8px 14px 8px 28px' }}>
                      No chapters yet
                    </div>
                  )}
                </div>
              );
            })}

            {series.books.length === 0 && (
              <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '10px 14px' }}>
                No books in series
              </div>
            )}

            <div
              className="tree-row"
              style={{ cursor: 'pointer', color: 'var(--text-faint)' }}
              onClick={addBook}
            >
              <span className="icon"><Icon name="plus" size={12} /></span>
              <span className="label" style={{ fontSize: 11 }}>Add Book…</span>
            </div>

            {/* Assets */}
            {series && (
              <div>
                <div
                  className="tree-row is-book"
                  onClick={toggleAssets}
                >
                  <span className={`chev${assetsOpen ? ' open' : ''}`}>
                    <Icon name="chev-right" size={11} />
                  </span>
                  <span className="icon"><Icon name="image" size={13} /></span>
                  <span className="label" style={{ fontWeight: 500, color: 'var(--text-strong)' }}>Assets</span>
                  {assetsLoaded && (
                    <span className="meta-right">{assets.length}</span>
                  )}
                </div>

                {assetsOpen && (
                  <>
                    {assets.length === 0 && assetsLoaded && (
                      <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '4px 14px 4px 28px' }}>
                        No assets yet — drag or paste an image into a scene
                      </div>
                    )}
                    {assets.length > 0 && (
                      <div className="asset-grid">
                        {assets.map(filename => (
                          <img
                            key={filename}
                            src={getSeriesAssetUrl(filename)}
                            className="asset-thumb"
                            title={filename}
                            draggable
                            onDragStart={e => {
                              e.dataTransfer.effectAllowed = 'copy';
                              e.dataTransfer.setData('application/textforge-asset', filename);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div>
              <div
                className="tree-row is-book"
                onClick={toggleChars}
                onContextMenu={e => showMenu(e, [
                  {
                    label: 'New Character',
                    onClick: async () => {
                      const name = await prompt({ title: 'New Character', placeholder: 'Character name', confirmLabel: 'Next' });
                      if (!name) return;
                      const role = await prompt({ title: 'New Character', placeholder: 'Role (e.g. Protagonist)', confirmLabel: 'Add' });
                      addCharacter(name, role ?? '');
                    },
                  },
                ])}
              >
                <span className={`chev${charsOpen ? ' open' : ''}`}>
                  <Icon name="chev-right" size={11} />
                </span>
                <span className="icon"><Icon name="users" size={13} /></span>
                <span className="label" style={{ fontWeight: 500, color: 'var(--text-strong)' }}>Characters</span>
                {charactersLoaded && (
                  <span className="meta-right">{characters.length}</span>
                )}
              </div>

              {charsOpen && (
                <>
                  <div
                    className="tree-row"
                    style={{ paddingLeft: 20, cursor: 'pointer', color: 'var(--text-faint)' }}
                    onClick={async () => {
                      const name = await prompt({ title: 'New Character', placeholder: 'Character name', confirmLabel: 'Next' });
                      if (!name) return;
                      const role = await prompt({ title: 'New Character', placeholder: 'Role (e.g. Protagonist)', confirmLabel: 'Add' });
                      addCharacter(name, role ?? '');
                    }}
                  >
                    <span className="icon"><Icon name="plus" size={12} /></span>
                    <span className="label" style={{ fontSize: 11 }}>New Character…</span>
                  </div>
                  {characters.map(ch => (
                    <div
                      key={ch.id}
                      className="tree-row"
                      style={{ paddingLeft: 20 }}
                      onClick={() => onCharacterOpen(ch.id, ch.name)}
                      onContextMenu={e => showMenu(e, characterMenuItems(ch.id, ch.name))}
                    >
                      <span className="chev leaf"><Icon name="chev-right" size={11} /></span>
                      <span className="icon"><Icon name="user" size={13} /></span>
                      <span className="label">{ch.name}</span>
                      {ch.role && <span className="meta-right" style={{ fontSize: 10 }}>{ch.role}</span>}
                    </div>
                  ))}
                  {charactersLoaded && characters.length === 0 && (
                    <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '4px 14px 4px 28px' }}>
                      No characters yet
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Locations */}
            <div>
              <div
                className="tree-row is-book"
                onClick={toggleLocs}
                onContextMenu={e => showMenu(e, [
                  {
                    label: 'New Location',
                    onClick: async () => {
                      const name = await prompt({ title: 'New Location', placeholder: 'Location name', confirmLabel: 'Add' });
                      if (name) addLocation(name);
                    },
                  },
                ])}
              >
                <span className={`chev${locsOpen ? ' open' : ''}`}>
                  <Icon name="chev-right" size={11} />
                </span>
                <span className="icon"><Icon name="map-pin" size={13} /></span>
                <span className="label" style={{ fontWeight: 500, color: 'var(--text-strong)' }}>Locations</span>
                {locationsLoaded && (
                  <span className="meta-right">{locations.length}</span>
                )}
              </div>

              {locsOpen && (
                <>
                  <div
                    className="tree-row"
                    style={{ paddingLeft: 20, cursor: 'pointer', color: 'var(--text-faint)' }}
                    onClick={async () => {
                      const name = await prompt({ title: 'New Location', placeholder: 'Location name', confirmLabel: 'Add' });
                      if (name) addLocation(name);
                    }}
                  >
                    <span className="icon"><Icon name="plus" size={12} /></span>
                    <span className="label" style={{ fontSize: 11 }}>New Location…</span>
                  </div>
                  {(locations as LocationDto[]).map(loc => (
                    <div
                      key={loc.id}
                      className="tree-row"
                      style={{ paddingLeft: 20 }}
                      onClick={() => onLocationOpen(loc.id, loc.name)}
                      onContextMenu={e => showMenu(e, locationMenuItems(loc.id, loc.name))}
                    >
                      <span className="chev leaf"><Icon name="chev-right" size={11} /></span>
                      <span className="icon"><Icon name="map-pin" size={13} /></span>
                      <span className="label">{loc.name}</span>
                    </div>
                  ))}
                  {locationsLoaded && locations.length === 0 && (
                    <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '4px 14px 4px 28px' }}>
                      No locations yet
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Outlines */}
            <div>
              <div
                className="tree-row is-book"
                onClick={toggleOutlines}
                onContextMenu={e => showMenu(e, [
                  {
                    label: 'New Outline',
                    onClick: async () => {
                      const name = await prompt({ title: 'New Outline', placeholder: 'Outline name', confirmLabel: 'Add' });
                      if (name) addOutline(name);
                    },
                  },
                ])}
              >
                <span className={`chev${outlinesOpen ? ' open' : ''}`}>
                  <Icon name="chev-right" size={11} />
                </span>
                <span className="icon"><Icon name="list" size={13} /></span>
                <span className="label" style={{ fontWeight: 500, color: 'var(--text-strong)' }}>Outlines</span>
                {outlinesLoaded && (
                  <span className="meta-right">{outlines.length}</span>
                )}
              </div>

              {outlinesOpen && (
                <>
                  <div
                    className="tree-row"
                    style={{ paddingLeft: 20, cursor: 'pointer', color: 'var(--text-faint)' }}
                    onClick={async () => {
                      const name = await prompt({ title: 'New Outline', placeholder: 'Outline name', confirmLabel: 'Add' });
                      if (name) addOutline(name);
                    }}
                  >
                    <span className="icon"><Icon name="plus" size={12} /></span>
                    <span className="label" style={{ fontSize: 11 }}>New Outline…</span>
                  </div>
                  {outlines.map(o => (
                    <div
                      key={o.id}
                      className="tree-row"
                      style={{ paddingLeft: 20 }}
                      onClick={() => onOutlineOpen(o.id, o.name)}
                      onContextMenu={e => showMenu(e, outlineMenuItems(o.id, o.name))}
                    >
                      <span className="chev leaf"><Icon name="chev-right" size={11} /></span>
                      <span className="icon"><Icon name="list" size={13} /></span>
                      <span className="label">{o.name}</span>
                    </div>
                  ))}
                  {outlinesLoaded && outlines.length === 0 && (
                    <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '4px 14px 4px 28px' }}>
                      No outlines yet
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Plot Grids */}
            <div>
              <div
                className="tree-row is-book"
                onClick={togglePlotGrids}
                onContextMenu={e => showMenu(e, [
                  {
                    label: 'New Plot Grid',
                    onClick: async () => {
                      const name = await prompt({ title: 'New Plot Grid', placeholder: 'Plot grid name', confirmLabel: 'Add' });
                      if (name) addPlotGrid(name);
                    },
                  },
                ])}
              >
                <span className={`chev${plotGridsOpen ? ' open' : ''}`}>
                  <Icon name="chev-right" size={11} />
                </span>
                <span className="icon"><Icon name="layout-grid" size={13} /></span>
                <span className="label" style={{ fontWeight: 500, color: 'var(--text-strong)' }}>Plot Grids</span>
                {plotGridsLoaded && (
                  <span className="meta-right">{plotGrids.length}</span>
                )}
              </div>

              {plotGridsOpen && (
                <>
                  <div
                    className="tree-row"
                    style={{ paddingLeft: 20, cursor: 'pointer', color: 'var(--text-faint)' }}
                    onClick={async () => {
                      const name = await prompt({ title: 'New Plot Grid', placeholder: 'Plot grid name', confirmLabel: 'Add' });
                      if (name) addPlotGrid(name);
                    }}
                  >
                    <span className="icon"><Icon name="plus" size={12} /></span>
                    <span className="label" style={{ fontSize: 11 }}>New Plot Grid…</span>
                  </div>
                  {plotGrids.map(g => (
                    <div
                      key={g.id}
                      className="tree-row"
                      style={{ paddingLeft: 20 }}
                      onClick={() => onPlotGridOpen(g.id, g.name)}
                      onContextMenu={e => showMenu(e, plotGridMenuItems(g.id, g.name))}
                    >
                      <span className="chev leaf"><Icon name="chev-right" size={11} /></span>
                      <span className="icon"><Icon name="layout-grid" size={13} /></span>
                      <span className="label">{g.name}</span>
                    </div>
                  ))}
                  {plotGridsLoaded && plotGrids.length === 0 && (
                    <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '4px 14px 4px 28px' }}>
                      No plot grids yet
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {series && (
        <div className="sb-footer">
          <span><span className="num">{totalScenes}</span> scenes</span>
          <span><span className="num">{totalChapters}</span> ch</span>
          {charactersLoaded && <span><span className="num">{characters.length}</span> chars</span>}
          {locationsLoaded && <span><span className="num">{locations.length}</span> locs</span>}
          {outlinesLoaded && <span><span className="num">{outlines.length}</span> outlines</span>}
          {plotGridsLoaded && <span><span className="num">{plotGrids.length}</span> grids</span>}
        </div>
      )}

      {menu && (
        <ContextMenu items={menu.items} position={menu} onClose={() => setMenu(null)} />
      )}
    </>
  );
}
