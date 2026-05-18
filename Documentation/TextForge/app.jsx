/* ============================================================
   TextForge Studio — App orchestrator
   ============================================================ */

const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR, useCallback: useC } = React;

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "editorFont": "serif",
  "editorFontSize": 17,
  "editorLineHeight": 1.7,
  "showInspector": true,
  "showMinimap": true
}/*EDITMODE-END*/;

const FONT_FAMILIES = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
};

// ---------------- Title Bar ----------------
function TitleBar({ book, dirtyCount, theme, onCycleTheme, focus, onToggleFocus, onTogglePalette }) {
  return (
    <div className="titlebar">
      <div className="tb-dots">
        <span className="tb-dot r" />
        <span className="tb-dot y" />
        <span className="tb-dot g" />
      </div>
      <div className="tb-menu">
        <button>File</button>
        <button>Edit</button>
        <button>Manuscript</button>
        <button>Version</button>
        <button>View</button>
        <button>Help</button>
      </div>
      <div className="tb-title">
        <span className="accent">{book.title}</span>
        <span style={{ color: "var(--text-faint)" }}> — </span>
        <span>TextForge Studio</span>
        {dirtyCount > 0 ? <span className="dirty"> ●</span> : null}
      </div>
      <div className="tb-actions">
        <button title="Command palette (⌘P)" onClick={onTogglePalette}>
          <Icon name="command" size={14} />
        </button>
        <button title="Focus mode (F11)" onClick={onToggleFocus} className={focus ? "active" : ""}>
          <Icon name="focus" size={14} />
        </button>
        <button title="Cycle theme" onClick={onCycleTheme}>
          <Icon name={theme === "dark" ? "moon" : (theme === "light" ? "sun" : "feather")} size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------- Context Menu ----------------
function ContextMenu({ x, y, type, id, onClose, onAction }) {
  const items = {
    book: [
      { id: "new-chapter", label: "New Chapter", icon: "plus", kbd: "⌘N" },
      { id: "new-character", label: "New Character", icon: "users" },
      { sep: true },
      { id: "rename", label: "Rename Book", icon: "pencil" },
      { id: "settings", label: "Project Settings…", icon: "settings" },
    ],
    chapter: [
      { id: "new-scene", label: "New Scene", icon: "plus", kbd: "⌘N" },
      { id: "rename", label: "Rename Chapter", icon: "pencil", kbd: "F2" },
      { sep: true },
      { id: "duplicate", label: "Duplicate", icon: "copy" },
      { id: "snapshot", label: "Snapshot Before Edit", icon: "history" },
      { sep: true },
      { id: "delete", label: "Delete Chapter", icon: "trash", danger: true },
    ],
    scene: [
      { id: "open", label: "Open Scene", icon: "scene", kbd: "↵" },
      { id: "open-side", label: "Open to the Side", icon: "panel-right" },
      { sep: true },
      { id: "rename", label: "Rename Scene", icon: "pencil", kbd: "F2" },
      { id: "duplicate", label: "Duplicate Scene", icon: "copy" },
      { id: "snapshot", label: "Snapshot This Scene", icon: "history" },
      { sep: true },
      { id: "set-draft", label: "Mark as Draft", icon: "circle" },
      { id: "set-revised", label: "Mark as Revised", icon: "circle" },
      { id: "set-final", label: "Mark as Final", icon: "circle" },
      { sep: true },
      { id: "delete", label: "Delete Scene", icon: "trash", danger: true },
    ],
  }[type] || [];

  // Constrain to viewport
  const style = { left: x, top: y };

  return (
    <React.Fragment>
      <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="context-menu" style={style}>
        {items.map((it, i) =>
          it.sep
            ? <div key={i} className="ctx-sep" />
            : (
              <div
                key={it.id}
                className={"ctx-item " + (it.danger ? "danger" : "")}
                onClick={() => { onAction(it.id, { type, id }); onClose(); }}
              >
                <span className="icon"><Icon name={it.icon} size={13} /></span>
                <span>{it.label}</span>
                {it.kbd ? <span className="kbd">{it.kbd}</span> : null}
              </div>
            )
        )}
      </div>
    </React.Fragment>
  );
}

// ---------------- Command Palette ----------------
function CommandPalette({ book, scenes, onClose, onOpenScene, onSetTheme, onToggleFocus, onToggleTypewriter, onToggleInspector, onToggleMinimap, onSetSidebar }) {
  const [q, setQ] = useS("");
  const [sel, setSel] = useS(0);

  const cmds = useM(() => {
    const out = [];
    // Scenes
    Object.values(scenes).forEach((s) => {
      out.push({ kind: "scene", id: s.id, label: s.title, hint: "scene", action: () => onOpenScene(s.id) });
    });
    // Theme
    ["dark", "light", "sepia"].forEach((t) => {
      out.push({ kind: "cmd", id: "theme-" + t, label: `Theme: ${t.charAt(0).toUpperCase() + t.slice(1)}`, hint: "view", action: () => onSetTheme(t) });
    });
    // Modes
    out.push({ kind: "cmd", id: "focus", label: "View: Toggle Focus Mode", hint: "view", action: onToggleFocus });
    out.push({ kind: "cmd", id: "typewriter", label: "View: Toggle Typewriter Mode", hint: "view", action: onToggleTypewriter });
    out.push({ kind: "cmd", id: "inspector", label: "View: Toggle Inspector", hint: "view", action: onToggleInspector });
    out.push({ kind: "cmd", id: "minimap", label: "View: Toggle Minimap", hint: "view", action: onToggleMinimap });
    out.push({ kind: "cmd", id: "sb-m", label: "Go to Manuscript", hint: "go", action: () => onSetSidebar("manuscript") });
    out.push({ kind: "cmd", id: "sb-c", label: "Go to Characters", hint: "go", action: () => onSetSidebar("characters") });
    out.push({ kind: "cmd", id: "sb-v", label: "Go to Version History", hint: "go", action: () => onSetSidebar("versions") });
    return out;
  }, [scenes]);

  const filtered = useM(() => {
    if (!q.trim()) return cmds.slice(0, 12);
    const ql = q.toLowerCase();
    return cmds.filter((c) => c.label.toLowerCase().includes(ql)).slice(0, 20);
  }, [q, cmds]);

  useE(() => { setSel(0); }, [q]);

  function onKey(e) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(filtered.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter") {
      const c = filtered[sel];
      if (c) { c.action(); onClose(); }
    }
  }

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-row">
          <Icon name="search" size={14} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Find scenes, characters, commands…"
          />
          <span style={{ fontSize: 10, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>ESC</span>
        </div>
        <div className="cmd-results">
          {filtered.length === 0 && (
            <div style={{ padding: 14, color: "var(--text-faint)", fontSize: 12, fontFamily: "var(--font-mono)" }}>No matches.</div>
          )}
          {filtered.map((c, i) => (
            <div key={c.id} className={"cmd-result " + (i === sel ? "active" : "")} onMouseEnter={() => setSel(i)} onClick={() => { c.action(); onClose(); }}>
              <span className="ico"><Icon name={c.kind === "scene" ? "scene" : "command"} size={13} /></span>
              <span className="label">{c.label}</span>
              <span className="hint">{c.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- App ----------------
function App() {
  const { book, scenes: initialScenes, characters, inlineNotes, commits, todos: initialTodos, output } = window.SALT_COAST;

  // Tweaks state
  const [tweaks, setTweak] = useTweaks(DEFAULTS);

  // Editor state
  const [sceneContents, setSceneContents] = useS(() => {
    const m = {};
    Object.values(initialScenes).forEach((s) => { m[s.id] = s.content; });
    return m;
  });
  const [sceneStatus, setSceneStatus] = useS(() => {
    const m = {};
    Object.values(initialScenes).forEach((s) => { m[s.id] = s.status; });
    return m;
  });
  const [dirty, setDirty] = useS([]); // array of scene ids
  const [openIds, setOpenIds] = useS(["sc-tide-at-dawn", "sc-strangers-coin", "sc-crooked-promise"]);
  const [activeId, setActiveId] = useS("sc-tide-at-dawn");
  const [expanded, setExpanded] = useS({ "ch-prologue": false, "ch-1": true, "ch-2": true, "ch-3": true });

  const [sidebarMode, setSidebarMode] = useS("manuscript");
  const [bottomTab, setBottomTab] = useS("wordcount");
  const [showBottom, setShowBottom] = useS(true);
  const [focus, setFocus] = useS(false);
  const [typewriter, setTypewriter] = useS(false);
  const [palette, setPalette] = useS(false);
  const [ctxMenu, setCtxMenu] = useS(null);
  const [todos, setTodos] = useS(initialTodos);
  const [activeCharId, setActiveCharId] = useS(null);

  // Set theme on root
  useE(() => {
    document.documentElement.dataset.theme = tweaks.theme;
  }, [tweaks.theme]);

  // Compute live word counts based on edited content
  const liveScenes = useM(() => {
    const out = {};
    Object.values(initialScenes).forEach((s) => {
      const content = sceneContents[s.id] || s.content;
      const wordCount = content.reduce((n, p) => n + window.SALT_COAST.countWords(p), 0);
      out[s.id] = {
        ...s,
        content,
        wordCount,
        readingMin: window.SALT_COAST.readingMinutes(wordCount),
        status: sceneStatus[s.id] || s.status,
      };
    });
    return out;
  }, [sceneContents, sceneStatus, initialScenes]);

  // Open a scene (or activate if already open)
  function openScene(sid) {
    if (!openIds.includes(sid)) setOpenIds((arr) => [...arr, sid]);
    setActiveId(sid);
    // Make sure containing chapter is expanded
    const ch = book.chapters.find((c) => c.scenes.includes(sid));
    if (ch) setExpanded((m) => ({ ...m, [ch.id]: true }));
  }

  function closeTab(sid) {
    setOpenIds((arr) => {
      const next = arr.filter((x) => x !== sid);
      if (sid === activeId) {
        // pick neighbor
        const idx = arr.indexOf(sid);
        const neighbor = next[idx] || next[idx - 1] || null;
        setActiveId(neighbor);
      }
      return next;
    });
    setDirty((d) => d.filter((x) => x !== sid));
  }

  function onProseChange(sid, paras) {
    setSceneContents((m) => ({ ...m, [sid]: paras }));
    setDirty((d) => (d.includes(sid) ? d : [...d, sid]));
  }

  function setStatus(sid, status) {
    setSceneStatus((m) => ({ ...m, [sid]: status }));
  }

  function toggleChapter(cid) {
    if (cid === "__all_collapse__") {
      const allCollapsed = book.chapters.every((c) => expanded[c.id] === false);
      const next = {};
      book.chapters.forEach((c) => { next[c.id] = allCollapsed; });
      setExpanded(next);
      return;
    }
    setExpanded((m) => ({ ...m, [cid]: !(m[cid] !== false) }));
  }

  function cycleTheme() {
    const order = ["dark", "light", "sepia"];
    const i = order.indexOf(tweaks.theme);
    setTweak("theme", order[(i + 1) % order.length]);
  }

  function toggleTodo(id) {
    setTodos((arr) => arr.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  // Save all (Cmd+S)
  function saveAll() {
    setDirty([]);
  }

  // ---------- Keyboard ----------
  useE(() => {
    function onKey(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveAll();
      } else if (e.key === "F11") {
        e.preventDefault();
        setFocus((f) => !f);
      } else if (e.key === "Escape" && focus) {
        setFocus(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  // Right-click context menu actions
  function onCtxAction(action, payload) {
    if (action === "open") {
      openScene(payload.id);
    } else if (action.startsWith("set-")) {
      const status = action.replace("set-", "");
      setStatus(payload.id, status);
    } else if (action === "snapshot") {
      // no-op, just show effect
    }
    // others: visual-only
  }

  const activeScene = activeId ? liveScenes[activeId] : null;
  const activeChapter = activeScene ? book.chapters.find((c) => c.scenes.includes(activeScene.id)) : null;
  const activeContent = activeScene ? activeScene.content : [];
  const activeNotes = activeScene ? (inlineNotes[activeScene.id] || []) : [];

  const showInspector = tweaks.showInspector !== false;
  const showMinimap = tweaks.showMinimap !== false;
  const fontFamily = FONT_FAMILIES[tweaks.editorFont] || FONT_FAMILIES.serif;

  const dirtyCount = dirty.length;

  return (
    <div className={"shell " + (focus ? "focus-mode " : "") + (typewriter ? "typewriter" : "")}>
      <TitleBar
        book={book}
        dirtyCount={dirtyCount}
        theme={tweaks.theme}
        onCycleTheme={cycleTheme}
        focus={focus}
        onToggleFocus={() => setFocus((f) => !f)}
        onTogglePalette={() => setPalette((p) => !p)}
      />

      <div className={
        "shell-body" +
        (showInspector ? "" : " no-inspector")
      }>
        <ActivityBar active={sidebarMode} onPick={setSidebarMode} dirtyCount={dirtyCount} />

        {sidebarMode === "manuscript" && (
          <ManuscriptSidebar
            book={book}
            scenes={liveScenes}
            activeSceneId={activeId}
            openSceneIds={openIds}
            dirtySceneIds={dirty}
            expandedChapters={expanded}
            onToggleChapter={toggleChapter}
            onOpenScene={openScene}
            onContextMenu={(e, target) => setCtxMenu({ x: e.clientX, y: e.clientY, ...target })}
          />
        )}
        {sidebarMode === "characters" && (
          <CharactersSidebar characters={characters} activeId={activeCharId} onPick={setActiveCharId} />
        )}
        {sidebarMode === "versions" && (
          <VersionsSidebar commits={commits} />
        )}
        {sidebarMode === "search" && (
          <SearchSidebar scenes={liveScenes} onOpenScene={openScene} />
        )}

        <div className={"center-col " + (showBottom ? "" : "no-bottom")}>
          <div className="editor-col">
            <TabStrip
              openIds={openIds}
              scenes={liveScenes}
              activeId={activeId}
              dirty={dirty}
              onPick={setActiveId}
              onClose={closeTab}
            />

            {activeScene && !focus && (
              <Breadcrumb book={book} scene={activeScene} chapter={activeChapter} />
            )}

            {activeScene ? (
              <SceneEditor
                book={book}
                scene={activeScene}
                chapter={activeChapter}
                content={activeContent}
                inlineNotes={activeNotes}
                onProseChange={(paras) => onProseChange(activeScene.id, paras)}
                fontFamily={fontFamily}
                fontSize={tweaks.editorFontSize}
                lineHeight={tweaks.editorLineHeight}
                focus={focus}
                typewriter={typewriter}
                showMinimap={showMinimap}
              />
            ) : (
              <EditorEmpty />
            )}
          </div>

          {showBottom && !focus && (
            <BottomPanel
              tab={bottomTab}
              onTab={setBottomTab}
              output={output}
              todos={todos}
              onToggleTodo={toggleTodo}
              book={book}
              scenes={liveScenes}
              onClose={() => setShowBottom(false)}
            />
          )}
        </div>

        {showInspector && !focus && (
          <Inspector
            scene={activeScene}
            content={activeContent}
            chapter={activeChapter}
            characters={activeScene ? activeScene.characters : []}
            allCharacters={characters}
            onSetStatus={(s) => activeScene && setStatus(activeScene.id, s)}
            wordCount={activeScene?.wordCount || 0}
            readingMin={activeScene?.readingMin || 0}
          />
        )}
      </div>

      <StatusBar
        scene={activeScene}
        wordCount={activeScene?.wordCount || 0}
        readingMin={activeScene?.readingMin || 0}
        dirtyCount={dirtyCount}
        theme={tweaks.theme}
        branch="main"
        focus={focus}
        typewriter={typewriter}
        onTogglePalette={() => setPalette((p) => !p)}
        onToggleFocus={() => setFocus((f) => !f)}
        onToggleTypewriter={() => setTypewriter((t) => !t)}
      />

      {focus && (
        <button className="exit-focus" onClick={() => setFocus(false)}>
          Exit focus · esc
        </button>
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          type={ctxMenu.type}
          id={ctxMenu.id}
          onClose={() => setCtxMenu(null)}
          onAction={onCtxAction}
        />
      )}

      {palette && (
        <CommandPalette
          book={book}
          scenes={liveScenes}
          onClose={() => setPalette(false)}
          onOpenScene={openScene}
          onSetTheme={(t) => setTweak("theme", t)}
          onToggleFocus={() => setFocus((f) => !f)}
          onToggleTypewriter={() => setTypewriter((t) => !t)}
          onToggleInspector={() => setTweak("showInspector", !(tweaks.showInspector !== false))}
          onToggleMinimap={() => setTweak("showMinimap", !(tweaks.showMinimap !== false))}
          onSetSidebar={setSidebarMode}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio
            value={tweaks.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
              { value: "sepia", label: "Sepia" },
            ]}
          />
        </TweakSection>

        <TweakSection label="Editor font">
          <TweakRadio
            value={tweaks.editorFont}
            onChange={(v) => setTweak("editorFont", v)}
            options={[
              { value: "serif", label: "Serif" },
              { value: "sans", label: "Sans" },
              { value: "mono", label: "Mono" },
            ]}
          />
          <TweakSlider
            label="Size"
            value={tweaks.editorFontSize}
            min={13}
            max={24}
            step={1}
            onChange={(v) => setTweak("editorFontSize", v)}
            unit="px"
          />
          <TweakSlider
            label="Line height"
            value={tweaks.editorLineHeight}
            min={1.3}
            max={2.2}
            step={0.05}
            onChange={(v) => setTweak("editorLineHeight", v)}
          />
        </TweakSection>

        <TweakSection label="Panels">
          <TweakToggle label="Show inspector" value={tweaks.showInspector !== false} onChange={(v) => setTweak("showInspector", v)} />
          <TweakToggle label="Show minimap" value={tweaks.showMinimap !== false} onChange={(v) => setTweak("showMinimap", v)} />
        </TweakSection>

      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
