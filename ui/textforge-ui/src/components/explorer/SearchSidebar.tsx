import { useMemo, useState } from 'react';
import type { BookDto } from '../../api/books';
import { Icon } from '../ui/Icon';

interface SearchSidebarProps {
  book: BookDto | null;
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
}

interface SearchResult {
  sceneId: string;
  sceneTitle: string;
  chapterTitle: string;
}

export function SearchSidebar({ book, onSceneOpen }: SearchSidebarProps) {
  const [query, setQuery] = useState('');

  const results = useMemo<SearchResult[]>(() => {
    if (!book || !query.trim()) return [];
    const ql = query.toLowerCase();
    const out: SearchResult[] = [];
    for (const ch of book.chapters) {
      for (const sc of ch.scenes) {
        if (sc.title.toLowerCase().includes(ql) || ch.title.toLowerCase().includes(ql)) {
          out.push({ sceneId: sc.id, sceneTitle: sc.title, chapterTitle: ch.title });
        }
      }
    }
    return out.slice(0, 50);
  }, [book, query]);

  return (
    <>
      <div className="sb-header"><span>Search</span></div>
      <div className="sb-search">
        <Icon name="search" size={12} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search manuscript…"
          autoFocus
        />
      </div>
      <div className="sb-body">
        {!book && (
          <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '10px 14px' }}>
            Open a book to search.
          </div>
        )}
        {book && query.trim() && results.length === 0 && (
          <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '10px 14px' }}>
            No matches.
          </div>
        )}
        <div className="tree">
          {results.map(r => (
            <div
              key={r.sceneId}
              className="tree-row is-scene"
              onClick={() => onSceneOpen(r.sceneId, r.sceneTitle)}
            >
              <span className="chev leaf"><Icon name="chev-right" size={11} /></span>
              <span className="icon"><Icon name="scene" size={12} /></span>
              <div className="label" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span>{r.sceneTitle}</span>
                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{r.chapterTitle}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sb-footer">
        <span><span className="num">{results.length}</span> matches</span>
      </div>
    </>
  );
}
