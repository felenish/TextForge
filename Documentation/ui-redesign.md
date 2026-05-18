# TextForge UI Redesign — Implementation Checklist

Based on the Claude Design prototype in `Documentation/TextForge/`.
Fake mock data (Salt Coast book, characters, commits) is ignored — all real data comes from the existing API.

---

## Phase A — Design System & Shell Skeleton

Foundation layer. Everything else builds on top of this.

### A.1 Fonts & CSS Reset
- [x] Add Google Fonts import for JetBrains Mono, Spectral, and Geist
- [x] Replace `index.css` with the full design token system from `styles.css`
- [x] Port all three themes: dark (default), light, sepia via `data-theme` on `<html>`

### A.2 Icon Component
- [x] Create `src/components/ui/Icon.tsx` — TypeScript port of `icons.jsx`
- [x] Include all icons used in the design: book, users, git, search, settings, chev-right, chev-down, folder, scene, plus, minus, refresh, more, filter, branch, history, x, command, focus, moon, sun, feather, type, anchor, pencil, trash, copy, circle, panel-right, minimize

### A.3 Shell Layout
- [x] Create `src/components/layout/Shell.tsx` — CSS grid: `titlebar-h / 1fr / status-h`, full `100vh`
- [x] Create `src/components/layout/ShellBody.tsx` — CSS grid: `activity-w / sidebar-w / 1fr / inspector-w`; variants for `no-inspector` and `no-sidebar`

### A.4 Title Bar
- [x] Create `src/components/layout/TitleBar.tsx`
- [x] Traffic-light dots (decorative, no close/min/max action needed for WebView2)
- [x] Menu buttons: File, Edit, Manuscript, Version, View, Help (non-functional stubs for now)
- [x] Centred book title with dirty indicator `●`
- [x] Right actions: command palette button, focus mode toggle, theme cycle button

### A.5 Status Bar
- [x] Rewrite `src/components/layout/StatusBar.tsx` (currently inline in `AppLayout`)
- [x] Left: branch icon + `main`, save status dot, version stub `v0001`
- [x] Right: word count, reading time, focus toggle, typewriter toggle, palette shortcut, theme label

### A.6 Wire Up & Theme State
- [x] Replace `AppLayout.tsx` with `Shell.tsx` as root layout component
- [x] Thread `theme` state from `App.tsx`; apply `document.documentElement.dataset.theme`
- [x] Build passes, app renders with new chrome

---

## Phase B — Activity Bar & Sidebar Redesign

### B.1 Activity Bar
- [x] Create `src/components/layout/ActivityBar.tsx`
- [x] Four mode buttons: Manuscript (book icon), Characters (users), Versions (git), Search (search)
- [x] Settings button pinned to bottom
- [x] Dirty count badge on Manuscript button
- [x] Active mode highlighted with accent left-border

### B.2 Manuscript Sidebar
- [x] Create `src/components/explorer/ManuscriptSidebar.tsx` (replaces BookExplorer as active manuscript view)
- [x] Header with "Manuscript" label + icon buttons (add chapter, collapse all, more)
- [x] Inline search bar filters tree by scene/chapter title
- [x] Tree: book row → chapter rows → scene rows (with unsaved dot from `dirtySceneIds`)
- [x] Chapter expand/collapse with chevron; all-collapse button
- [x] Scene single-click opens tab; right-click shows context menu with separator + danger delete
- [x] Footer: scene count + chapter count (word count deferred — not in API)
- [x] Book state lifted to Sidebar.tsx so all panels share it; no-book empty state with New/Open buttons

### B.3 Characters Sidebar (stub)
- [x] Create `src/components/explorer/CharactersSidebar.tsx`
- [x] Header with action buttons, search bar, empty state "No characters yet", footer

### B.4 Versions Sidebar (stub)
- [x] Create `src/components/explorer/VersionsSidebar.tsx`
- [x] Header, branch bar showing `main`, empty state, footer

### B.5 Search Sidebar
- [x] Create `src/components/explorer/SearchSidebar.tsx`
- [x] Search input, title-based search across chapters/scenes (full-text deferred to Phase G — no content in API)
- [x] Result rows: scene title + chapter name; click opens tab

### B.6 Context Menus
- [x] Update `ContextMenu.tsx` to support `ContextMenuEntry` union (separator | item)
- [x] Add separator rows (`.ctx-sep`), icon slots, keyboard shortcut label slots
- [x] Danger styling for delete items

---

## Phase C — Editor Area

### C.1 Tab Strip
- [ ] Rewrite `src/components/editor/TabBar.tsx` to match design
- [ ] Scene icon before title
- [ ] Dirty state: show filled dot instead of close button; close button appears on hover when clean
- [ ] Active tab: top accent border, lighter background
- [ ] Tab spacer fills remaining width

### C.2 Breadcrumb
- [ ] Create `src/components/editor/Breadcrumb.tsx`
- [ ] Book icon → book title → `›` → chapter title → `›` → scene title (bold)
- [ ] Right-aligned: live word count + reading time
- [ ] Hidden in focus mode

### C.3 Prose Editor (ContentEditable)
- [ ] Rewrite `src/components/editor/SceneEditor.tsx` to use `contentEditable` div instead of `<textarea>`
- [ ] Scene header (eyebrow + `<h1>` title + location/POV/status meta row) above prose area
- [ ] Each paragraph is a `<p data-i="n">` element
- [ ] `onInput` extracts paragraph text array and calls `onChange`
- [ ] Scene change resets innerHTML without disturbing caret mid-session
- [ ] Inline note `<aside>` elements (non-editable) rendered between paragraphs
- [ ] Ctrl+S still triggers save

