/* ============================================================
   TextForge Studio — Activity bar + Sidebars
   ============================================================ */

const { useState, useMemo, useEffect, useRef } = React;

// ---------------- Activity Bar ----------------
function ActivityBar({ active, onPick, dirtyCount }) {
  const items = [
    { id: "manuscript", icon: "book", label: "Manuscript" },
    { id: "characters", icon: "users", label: "Characters" },
    { id: "versions",   icon: "git",   label: "Version History" },
    { id: "search",     icon: "search", label: "Search" },
  ];
  return (
    <div className="activity">
      {items.map((it) => (
        <button
          key={it.id}
          className={"act-btn " + (active === it.id ? "active" : "")}
          title={it.label}
          onClick={() => onPick(it.id)}
        >
          <Icon name={it.icon} size={20} />
          {it.id === "manuscript" && dirtyCount > 0 ? <span className="badge">{dirtyCount}</span> : null}
        </button>
      ))}
      <div className="spacer" />
      <button className="act-btn" title="Settings">
        <Icon name="settings" size={20} />
      </button>
    </div>
  );
}
window.ActivityBar = ActivityBar;

// ---------------- Manuscript Sidebar ----------------
function ManuscriptSidebar({
  book,
  scenes,
  activeSceneId,
  openSceneIds,
  dirtySceneIds,
  expandedChapters,
  onToggleChapter,
  onOpenScene,
  onContextMenu,
}) {
  const totalScenes = book.chapters.reduce((n, c) => n + c.scenes.length, 0);
  const totalWords = Object.values(scenes).reduce((n, s) => n + s.wordCount, 0);

  return (
    <div className="sidebar">
      <div className="sb-header">
        <span>Manuscript</span>
        <div className="actions">
          <button title="New chapter" onClick={(e) => onContextMenu(e, { type: "book", id: book.id })}>
            <Icon name="plus" size={14} />
          </button>
          <button title="Collapse all" onClick={() => onToggleChapter("__all_collapse__")}>
            <Icon name="minus" size={14} />
          </button>
          <button title="Refresh">
            <Icon name="refresh" size={13} />
          </button>
          <button title="More">
            <Icon name="more" size={14} />
          </button>
        </div>
      </div>

      <div className="sb-search">
        <Icon name="search" size={12} />
        <input placeholder="Find in manuscript…" />
        <span style={{ fontSize: 10, color: "var(--text-faint)" }}>⌘P</span>
      </div>

      <div className="sb-body">
        <div className="tree">
          <div
            className="tree-row is-book"
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, { type: "book", id: book.id }); }}
          >
            <span className="chev open"><Icon name="chev-right" size={11} /></span>
            <span className="icon"><Icon name="book" size={13} /></span>
            <span className="label" style={{ color: "var(--text-strong)", fontWeight: 500 }}>{book.title}</span>
            <span className="meta-right">{totalScenes} scenes</span>
          </div>

          {book.chapters.map((ch) => {
            const open = expandedChapters[ch.id] !== false;
            const chWords = ch.scenes.reduce((n, sid) => n + (scenes[sid]?.wordCount || 0), 0);
            return (
              <React.Fragment key={ch.id}>
                <div
                  className="tree-row is-chapter"
                  style={{ paddingLeft: 22 }}
                  onClick={() => onToggleChapter(ch.id)}
                  onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, { type: "chapter", id: ch.id }); }}
                >
                  <span className={"chev " + (open ? "open" : "")}>
                    <Icon name="chev-right" size={11} />
                  </span>
                  <span className="icon"><Icon name="folder" size={13} /></span>
                  <span className="label" style={{ color: "var(--text)" }}>{ch.title}</span>
                  <span className="meta-right">{chWords.toLocaleString()}w</span>
                </div>

                {open && ch.scenes.map((sid) => {
                  const sc = scenes[sid];
                  if (!sc) return null;
                  const isActive = sid === activeSceneId;
                  const isOpen = openSceneIds.includes(sid);
                  const isDirty = dirtySceneIds.includes(sid);
                  return (
                    <div
                      key={sid}
                      className={"tree-row is-scene " + (isActive ? "active" : "")}
                      style={{ paddingLeft: 42 }}
                      onClick={() => onOpenScene(sid)}
                      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, { type: "scene", id: sid }); }}
                    >
                      <span className="chev leaf"><Icon name="chev-right" size={11} /></span>
                      <span className="icon">
                        <Icon name="scene" size={12} />
                      </span>
                      <span className="label" style={{ fontStyle: isOpen ? "normal" : "normal", color: isOpen ? "var(--text-strong)" : "var(--text)" }}>{sc.title}</span>
                      <span className={"dot " + sc.status} title={sc.status} />
                      {isDirty ? <span className="unsaved" title="unsaved" /> : null}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="sb-footer">
        <span><span className="num">{totalScenes}</span> scenes</span>
        <span><span className="num">{totalWords.toLocaleString()}</span> words</span>
      </div>
    </div>
  );
}
window.ManuscriptSidebar = ManuscriptSidebar;

