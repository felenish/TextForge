import { useEffect, useRef, useState } from 'react';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'manuscript', label: 'Manuscript Structure' },
  { id: 'editor', label: 'Editor' },
  { id: 'find-replace', label: 'Find & Replace' },
  { id: 'autosave', label: 'Autosave' },
  { id: 'drag-drop', label: 'Drag & Drop' },
  { id: 'themes', label: 'Themes' },
  { id: 'export', label: 'Export' },
  { id: 'version-history', label: 'Version History' },
  { id: 'shortcuts', label: 'Keyboard Shortcuts' },
  { id: 'beta', label: 'Beta Notes' },
];

function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className="help-kbd-combo">
      {keys.map((k, i) => (
        <span key={k}>
          <kbd className="help-kbd">{k}</kbd>
          {i < keys.length - 1 && <span className="help-kbd-sep">+</span>}
        </span>
      ))}
    </span>
  );
}

function ShortcutsTable({ rows }: { rows: [string, string[]][] }) {
  return (
    <table className="help-shortcuts-table">
      <tbody>
        {rows.map(([label, keys]) => (
          <tr key={label}>
            <td>{label}</td>
            <td><Kbd keys={keys} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function HelpTab() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    function onScroll() {
      const top = el!.scrollTop + 64;
      let current = SECTIONS[0].id;
      const sections = el!.querySelectorAll<HTMLElement>('[data-section]');
      for (const s of sections) {
        if (s.offsetTop <= top) current = s.dataset.section!;
      }
      setActiveId(current);
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(id: string) {
    const el = contentRef.current?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (el && contentRef.current) {
      contentRef.current.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' });
    }
  }

  return (
    <div className="help-tab">
      <nav className="help-nav">
        <div className="help-nav-title">Contents</div>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`help-nav-item${activeId === s.id ? ' active' : ''}`}
            onClick={() => scrollTo(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="help-content" ref={contentRef}>
        <section data-section="getting-started" className="help-section">
          <h2>Getting Started</h2>
          <p>TextForge Studio is a writing IDE for novels and long-form fiction. Your work lives in a <strong>Series</strong>, which you create or open from <strong>File → New Series</strong> or <strong>File → Open Series</strong>.</p>
          <p>Once a series is open, the Manuscript explorer on the left shows your structure. Click a scene to open it in the editor. All your files are stored as plain text on disk — no proprietary database, no cloud required.</p>
        </section>

        <section data-section="manuscript" className="help-section">
          <h2>Manuscript Structure</h2>
          <p>TextForge organises your work in a four-level hierarchy:</p>
          <div className="help-hierarchy">
            <div className="help-hier-row">
              <span className="help-badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>Series</span>
              <span>The top-level container. One series = one project (e.g. a trilogy).</span>
            </div>
            <div className="help-hier-row">
              <span className="help-badge" style={{ background: 'oklch(0.55 0.12 250 / 0.18)', color: 'oklch(0.74 0.12 250)' }}>Book</span>
              <span>A book within the series. A standalone novel is a single book.</span>
            </div>
            <div className="help-hier-row">
              <span className="help-badge" style={{ background: 'oklch(0.55 0.12 145 / 0.18)', color: 'oklch(0.72 0.12 145)' }}>Chapter</span>
              <span>Groups scenes. Chapters contain no prose of their own.</span>
            </div>
            <div className="help-hier-row">
              <span className="help-badge" style={{ background: 'oklch(0.55 0.12 30 / 0.18)', color: 'oklch(0.74 0.12 30)' }}>Scene</span>
              <span>The unit of writing. Each scene is a separate file on disk.</span>
            </div>
          </div>
          <p>Add any level by right-clicking in the explorer or using the <strong>+</strong> buttons that appear on hover. Reorder by dragging.</p>
        </section>

        <section data-section="editor" className="help-section">
          <h2>Editor</h2>
          <p>Open a scene by clicking it in the Manuscript explorer. Multiple scenes can be open simultaneously as tabs. Close a tab with <Kbd keys={['Ctrl', 'W']} /> or the × button.</p>
          <h3>Formatting</h3>
          <ShortcutsTable rows={[
            ['Bold', ['Ctrl', 'B']],
            ['Italic', ['Ctrl', 'I']],
            ['Underline', ['Ctrl', 'U']],
          ]} />
          <h3>Typewriter Mode</h3>
          <p>Keeps the active line vertically centred so your focus never has to move. Toggle from the <strong>View</strong> menu or the status bar tweaks panel.</p>
          <h3>Minimap</h3>
          <p>The minimap on the right edge of the editor shows a compressed overview of the document. Click anywhere on it to jump to that position.</p>
          <h3>Word Count</h3>
          <p>The word count for the active scene is shown in the Inspector panel on the right. Set a daily writing goal in <strong>Settings → Goals</strong>.</p>
        </section>

        <section data-section="find-replace" className="help-section">
          <h2>Find &amp; Replace</h2>
          <p>The Find bar operates on the currently active scene.</p>
          <ShortcutsTable rows={[
            ['Open Find', ['Ctrl', 'F']],
            ['Open Find & Replace', ['Ctrl', 'H']],
            ['Next match', ['Enter']],
            ['Previous match', ['Shift', 'Enter']],
            ['Close', ['Escape']],
          ]} />
          <p>Matches are highlighted in real time as you type. <strong>Replace All</strong> replaces every match in the scene at once.</p>
        </section>

        <section data-section="autosave" className="help-section">
          <h2>Autosave</h2>
          <p>TextForge can save your work automatically. Configure the interval in <strong>Settings → Editor → Autosave interval</strong>.</p>
          <p>Options: Off · 30 s · 1 min · 2 min · 5 min.</p>
          <p>When autosave fires the status bar briefly shows <em>Autosaved HH:MM</em>. You can also save manually at any time:</p>
          <ShortcutsTable rows={[
            ['Save active scene', ['Ctrl', 'S']],
            ['Save all open scenes', ['Ctrl', 'Shift', 'S']],
          ]} />
        </section>

        <section data-section="drag-drop" className="help-section">
          <h2>Drag &amp; Drop</h2>
          <p>Reorder items in the Manuscript explorer by dragging:</p>
          <ul>
            <li>Drag a <strong>scene</strong> to reorder it within its chapter.</li>
            <li>Drag a <strong>chapter</strong> to reorder it within its book.</li>
            <li>Drag a <strong>book</strong> to reorder it within the series.</li>
          </ul>
          <p>A blue indicator line shows the drop position. Items can only be dropped within the same parent in this release — cross-chapter scene moves are not yet supported.</p>
        </section>

        <section data-section="themes" className="help-section">
          <h2>Themes</h2>
          <p>Three themes are available: <strong>Dark</strong>, <strong>Light</strong>, and <strong>Sepia</strong>.</p>
          <p>Cycle through them with the sun/moon/feather icon in the top-right corner, or set a specific theme in <strong>Settings → Appearance</strong>.</p>
          <p>Font family and font size are also configurable in Settings → Appearance.</p>
        </section>

        <section data-section="export" className="help-section">
          <h2>Export</h2>
          <p>Export the current series to <strong>PDF</strong> or <strong>EPUB</strong> from <strong>File → Export</strong> or the command palette.</p>
          <p>The export includes all scenes across all books in their current sort order. Chapter headings and scene breaks are generated automatically.</p>
          <p>PDF output is suitable for review copies and printing. EPUB output is compatible with most e-readers and reading apps.</p>
        </section>

        <section data-section="version-history" className="help-section">
          <h2>Version History</h2>
          <p>TextForge keeps a snapshot history of your work. Take a snapshot at any time from <strong>Version → Take Snapshot</strong> or the command palette.</p>
          <p>View your snapshots in the <strong>Versions</strong> sidebar — click the clock icon in the activity bar on the left. Click a snapshot to preview its contents, and restore it if you want to roll back.</p>
          <p>Snapshots are stored locally alongside your series files.</p>
        </section>

        <section data-section="shortcuts" className="help-section">
          <h2>Keyboard Shortcuts</h2>
          <ShortcutsTable rows={[
            ['Command palette', ['Ctrl', 'P']],
            ['Save scene', ['Ctrl', 'S']],
            ['Save all', ['Ctrl', 'Shift', 'S']],
            ['Close tab', ['Ctrl', 'W']],
            ['Find', ['Ctrl', 'F']],
            ['Find & Replace', ['Ctrl', 'H']],
            ['Bold', ['Ctrl', 'B']],
            ['Italic', ['Ctrl', 'I']],
            ['Underline', ['Ctrl', 'U']],
            ['Focus mode', ['F11']],
            ['Settings', ['Ctrl', ',']],
          ]} />
        </section>

        <section data-section="beta" className="help-section">
          <h2>Beta Notes</h2>
          <p>This is an early beta. A few known limitations:</p>
          <ul>
            <li><strong>Search is title-only</strong> — the command palette searches scene titles, not scene prose.</li>
            <li><strong>Drag & drop is same-parent only</strong> — scenes cannot be moved between chapters yet.</li>
<li><strong>No auto-update</strong> — download a new installer from the Releases page for each new version.</li>
            <li><strong>SmartScreen warning</strong> — the installer is not yet code-signed. Click <em>More info → Run anyway</em> to proceed.</li>
          </ul>
          <p>Found a bug or have feedback? Open an issue at <strong>github.com/felenish/TextForge</strong>.</p>
        </section>
      </div>
    </div>
  );
}