### C.4 Scene Header in Editor
- [ ] Display scene title as `<h1>` above the prose (read-only, from scene metadata)
- [ ] Eyebrow line: chapter abbreviation · "scene"
- [ ] Meta row: location · POV character name(s) · status badge
- [ ] Hidden in focus mode

### C.5 Minimap
- [ ] Create `src/components/editor/Minimap.tsx`
- [ ] Render stylised paragraph lines proportional to character count
- [ ] Viewport indicator overlay
- [ ] Toggleable via tweaks/inspector setting

### C.6 Empty State
- [ ] Update editor empty state to match design: `⁂` glyph, "No scene open.", keyboard hint row

---

## Phase D — Inspector Panel

### D.1 Inspector Shell
- [ ] Create `src/components/inspector/Inspector.tsx`
- [ ] Header with "Inspector" label + pin + more buttons
- [ ] Scrollable body with sections
- [ ] "No scene selected." empty state

### D.2 Scene Section
- [ ] Title, chapter abbreviation, location rows
- [ ] Status pills: Draft / Revised / Final — clickable, calls `PATCH /api/scenes/{id}` (scene status)
- [ ] Add `status` field to `SceneDto` and `PATCH /api/scenes/{id}` endpoint

### D.3 Counts Section
- [ ] Words (large accent number), reading time, paragraph count, sentence count, longest paragraph

### D.4 POV & Characters Sections (stubs)
- [ ] Chip grid layout for POV and characters in scene
- [ ] Populated with real data when character system is built (Phase F)

### D.5 Notes Section (stub)
- [ ] Static "Notes & Comments" section with "+ Add a note" prompt

### D.6 Last Snapshot Section (stub)
- [ ] Shows `v0001 · just now` placeholder

---

## Phase E — Bottom Panel

### E.1 Bottom Panel Shell
- [ ] Create `src/components/panels/BottomPanel.tsx`
- [ ] Tab strip: Word Count, Notes, Output, Problems
- [ ] Maximize + close buttons
- [ ] Collapsible (hidden when closed, restored by status bar or keyboard)

### E.2 Word Count Tab
- [ ] Four stat cards: Manuscript total, Today, 7-day avg, Est. completion (stubs for avg/est)
- [ ] Word count bar chart per chapter (real data from book chapters + scene word counts)

### E.3 Notes / To-Do Tab
- [ ] Checkbox list of notes/todos
- [ ] Persisted locally (localStorage) until a proper API is added

### E.4 Output Tab
- [ ] Display structured log lines (timestamp, level, message)
- [ ] Wire to console-captured API errors and save events

### E.5 Problems Tab
- [ ] Static hints for now (scene below word target, repeated beat detection stubs)

---

## Phase F — Command Palette & Modes

### F.1 Command Palette
- [ ] Create `src/components/ui/CommandPalette.tsx`
- [ ] Ctrl+P / ⌘P to open; Escape to close
- [ ] Fuzzy search over: open scenes (from book explorer), theme commands, view toggle commands
- [ ] Keyboard navigation: ↑↓ arrows, Enter to execute
- [ ] Replace existing `Ctrl+P` behaviour if any

### F.2 Focus Mode
- [ ] F11 or focus button toggles focus mode
- [ ] Hides: title bar menu, sidebar, inspector, bottom panel, breadcrumb, scene header
- [ ] Shows: "Exit focus · esc" floating button
- [ ] Escape exits focus mode
- [ ] CSS class `.focus-mode` on shell drives hiding via existing CSS

### F.3 Typewriter Mode
- [ ] Toggle from status bar or command palette
- [ ] Adds `.is-current` class to the paragraph containing the caret
- [ ] CSS fades all non-current paragraphs to `--text-faint`
- [ ] Tracks `selectionchange` event

### F.4 Tweaks Panel
- [ ] Create `src/components/ui/TweaksPanel.tsx` — floating bottom-right panel
- [ ] Theme radio: Dark / Light / Sepia
- [ ] Editor font radio: Serif (Spectral) / Sans (Geist) / Mono (JetBrains Mono)
- [ ] Font size slider: 13–24 px
- [ ] Line height slider: 1.3–2.2
- [ ] Inspector toggle
- [ ] Minimap toggle
- [ ] Persist settings to `localStorage`

---

## Phase G — Scene Status API

*Required by Inspector (Phase D) — small backend addition.*

- [ ] Add `Status` field (`draft` | `revised` | `final`) to `SceneManifest` and `Scene` domain model
- [ ] Expose `status` in `SceneDto`
- [ ] `PATCH /api/scenes/{id}` already exists for rename — extend body to also accept `status`
- [ ] Default status: `draft`
- [ ] Status dot in sidebar tree uses real data

---

## Deferred (Post-Redesign)

These require new backend work beyond the UI and are out of scope for the redesign:

- [ ] **Characters system** — `POST/GET /api/books/{id}/characters`, character sidebar real data
- [ ] **Version history** — snapshot/restore API, versions sidebar real data
- [ ] **Full-text search** — server-side search across all scene files
- [ ] **Inline notes** — per-paragraph comment API
- [ ] **Daily word count tracking** — write session log
- [ ] **Export** — PDF/EPUB pipeline