// ---------------- Characters Sidebar ----------------
function CharactersSidebar({ characters, activeId, onPick }) {
  return (
    <div className="sidebar">
      <div className="sb-header">
        <span>Characters</span>
        <div className="actions">
          <button title="New character"><Icon name="plus" size={14} /></button>
          <button title="Filter"><Icon name="filter" size={13} /></button>
          <button title="More"><Icon name="more" size={14} /></button>
        </div>
      </div>
      <div className="sb-search">
        <Icon name="search" size={12} />
        <input placeholder="Filter characters…" />
      </div>
      <div className="sb-body">
        <div className="char-list">
          {characters.filter((c) => c.id !== "narrator").map((c) => (
            <div
              key={c.id}
              className={"char-row " + (activeId === c.id ? "active" : "")}
              onClick={() => onPick(c.id)}
            >
              <div className="char-avatar" style={{ background: c.avatarColor }}>{c.initials}</div>
              <div className="char-meta">
                <div className="char-name">{c.name}</div>
                <div className="char-role">{c.role} · {c.appearsIn.length} scenes</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sb-footer">
        <span><span className="num">{characters.filter((c) => c.id !== "narrator").length}</span> characters</span>
        <span>{characters.filter((c) => c.role === "Protagonist" || c.role === "Antagonist").length} principal</span>
      </div>
    </div>
  );
}
window.CharactersSidebar = CharactersSidebar;

// ---------------- Versions Sidebar ----------------
function VersionsSidebar({ commits }) {
  return (
    <div className="sidebar">
      <div className="sb-header">
        <span>Version History</span>
        <div className="actions">
          <button title="New snapshot"><Icon name="plus" size={14} /></button>
          <button title="Filter"><Icon name="filter" size={13} /></button>
          <button title="More"><Icon name="more" size={14} /></button>
        </div>
      </div>

      <div className="versions-branch-bar" title="Current branch">
        <span className="br-icon"><Icon name="branch" size={13} /></span>
        <span className="br-name">main</span>
        <span style={{ color: "var(--text-faint)", fontSize: 10 }}>2 branches</span>
        <span className="br-chev"><Icon name="chev-down" size={11} /></span>
      </div>

      <div className="sb-body">
        <div className="commits">
          {commits.map((c) => {
            if (c.branchMarker) {
              return (
                <div key={c.id} className="commit-row branch-marker">
                  ↳ {c.msg}
                </div>
              );
            }
            return (
              <div key={c.id} className={"commit-row " + (c.branch !== "main" ? "branch" : "")}>
                <div className="commit-rail"><div className="commit-dot" /></div>
                <div className="commit-body">
                  <div className="commit-msg">{c.msg}</div>
                  <div className="commit-meta">
                    <span className="hash">{c.id}</span>
                    <span>{c.author}</span>
                    <span>·</span>
                    <span>{c.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sb-footer">
        <span><span className="num">14</span> snapshots</span>
        <span>main</span>
      </div>
    </div>
  );
}
window.VersionsSidebar = VersionsSidebar;

// ---------------- Search Sidebar (simple) ----------------
function SearchSidebar({ scenes, onOpenScene }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const ql = q.toLowerCase();
    const out = [];
    Object.values(scenes).forEach((s) => {
      s.content.forEach((p, i) => {
        const idx = p.toLowerCase().indexOf(ql);
        if (idx >= 0) {
          out.push({
            sceneId: s.id, sceneTitle: s.title,
            preview: p.slice(Math.max(0, idx - 30), idx + ql.length + 50),
            i,
          });
        }
      });
    });
    return out.slice(0, 30);
  }, [q, scenes]);

  return (
    <div className="sidebar">
      <div className="sb-header">
        <span>Search</span>
      </div>
      <div className="sb-search">
        <Icon name="search" size={12} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search manuscript…" autoFocus />
      </div>
      <div className="sb-body">
        {results.length === 0 && q.trim() ? (
          <div style={{ padding: "20px 14px", color: "var(--text-faint)", fontSize: 12 }}>No matches.</div>
        ) : null}
        {results.map((r, i) => (
          <div key={i} className="tree-row is-scene" onClick={() => onOpenScene(r.sceneId)}>
            <span className="chev leaf" />
            <span className="icon"><Icon name="scene" size={12} /></span>
            <span className="label" style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 4, paddingBottom: 4, overflow: "hidden" }}>
              <span style={{ fontSize: 11, color: "var(--text)" }}>{r.sceneTitle}</span>
              <span style={{ fontSize: 10, color: "var(--text-faint)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>…{r.preview}…</span>
            </span>
          </div>
        ))}
      </div>
      <div className="sb-footer">
        <span><span className="num">{results.length}</span> matches</span>
      </div>
    </div>
  );
}
window.SearchSidebar = SearchSidebar;
