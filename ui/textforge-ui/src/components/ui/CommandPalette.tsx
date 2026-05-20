import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface PaletteItem {
  id: string;
  label: string;
  meta?: string;
  kbd?: string;
  group: 'scene' | 'file' | 'version' | 'view' | 'appearance';
  action: () => void;
}

const GROUP_ORDER = ['scene', 'file', 'version', 'view', 'appearance'] as const;
const GROUP_LABELS: Record<string, string> = {
  scene:      'Open Scene',
  file:       'File',
  version:    'Version',
  view:       'View',
  appearance: 'Appearance',
};

interface CommandPaletteProps {
  onClose: () => void;
  // scenes
  onOpenScene: (sceneId: string, title: string) => void;
  // file
  hasSeries: boolean;
  onSave: () => void;
  onSaveAll: () => void;
  onOpenSeries: () => void;
  onCreateSeries: () => void;
  onExportPdf: () => void;
  onExportEpub: () => void;
  // version
  onTakeSnapshot: () => void;
  onViewHistory: () => void;
  // view
  onToggleFocus: () => void;
  onToggleBottom: () => void;
  onFind: () => void;
  onFindReplace: () => void;
  // settings
  onOpenSettings: () => void;
}

export function CommandPalette({
  onClose, onOpenScene,
  hasSeries, onSave, onSaveAll, onOpenSeries, onCreateSeries, onExportPdf, onExportEpub,
  onTakeSnapshot, onViewHistory,
  onToggleFocus, onToggleBottom, onFind, onFindReplace,
  onOpenSettings,
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
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const allItems = useMemo((): PaletteItem[] => {
    const items: PaletteItem[] = [];

    // ── Scenes ──────────────────────────────────────────────────────
    if (series) {
      for (const book of series.books) {
        for (const chapter of book.chapters) {
          for (const scene of chapter.scenes) {
            items.push({
              id: `scene-${scene.id}`,
              label: scene.title,
              meta: series.books.length > 1
                ? `${book.title} · ${chapter.title}`
                : chapter.title,
              group: 'scene',
              action: () => { onOpenScene(scene.id, scene.title); onClose(); },
            });
          }
        }
      }
    }

    // ── File ────────────────────────────────────────────────────────
    items.push(
      { id: 'file-open',   label: 'Open Series…',  kbd: 'Ctrl+O', group: 'file', action: () => { onOpenSeries(); onClose(); } },
      { id: 'file-new',    label: 'New Series…',   group: 'file', action: () => { onCreateSeries(); onClose(); } },
    );
    if (hasSeries) {
      items.push(
        { id: 'file-save',     label: 'Save',          kbd: 'Ctrl+S',       group: 'file', action: () => { onSave(); onClose(); } },
        { id: 'file-save-all', label: 'Save All',      kbd: 'Ctrl+Shift+S', group: 'file', action: () => { onSaveAll(); onClose(); } },
        { id: 'file-find',     label: 'Find…',         kbd: 'Ctrl+F',       group: 'file', action: () => { onFind(); onClose(); } },
        { id: 'file-replace',  label: 'Find & Replace…', kbd: 'Ctrl+H',     group: 'file', action: () => { onFindReplace(); onClose(); } },
        { id: 'file-pdf',      label: 'Export PDF…',   group: 'file', action: () => { onExportPdf(); onClose(); } },
        { id: 'file-epub',     label: 'Export EPUB…',  group: 'file', action: () => { onExportEpub(); onClose(); } },
      );
    }

    // ── Version ─────────────────────────────────────────────────────
    if (hasSeries) {
      items.push(
        { id: 'ver-snap',    label: 'Take Snapshot…', group: 'version', action: () => { onTakeSnapshot(); onClose(); } },
        { id: 'ver-history', label: 'View History',   group: 'version', action: () => { onViewHistory(); onClose(); } },
      );
    }

    // ── View ────────────────────────────────────────────────────────
    items.push(
      { id: 'view-focus', label: 'Toggle Focus Mode', kbd: 'F11', group: 'view',
        action: () => { onToggleFocus(); onClose(); } },
      { id: 'view-tw', label: `${typewriterMode ? 'Disable' : 'Enable'} Typewriter Mode`, group: 'view',
        action: () => { setTypewriterMode(!typewriterMode); onClose(); } },
      { id: 'view-bottom', label: 'Toggle Bottom Panel', group: 'view',
        action: () => { onToggleBottom(); onClose(); } },
      { id: 'view-inspector', label: `${inspectorOpen ? 'Hide' : 'Show'} Inspector`, group: 'view',
        action: () => { setInspectorOpen(!inspectorOpen); onClose(); } },
      { id: 'view-minimap', label: `${minimapOpen ? 'Hide' : 'Show'} Minimap`, group: 'view',
        action: () => { setMinimapOpen(!minimapOpen); onClose(); } },
      { id: 'view-settings', label: 'Open Settings', kbd: 'Ctrl+,', group: 'view',
        action: () => { onOpenSettings(); onClose(); } },
    );

    // ── Appearance ──────────────────────────────────────────────────
    items.push(
      { id: 'theme-dark',  label: 'Theme: Dark',  group: 'appearance', action: () => { applyTheme('dark');  onClose(); } },
      { id: 'theme-light', label: 'Theme: Light', group: 'appearance', action: () => { applyTheme('light'); onClose(); } },
      { id: 'theme-sepia', label: 'Theme: Sepia', group: 'appearance', action: () => { applyTheme('sepia'); onClose(); } },
    );

    return items;
  }, [
    series, hasSeries, typewriterMode, inspectorOpen, minimapOpen,
    applyTheme, setTypewriterMode, setInspectorOpen, setMinimapOpen,
    onOpenScene, onClose, onOpenSeries, onCreateSeries,
    onSave, onSaveAll, onFind, onFindReplace, onExportPdf, onExportEpub,
    onTakeSnapshot, onViewHistory,
    onToggleFocus, onToggleBottom, onOpenSettings,
  ]);

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
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIdx]) execute(filtered[selectedIdx]);
    if (e.key === 'Escape') onClose();
  }

  const isSearching = query.trim().length > 0;

  const rows = useMemo(() => {
    type Row =
      | { type: 'header'; label: string }
      | { type: 'item'; item: PaletteItem; flatIdx: number };
    const result: Row[] = [];
    let flatIdx = 0;
    if (isSearching) {
      for (const item of filtered) result.push({ type: 'item', item, flatIdx: flatIdx++ });
    } else {
      for (const g of GROUP_ORDER) {
        const groupItems = filtered.filter(i => i.group === g);
        if (groupItems.length === 0) continue;
        result.push({ type: 'header', label: GROUP_LABELS[g] });
        for (const item of groupItems) result.push({ type: 'item', item, flatIdx: flatIdx++ });
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
                ref={row.flatIdx === selectedIdx ? selectedRef : null}
                className={`palette-item${row.flatIdx === selectedIdx ? ' selected' : ''}`}
                onMouseEnter={() => setSelectedIdx(row.flatIdx)}
                onMouseDown={() => execute(row.item)}
              >
                <span className="palette-item-label">{row.item.label}</span>
                {row.item.meta && <span className="palette-meta">{row.item.meta}</span>}
                {row.item.kbd && <span className="palette-kbd">{row.item.kbd}</span>}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
