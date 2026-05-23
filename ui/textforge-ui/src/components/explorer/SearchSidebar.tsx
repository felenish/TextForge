import { useEffect, useState } from 'react';
import type { SeriesDto, SceneSearchResultDto } from '../../api/series';
import { searchSeries } from '../../api/series';
import { Icon } from '../ui/Icon';

interface SearchSidebarProps {
  series: SeriesDto | null;
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
}

export function SearchSidebar({ series, onSceneOpen }: SearchSidebarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SceneSearchResultDto[]>([]);
  const [loading, setLoading] = useState(false);

  const active = query.trim().length >= 2 && !!series;

  useEffect(() => {
    if (!active) return;
    const q = query.trim();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchSeries(q));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, series, active]);

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
        {!series && (
          <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '10px 14px' }}>
            Open a series to search.
          </div>
        )}
        {active && !loading && results.length === 0 && (
          <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '10px 14px' }}>
            No matches.
          </div>
        )}
        <div className="tree">
          {active && results.map(r => (
            <div
              key={r.sceneId}
              className="tree-row is-scene"
              onClick={() => onSceneOpen(r.sceneId, r.sceneTitle)}
            >
              <span className="chev leaf"><Icon name="chev-right" size={11} /></span>
              <span className="icon"><Icon name="scene" size={12} /></span>
              <div className="label" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span>{r.sceneTitle}</span>
                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{r.bookTitle} · {r.chapterTitle}</span>
                {r.snippet && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                    {r.snippet}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sb-footer">
        {loading
          ? <span style={{ color: 'var(--text-faint)' }}>Searching…</span>
          : <span><span className="num">{active ? results.length : 0}</span> matches</span>
        }
      </div>
    </>
  );
}
