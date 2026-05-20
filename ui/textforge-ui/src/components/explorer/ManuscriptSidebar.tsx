import { useState } from 'react';
import type { UseSeriesExplorerResult } from '../../hooks/useSeriesExplorer';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import type { LocationDto } from '../../api/locations';
import { ContextMenu, type ContextMenuEntry } from '../ui/ContextMenu';
import { Icon } from '../ui/Icon';
import * as shellApi from '../../api/shell';

interface ManuscriptSidebarProps extends UseSeriesExplorerResult {
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
  onCharacterOpen: (characterId: string, name: string) => void;
  onLocationOpen: (locationId: string, name: string) => void;
  onOutlineOpen: (outlineId: string, name: string) => void;
  onPlotGridOpen: (plotGridId: string, name: string) => void;
}

export function ManuscriptSidebar({
  series, loading, error,
  characters, charactersLoaded,
  locations, locationsLoaded,
  outlines, outlinesLoaded,
  plotGrids, plotGridsLoaded,
  createSeries, openSeries, addBook, renameBook, deleteBook,
  addChapter, renameChapter, deleteChapter,
  addScene, renameScene, deleteScene,
  loadCharacters, addCharacter, renameCharacter, deleteCharacter,
  loadLocations, addLocation, renameLocation, deleteLocation,
  loadOutlines, addOutline, renameOutline, deleteOutline,
  loadPlotGrids, addPlotGrid, renamePlotGrid, deletePlotGrid,
  onSceneOpen, onCharacterOpen, onLocationOpen, onOutlineOpen, onPlotGridOpen,
}: ManuscriptSidebarProps) {
  const { dirtySceneIds, activeSceneId, activeBookId } = useWorkspace();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [charsOpen, setCharsOpen] = useState(false);
  const [locsOpen, setLocsOpen] = useState(false);
  const [outlinesOpen, setOutlinesOpen] = useState(false);
  const [plotGridsOpen, setPlotGridsOpen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuEntry[] } | null>(null);

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
      onClick: () => {
        const t = window.prompt('New name:', name);
        if (t?.trim() && t !== name) renameCharacter(id, t.trim());
      },
    },
    { type: 'separator' },
    {
      label: 'Delete',
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete character "${name}"?`)) deleteCharacter(id);
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
      onClick: () => {
        const t = window.prompt('New name:', name);
        if (t?.trim() && t !== name) renamePlotGrid(id, t.trim());
      },
    },
    { type: 'separator' },
    {
      label: 'Delete',
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete plot grid "${name}"?`)) deletePlotGrid(id);
      },
    },
  ];

  const outlineMenuItems = (id: string, name: string): ContextMenuEntry[] => [
    {
      label: 'Rename',
      onClick: () => {
        const t = window.prompt('New name:', name);
        if (t?.trim() && t !== name) renameOutline(id, t.trim());
      },
    },
    { type: 'separator' },
    {
      label: 'Delete',
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete outline "${name}"?`)) deleteOutline(id);
      },
    },
  ];

  const locationMenuItems = (id: string, name: string): ContextMenuEntry[] => [
    {
      label: 'Rename',
      onClick: () => {
        const t = window.prompt('New name:', name);
        if (t?.trim() && t !== name) renameLocation(id, t.trim());
      },
    },
    { type: 'separator' },
    {
      label: 'Delete',
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete location "${name}"?`)) deleteLocation(id);
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
      onClick: () => {
        const t = window.prompt('Chapter title:');
        if (t?.trim()) addChapter(bookId, t.trim());
      },
    },
    {
      label: 'Rename Book',
      onClick: () => {
        const t = window.prompt('New book title:', bookTitle);
        if (t?.trim() && t !== bookTitle) renameBook(bookId, t.trim());
      },
    },
    { type: 'separator' },
    {
      label: 'Delete Book',
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete "${bookTitle}" and all its contents? This cannot be undone.`))
          deleteBook(bookId);
      },
    },
  ];

  const chapterMenuItems = (bookId: string, chapterId: string, chapterTitle: string): ContextMenuEntry[] => [
    {
      label: 'Add Scene',
      onClick: () => {
        const t = window.prompt('Scene title:');
        if (t?.trim()) addScene(bookId, chapterId, t.trim());
      },
    },
    {
      label: 'Rename',
      onClick: () => {
        const t = window.prompt('New chapter title:', chapterTitle);
        if (t?.trim() && t !== chapterTitle) renameChapter(bookId, chapterId, t.trim());
      },
    },
    { type: 'separator' },
    {
      label: 'Delete Chapter',
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete "${chapterTitle}" and all its scenes?`)) deleteChapter(bookId, chapterId);
      },
    },
  ];

  const sceneMenuItems = (bookId: string, sceneId: string, sceneTitle: string): ContextMenuEntry[] => [
    { label: 'Open', onClick: () => onSceneOpen(sceneId, sceneTitle) },
    {
      label: 'Rename',
      onClick: () => {
        const t = window.prompt('New scene title:', sceneTitle);
        if (t?.trim() && t !== sceneTitle) renameScene(bookId, sceneId, t.trim());
      },
    },
    { label: 'Reveal in Explorer', onClick: () => shellApi.revealScene(sceneId).catch(() => {}) },
    { type: 'separator' },
    {
      label: 'Delete Scene',
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete "${sceneTitle}"?`)) deleteScene(bookId, sceneId);
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
            title="New Chapter"
            onClick={() => {
              const target = activeBook ?? series?.books[0];
              if (!target) return;
              const t = window.prompt('Chapter title:');
              if (t?.trim()) addChapter(target.id, t.trim());
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
                    className="tree-row is-book"
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
                          className="tree-row is-chapter"
                          style={{ paddingLeft: 20 }}
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
                            className={`tree-row is-scene${sc.id === activeSceneId ? ' active' : ''}`}
                            style={{ paddingLeft: 36 }}
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

            <div>
              <div
                className="tree-row is-book"
                onClick={toggleChars}
                onContextMenu={e => showMenu(e, [
                  {
                    label: 'New Character',
                    onClick: () => {
                      const name = window.prompt('Character name:');
                      if (!name?.trim()) return;
                      const role = window.prompt('Role (e.g. Protagonist):') ?? '';
                      addCharacter(name.trim(), role.trim());
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
                    onClick={() => {
                      const name = window.prompt('Character name:');
                      if (!name?.trim()) return;
                      const role = window.prompt('Role (e.g. Protagonist):') ?? '';
                      addCharacter(name.trim(), role.trim());
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
                    onClick: () => {
                      const name = window.prompt('Location name:');
                      if (name?.trim()) addLocation(name.trim());
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
                    onClick={() => {
                      const name = window.prompt('Location name:');
                      if (name?.trim()) addLocation(name.trim());
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
                    onClick: () => {
                      const name = window.prompt('Outline name:');
                      if (name?.trim()) addOutline(name.trim());
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
                    onClick={() => {
                      const name = window.prompt('Outline name:');
                      if (name?.trim()) addOutline(name.trim());
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
                    onClick: () => {
                      const name = window.prompt('Plot grid name:');
                      if (name?.trim()) addPlotGrid(name.trim());
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
                    onClick={() => {
                      const name = window.prompt('Plot grid name:');
                      if (name?.trim()) addPlotGrid(name.trim());
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
