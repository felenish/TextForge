import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface PaletteItem {
  id: string;
  label: string;
  meta?: string;
  group: 'scene' | 'command' | 'theme';
  action: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
  onOpenScene: (sceneId: string, title: string) => void;
  onToggleFocus: () => void;
  onToggleBottom: () => void;
  onOpenTweaks: () => void;
}

const GROUP_LABELS: Record<string, string> = {
  scene: 'Open Scene',
  command: 'Commands',
  theme: 'Theme',
};

export function CommandPalette({
  onClose, onOpenScene, onToggleFocus, onToggleBottom, onOpenTweaks,
}: CommandPaletteProps) {
  const {
    series, applyTheme,
    typewriterMode, setTypewriterMode,
    inspectorOpen, setInspectorOpen,
    minimapOpen, setMinimapOpen,
  } = useWorkspace();

  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const allItems = useMemo((): PaletteItem[] => {
    const items: PaletteItem[] = [];

    if (series) {
      for (const book of series.books) {
        for (const chapter of book.chapters) {
          for (const scene of chapter.scenes) {
            items.push({
              id: `scene-${scene.id}`,
              label: scene.title,
              meta: series.books.length > 1 ? `${book.title} · ${chapter.title}` : chapter.title,
              group: 'scene',
              action: () => { onOpenScene(scene.id, scene.title); onClose(); },
            });
          }
        }
      }
    }

    items.push(
      {
        id: 'cmd-focus', label: 'Toggle Focus Mode', group: 'command',
        action: () => { onToggleFocus(); onClose(); },
      },
      {
        id: 'cmd-tw', label: `${typewriterMode ? 'Disable' : 'Enable'} Typewriter Mode`, group: 'command',
        action: () => { setTypewriterMode(!typewriterMode); onClose(); },
      },
      {
        id: 'cmd-bottom', label: 'Toggle Bottom Panel', group: 'command',
        action: () => { onToggleBottom(); onClose(); },
      },
      {
        id: 'cmd-inspector', label: `${inspectorOpen ? 'Hide' : 'Show'} Inspector`, group: 'command',
        action: () => { setInspectorOpen(!inspectorOpen); onClose(); },
      },
      {
        id: 'cmd-minimap', label: `${minimapOpen ? 'Hide' : 'Show'} Minimap`, group: 'command',
        action: () => { setMinimapOpen(!minimapOpen); onClose(); },
      },
      {
        id: 'cmd-tweaks', label: 'Open Tweaks Panel', group: 'command',
        action: () => { onOpenTweaks(); onClose(); },
      },
    );

    items.push(
      { id: 'theme-dark', label: 'Theme: Dark', group: 'theme', action: () => { applyTheme('dark'); onClose(); } },
      { id: 'theme-light', label: 'Theme: Light', group: 'theme', action: () => { applyTheme('light'); onClose(); } },
      { id: 'theme-sepia', label: 'Theme: Sepia', group: 'theme', action: () => { applyTheme('sepia'); onClose(); } },
    );

    return items;
  }, [series, typewriterMode, inspectorOpen, minimapOpen,
    applyTheme, setTypewriterMode, setInspectorOpen, setMinimapOpen,
    onOpenScene, onClose, onToggleFocus, onToggleBottom, onOpenTweaks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      item => item.label.toLowerCase().includes(q) || item.meta?.toLowerCase().includes(q),
    );
  }, [allItems, query]);


  function execute(item: PaletteItem) { item.action(); }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIdx]) execute(filtered[selectedIdx]);
    if (e.key === 'Escape') onClose();
  }

  const isSearching = query.trim().length > 0;

  // Build display rows: grouped when not searching, flat when searching
  const rows: Array<{ type: 'header'; label: string } | { type: 'item'; item: PaletteItem; flatIdx: number }> =
    useMemo(() => {
      if (isSearching) {
        return filtered.map((item, flatIdx) => ({ type: 'item', item, flatIdx }));
      }
      const result: Array<{ type: 'header'; label: string } | { type: 'item'; item: PaletteItem; flatIdx: number }> = [];
      let flatIdx = 0;
      const groups = ['scene', 'command', 'theme'] as const;
      for (const g of groups) {
        const groupItems = filtered.filter(i => i.group === g);
        if (groupItems.length === 0) continue;
        result.push({ type: 'header', label: GROUP_LABELS[g] });
        for (const item of groupItems) {
          result.push({ type: 'item', item, flatIdx: flatIdx++ });
        }
      }
      return result;
    }, [filtered, isSearching]);

  return (
    <div className="palette-overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Search scenes and commands…"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
          onKeyDown={handleKey}
        />
        <div className="palette-list">
          {filtered.length === 0 && (
            <div className="palette-empty">No results for "{query}"</div>
          )}
          {rows.map((row, i) =>
            row.type === 'header' ? (
              <div key={`h-${row.label}-${i}`} className="palette-group-label">{row.label}</div>
            ) : (
              <div
                key={row.item.id}
                className={`palette-item${row.flatIdx === selectedIdx ? ' selected' : ''}`}
                onMouseEnter={() => setSelectedIdx(row.flatIdx)}
                onMouseDown={() => execute(row.item)}
              >
                <span>{row.item.label}</span>
                {row.item.meta && <span className="palette-meta">{row.item.meta}</span>}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
