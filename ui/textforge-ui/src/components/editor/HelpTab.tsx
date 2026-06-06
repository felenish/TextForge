import { useEffect, useRef, useState } from 'react';

const SECTIONS = [
  { id: 'getting-started',  label: 'Getting Started'       },
  { id: 'manuscript',       label: 'Manuscript Structure'   },
  { id: 'editor',           label: 'Editor'                 },
  { id: 'scene-status',     label: 'Scene Status'           },
  { id: 'scene-checklists', label: 'Scene Checklists'       },
  { id: 'images',           label: 'Images'                 },
  { id: 'command-palette',  label: 'Command Palette'        },
  { id: 'sidebar-panels',   label: 'Sidebar Panels'         },
  { id: 'worldbuilding',    label: 'Worldbuilding'          },
  { id: 'internal-links',   label: 'Internal Links'         },
  { id: 'find-replace',     label: 'Find & Replace'         },
  { id: 'autosave',         label: 'Autosave'               },
  { id: 'drag-drop',        label: 'Drag & Drop'            },
  { id: 'themes',           label: 'Themes'                 },
  { id: 'preferences',      label: 'Preferences'            },
  { id: 'export',           label: 'Export'                 },
  { id: 'version-history',  label: 'Version History'        },
  { id: 'shortcuts',        label: 'Keyboard Shortcuts'     },
  { id: 'beta',             label: 'Beta Notes'             },
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
          <p>The format bar above the editor provides text formatting controls:</p>
          <ShortcutsTable rows={[
            ['Bold',      ['Ctrl', 'B']],
            ['Italic',    ['Ctrl', 'I']],
            ['Underline', ['Ctrl', 'U']],
          ]} />
          <p>The format bar also includes:</p>
          <ul>
            <li><strong>Text color</strong> — apply a custom color to selected text.</li>
            <li><strong>Highlight color</strong> — apply a background highlight to selected text.</li>
            <li><strong>Alignment</strong> — set paragraph alignment to left, center, right, or justify.</li>
          </ul>

          <h3>Undo / Redo</h3>
          <p>Full undo and redo history is available in the <strong>Edit</strong> menu and via keyboard:</p>
          <ShortcutsTable rows={[
            ['Undo', ['Ctrl', 'Z']],
            ['Redo', ['Ctrl', 'Y']],
          ]} />

          <h3>Context Menu</h3>
          <p>Right-click anywhere in an editable area to open the context menu. It provides:</p>
          <ul>
            <li><strong>Undo / Redo</strong> — available in contenteditable areas.</li>
            <li><strong>Cut / Copy / Paste / Paste as Plain Text</strong> — clipboard operations.</li>
            <li><strong>AI Assistant</strong> — appears when text is selected. Choose Copy Edit, Revise, Improve Prose, Analyze, or Summarize to send the selection to the AI panel.</li>
            <li><strong>Insert Link</strong> — insert an internal link to a character, location, or outline (see <button className="help-inline-link" onClick={() => scrollTo('internal-links')}>Internal Links</button>).</li>
          </ul>

          <h3>Spell Check</h3>
          <p>The editor has spell check enabled. Misspelled words are underlined in red by the system. Because the default browser context menu is disabled, corrections must be typed manually — the underlines are visual only.</p>

          <h3>Typewriter Mode</h3>
          <p>Keeps the active line vertically centred so your focus never has to move. Toggle from the <strong>View</strong> menu or the status bar tweaks panel.</p>

          <h3>Tweaks Panel</h3>
          <p>The <strong>Tweaks</strong> button in the status bar (bottom-right) opens a floating panel with quick-access controls for typewriter mode, line height, and other editor settings without opening the full Settings dialog.</p>

          <h3>Minimap</h3>
          <p>The minimap on the right edge of the editor shows a compressed overview of the document. Click anywhere on it to jump to that position.</p>

          <h3>Word Count</h3>
          <p>The word count for the active scene is shown in the Inspector panel on the right. Set a daily writing goal in <strong>Settings → Goals</strong>.</p>
        </section>

        <section data-section="scene-status" className="help-section">
          <h2>Scene Status</h2>
          <p>Each scene has a status that helps you track your progress through a draft:</p>
          <ul>
            <li><strong>Draft</strong> — work in progress (grey dot in the sidebar).</li>
            <li><strong>Revised</strong> — a second pass has been done (yellow dot).</li>
            <li><strong>Final</strong> — the scene is complete (green dot).</li>
          </ul>
          <p>Change the status by right-clicking the scene in the Manuscript explorer and choosing <em>Set Draft / Set Revised / Set Final</em>, or by clicking the status indicator in the <strong>Inspector</strong> panel on the right.</p>
        </section>

        <section data-section="scene-checklists" className="help-section">
          <h2>Scene Checklists</h2>
          <p>Each scene can have a checklist of items to track tasks, revision notes, or continuity details associated with that scene.</p>
          <h3>Managing Checklist Items</h3>
          <ul>
            <li>Open the <strong>Bottom Panel</strong> while a scene is active to see its checklist.</li>
            <li>Add a new item with the <strong>+</strong> button.</li>
            <li>Check or uncheck items to track completion.</li>
            <li>Delete items with the remove button on each row.</li>
          </ul>
          <p>Checklist items are saved with the scene and persist across sessions.</p>
        </section>

        <section data-section="images" className="help-section">
          <h2>Images</h2>
          <p>You can embed images in scene prose using the <strong>Assets panel</strong> in the Manuscript sidebar.</p>
          <h3>Adding Assets</h3>
          <p>Drag an image file from your computer into the Assets panel to add it to the series. Assets are stored in the <code>assets/</code> folder alongside your series file.</p>
          <h3>Embedding in a Scene</h3>
          <p>Drag an image from the Assets panel into the open scene editor to insert it. The image is stored as a tag in the scene text:</p>
          <p><code>{'[[img:filename.png]]'}</code></p>
          <p>You can also type this tag manually. The editor renders the image inline.</p>
          <h3>Exports</h3>
          <p>Image tags are currently omitted from PDF and EPUB exports. A placeholder <em>[Image: filename]</em> appears in their place so you know where each image was.</p>
        </section>

        <section data-section="command-palette" className="help-section">
          <h2>Command Palette</h2>
          <p>The command palette gives you keyboard-first access to every major action. Open it with <Kbd keys={['Ctrl', 'P']} /> or <Kbd keys={['Ctrl', 'K']} />.</p>
          <p>Available commands include:</p>
          <ul>
            <li>Open a scene by title</li>
            <li>New Series / Open Series</li>
            <li>Save / Save All</li>
            <li>Find / Find &amp; Replace</li>
            <li>Export to PDF / EPUB</li>
            <li>Take Snapshot</li>
            <li>View Version History</li>
            <li>Toggle Focus Mode / Bottom Panel</li>
            <li>Open Settings</li>
          </ul>
          <p>Type any part of a command or scene title to filter the list.</p>
        </section>

        <section data-section="sidebar-panels" className="help-section">
          <h2>Sidebar Panels</h2>
          <p>The activity bar on the left switches between sidebar modes. Below the Manuscript view, the sidebar also contains panels for series reference data:</p>
          <h3>Characters</h3>
          <p>Track named characters with a role (protagonist, antagonist, supporting, etc.) and notes. Open a character card from the sidebar to view and edit their details in a full editor tab. Characters can be organised into <strong>folders</strong> and sorted by name or custom order.</p>
          <h3>Locations</h3>
          <p>Store locations with descriptions. Like characters, each location opens in a dedicated editor tab. Locations can be organised into folders and sorted.</p>
          <h3>Outline</h3>
          <p>Free-form outline documents attached to the series. Useful for plot notes, chapter plans, or research that doesn't belong in a scene. Outlines support folders and sorting.</p>
          <h3>Plot Grid</h3>
          <p>A spreadsheet-style grid for tracking story threads, character arcs, or chapter beats across multiple axes. Each row and column is user-defined. Plot grids support folders and sorting.</p>
          <h3>Assets</h3>
          <p>Image and file assets stored with the series. Drag assets into a scene to embed them.</p>
        </section>

        <section data-section="worldbuilding" className="help-section">
          <h2>Worldbuilding</h2>
          <p>Characters, Locations, Outlines, and Plot Grids all support extended organisation and custom content.</p>

          <h3>Folders &amp; Sorting</h3>
          <p>Any worldbuilding item can be placed inside a <strong>folder</strong> to group related entries. Right-click an item or use the <strong>+</strong> menu to create folders. Drag items into or out of folders to organise them. Items within a folder can be sorted by name or reordered manually.</p>

          <h3>Custom Sections</h3>
          <p>Character and Location editor tabs support <strong>custom sections</strong> — user-defined rich-text fields you can add to capture any detail that doesn't fit the default fields.</p>
          <ul>
            <li>Open a character or location in its editor tab.</li>
            <li>Scroll to the bottom of the editor and click <strong>Add Section</strong>.</li>
            <li>Give the section a title and write freely in the rich-text body.</li>
            <li>Sections can be renamed or deleted via the section header controls.</li>
          </ul>
          <p>Custom sections are saved as part of the character or location record.</p>
        </section>

        <section data-section="internal-links" className="help-section">
          <h2>Internal Links</h2>
          <p>TextForge supports hyperlinks between worldbuilding objects — characters, locations, and outlines. A link in one record opens the linked record directly in the editor.</p>

          <h3>Inserting a Link</h3>
          <p>In any rich-text field (scene body, character section, location section, outline):</p>
          <ol>
            <li>Right-click to open the context menu and choose <strong>Insert Link</strong>.</li>
            <li>Select the target type: <em>Character</em>, <em>Location</em>, or <em>Outline</em>.</li>
            <li>Pick the entry from the list.</li>
          </ol>
          <p>The link is inserted as styled text. Clicking it navigates to that entry's editor tab.</p>

          <h3>Navigating Links</h3>
          <p>Click any internal link to jump directly to that character, location, or outline, opening it in a new tab if it isn't already open.</p>
        </section>

        <section data-section="find-replace" className="help-section">
          <h2>Find &amp; Replace</h2>
          <p>The Find bar operates on the currently active scene.</p>
          <ShortcutsTable rows={[
            ['Open Find',            ['Ctrl', 'F']],
            ['Open Find & Replace',  ['Ctrl', 'H']],
            ['Next match',           ['Enter']],
            ['Previous match',       ['Shift', 'Enter']],
            ['Close',                ['Escape']],
          ]} />
          <p>Matches are highlighted in real time as you type. <strong>Replace All</strong> replaces every match in the scene at once.</p>
        </section>

        <section data-section="autosave" className="help-section">
          <h2>Autosave</h2>
          <p>TextForge can save your work automatically. Configure the interval in <strong>Settings → Editor → Autosave interval</strong>.</p>
          <p>Options: Off · 30 s · 1 min · 2 min · 5 min.</p>
          <p>When autosave fires the status bar briefly shows <em>Autosaved HH:MM</em>. You can also save manually at any time:</p>
          <ShortcutsTable rows={[
            ['Save active scene',    ['Ctrl', 'S']],
            ['Save all open scenes', ['Ctrl', 'Shift', 'S']],
          ]} />
        </section>

        <section data-section="drag-drop" className="help-section">
          <h2>Drag &amp; Drop</h2>
          <p>Reorder items in the Manuscript explorer by dragging:</p>
          <ul>
            <li>Drag a <strong>scene</strong> to reorder it within its chapter, or move it to a different chapter.</li>
            <li>Drag a <strong>chapter</strong> to reorder it within its book.</li>
            <li>Drag a <strong>book</strong> to reorder it within the series.</li>
          </ul>
          <p>A blue indicator line shows the drop position. Cross-chapter scene moves are supported — drop a scene onto any chapter to move it there.</p>
          <p>Worldbuilding items (characters, locations, outlines, plot grids) can also be dragged into folders or reordered within a folder.</p>
        </section>

        <section data-section="themes" className="help-section">
          <h2>Themes</h2>
          <p>Three themes are available: <strong>Dark</strong>, <strong>Light</strong>, and <strong>Sepia</strong>.</p>
          <p>Cycle through them with the sun/moon/feather icon in the top-right corner, or set a specific theme in <strong>Settings → Appearance</strong>.</p>
          <p>Font family and font size are also configurable in Settings → Appearance.</p>
        </section>

        <section data-section="preferences" className="help-section">
          <h2>Preferences</h2>
          <p>Open the full preferences dialog from <strong>Help → Settings</strong> or with <Kbd keys={['Ctrl', ',']} />. Preferences are divided into categories:</p>
          <ul>
            <li><strong>Appearance</strong> — theme, font family, font size.</li>
            <li><strong>Editor</strong> — autosave interval, typewriter mode, line height.</li>
            <li><strong>Goals</strong> — daily word count target.</li>
          </ul>
          <p>For quick access without opening the full dialog, the <strong>Tweaks</strong> panel in the status bar exposes the most common editor settings inline.</p>
          <p>All preferences are stored per-series and persist across sessions.</p>
        </section>

        <section data-section="export" className="help-section">
          <h2>Export</h2>
          <p>Export the current series to <strong>PDF</strong> or <strong>EPUB</strong> from <strong>File → Export</strong> or the command palette.</p>
          <p>The export includes all scenes across all books in their current sort order. Chapter headings and scene breaks are generated automatically.</p>
          <p>PDF output is suitable for review copies and printing. EPUB output is compatible with most e-readers and reading apps.</p>
          <p>Note: embedded images are not yet included in exports — a placeholder appears in their place.</p>
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
            ['Command palette',    ['Ctrl', 'P']],
            ['Save scene',         ['Ctrl', 'S']],
            ['Save all',           ['Ctrl', 'Shift', 'S']],
            ['Close tab',          ['Ctrl', 'W']],
            ['Undo',               ['Ctrl', 'Z']],
            ['Redo',               ['Ctrl', 'Y']],
            ['Find',               ['Ctrl', 'F']],
            ['Find & Replace',     ['Ctrl', 'H']],
            ['Bold',               ['Ctrl', 'B']],
            ['Italic',             ['Ctrl', 'I']],
            ['Underline',          ['Ctrl', 'U']],
            ['Focus mode',         ['F11']],
            ['Settings',           ['Ctrl', ',']],
            ['Help',               ['F1']],
          ]} />
        </section>

        <section data-section="beta" className="help-section">
          <h2>Beta Notes</h2>
          <p>This is an early beta. Known limitations:</p>
          <ul>
            <li><strong>Search is title-only</strong> — the command palette searches scene titles, not scene prose.</li>
            <li><strong>Images not exported</strong> — embedded images are replaced by a text placeholder in PDF and EPUB output.</li>
            <li><strong>Spell check corrections</strong> — misspelled words are underlined but the right-click menu does not offer corrections; type them manually.</li>
            <li><strong>Open tabs reset on restart</strong> — editor tabs are not restored after closing and reopening the app.</li>
            <li><strong>SmartScreen warning</strong> — the installer is not yet code-signed. Click <em>More info → Run anyway</em> to proceed.</li>
          </ul>
          <p>Found a bug or have feedback? Open an issue at <strong>github.com/felenish/TextForge</strong>.</p>
        </section>
      </div>
    </div>
  );
}
