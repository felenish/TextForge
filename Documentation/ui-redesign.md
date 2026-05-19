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
- [x] TabBar.tsx already matches design (scene icon, dirty dot, tab-spacer)
- [x] Close button hidden by default; appears on tab hover only (CSS updated)
- [x] Active tab: top accent border, lighter background (CSS was already correct)

### C.2 Breadcrumb
- [x] Create `src/components/editor/Breadcrumb.tsx`
- [x] Book icon → book title (from WorkspaceContext) → `›` → scene title (chapter deferred until BookContext exists)
- [x] Right-aligned: live word count + reading time (200 wpm)
- [x] Hidden in focus mode via existing `.shell.focus-mode .breadcrumb { display: none }`

### C.3 Prose Editor (ContentEditable)
- [x] Rewrite `src/components/editor/SceneEditor.tsx` to use `contentEditable` div
- [x] Scene header (eyebrow "scene" + `<h1>` title) above prose; meta row deferred to Phase G (no API data)
- [x] Paragraphs rendered as `<p>` elements via innerHTML; `onInput` extracts and rejoins with `\n\n`
- [x] Scene change resets innerHTML only when sceneId or loading changes (content excluded from deps)
- [x] Ctrl+S still triggers save; saving/saved status bar retained

### C.4 Scene Header in Editor
- [x] Eyebrow "scene" + `<h1>` scene title rendered above prose area
- [x] Location/POV/status meta row deferred to Phase G (requires status field in API)
- [x] Scene head hidden in focus mode via `.shell.focus-mode .editor-doc.focus` (focus adds padding, no explicit hide needed)

### C.5 Minimap
- [x] Create `src/components/editor/Minimap.tsx`
- [x] Paragraph lines rendered proportional to character count; viewport indicator overlay
- [x] Click-to-scroll: clicks map to scrollEl offset
- [x] Wire into SceneEditor as toggleable panel (deferred to Tweaks Panel, Phase F.4)

### C.6 Empty State
- [x] Updated `SceneEditorArea` empty state: `⁂` glyph, "No scene open.", keyboard hint

---

## Phase D — Inspector Panel

### D.1 Inspector Shell
- [x] Create `src/components/inspector/Inspector.tsx`
- [x] Header with "Inspector" label
- [x] Scrollable body with sections
- [x] "No scene selected." empty state

### D.2 Scene Section
- [x] Title row
- [x] Status pills: Draft / Revised / Final — clickable, calls `PATCH /api/scenes/{id}`

### D.3 Counts Section
- [x] Words, reading time, paragraph count, sentence count

### D.4 POV & Characters Sections (stubs)
- [x] Chip grid layout for characters in scene stub
- [x] POV row stub

### D.5 Notes Section (stub)
- [x] Static "Notes & Comments" section with "+ Add a note" prompt

### D.6 Last Snapshot Section (stub)
- [x] Shows "None" placeholder

---

## Phase E — Bottom Panel

### E.1 Bottom Panel Shell
- [x] Create `src/components/panels/BottomPanel.tsx`
- [x] Tab strip: Word Count, Notes, Output, Problems
- [x] Close button; toggle via status bar word count click or panel icon
- [x] Collapsible via `bottomOpen` state in AppLayout; `center-col.no-bottom` collapses the grid row

### E.2 Word Count Tab
- [x] Four stat cards: Manuscript total (open scenes), Active scene, Today (stub), Est. completion (stub)
- [x] Word count bar chart per chapter (real data: `sceneWordCounts` map in WorkspaceContext; closes show 0)
- [x] `totalWordCount` + per-scene tracking via `setSceneWordCount`/`clearSceneWordCount` in WorkspaceContext

### E.3 Notes / To-Do Tab
- [x] Checkbox list of notes/todos with delete button
- [x] Persisted to `localStorage` key `tf-notes`
- [x] Add note via input + Enter

### E.4 Output Tab
- [x] Display structured log lines (timestamp, level, message) from `OutputContext`
- [x] Save events wired: Ctrl+S in SceneEditor logs ok/warn to output
- [x] Auto-scroll to bottom on new line; clear button

### E.5 Problems Tab
- [x] Stub: "No problems detected."

---

## Phase F — Command Palette & Modes

### F.1 Command Palette
- [x] Create `src/components/ui/CommandPalette.tsx`
- [x] Ctrl+P / ⌘P to open; Escape to close
- [x] Fuzzy search over: open scenes (from book explorer), theme commands, view toggle commands
- [x] Keyboard navigation: ↑↓ arrows, Enter to execute
- [x] Replace existing `Ctrl+P` behaviour if any

### F.2 Focus Mode
- [x] F11 or focus button toggles focus mode
- [x] Hides: title bar menu, sidebar, inspector, bottom panel, breadcrumb, scene header
- [x] Shows: "Exit focus · esc" floating button
- [x] Escape exits focus mode
- [x] CSS class `.focus-mode` on shell drives hiding via existing CSS

### F.3 Typewriter Mode
- [x] Toggle from status bar or command palette
- [x] Adds `.is-current` class to the paragraph containing the caret
- [x] CSS fades all non-current paragraphs to `--text-faint`
- [x] Tracks `selectionchange` event

### F.4 Tweaks Panel
- [x] Create `src/components/ui/TweaksPanel.tsx` — floating bottom-right panel
- [x] Theme radio: Dark / Light / Sepia
- [x] Editor font radio: Serif (Spectral) / Sans (Geist) / Mono (JetBrains Mono)
- [x] Font size slider: 13–24 px
- [x] Line height slider: 1.3–2.2
- [x] Inspector toggle
- [x] Minimap toggle
- [x] Persist settings to `localStorage`

---

## Phase G — Scene Status API

*Required by Inspector (Phase D) — small backend addition.*

- [x] Add `Status` field (`draft` | `revised` | `final`) to `SceneManifest` and `Scene` domain model
- [x] Expose `status` in `SceneDto`
- [x] `PATCH /api/scenes/{id}` extended to accept `status`
- [x] Default status: `draft`
- [x] Status dot in sidebar tree uses real data

---

## Deferred (Post-Redesign)

These require new backend work beyond the UI and are out of scope for the redesign:

- [ ] **Characters system** — `POST/GET /api/books/{id}/characters`, character sidebar real data
- [ ] **Version history** — snapshot/restore API, versions sidebar real data
- [ ] **Full-text search** — server-side search across all scene files
- [ ] **Inline notes** — per-paragraph comment API
- [ ] **Daily word count tracking** — write session log
- [ ] **Export** — PDF/EPUB pipeline
