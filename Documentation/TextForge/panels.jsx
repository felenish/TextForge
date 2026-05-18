/* ============================================================
   TextForge Studio — Inspector + Bottom panel + Status bar
   ============================================================ */

// ---------------- Inspector ----------------
function Inspector({ scene, content, chapter, characters, allCharacters, onSetStatus, wordCount, readingMin }) {
  if (!scene) {
    return (
      <div className="inspector">
        <div className="insp-header"><span>Inspector</span></div>
        <div style={{ padding: 24, color: "var(--text-faint)", fontSize: 12, textAlign: "center" }}>
          No scene selected.
        </div>
      </div>
    );
  }
  const statuses = [
    { id: "draft", label: "Draft" },
    { id: "revised", label: "Revised" },
    { id: "final", label: "Final" },
  ];

  const paraCount = content.length;
  const sentenceCount = content.reduce((n, p) => n + (p.match(/[.!?]+/g)?.length || 0), 0);
  const longest = content.reduce((mx, p) => Math.max(mx, p.length), 0);

  return (
    <div className="inspector">
      <div className="insp-header">
        <span>Inspector</span>
        <div style={{ display: "flex", gap: 2 }}>
          <button style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", borderRadius: 3 }} title="Pin"><Icon name="anchor" size={12} /></button>
          <button style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", borderRadius: 3 }} title="More"><Icon name="more" size={14} /></button>
        </div>
      </div>
      <div className="insp-body">

        <div className="insp-section">
          <h4>Scene</h4>
          <div className="insp-row"><span className="k">Title</span><span className="v" style={{ fontFamily: "var(--font-serif)", fontSize: 14 }}>{scene.title}</span></div>
          <div className="insp-row"><span className="k">Chapter</span><span className="v">{chapter?.title.replace(/^Chapter \d+ — /, "Ch. ").replace(/^Chapter /, "Ch. ")}</span></div>
          <div className="insp-row"><span className="k">Location</span><span className="v" style={{ fontFamily: "var(--font-serif)" }}>{scene.location}</span></div>
          <div className="insp-row">
            <span className="k">Status</span>
            <div className="status-pill-row">
              {statuses.map((s) => (
                <div
                  key={s.id}
                  className={"status-pill " + s.id + " " + (scene.status === s.id ? "active" : "")}
                  onClick={() => onSetStatus(s.id)}
                >
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="insp-section">
          <h4>Point of View</h4>
          <div className="chip-grid">
            {scene.pov.map((pid) => {
              const ch = allCharacters.find((c) => c.id === pid);
              if (!ch) return null;
              return (
                <span key={pid} className="chip">
                  <span className="chip-avatar" style={{ background: ch.avatarColor }}>{ch.initials}</span>
                  {ch.name}
                </span>
              );
            })}
          </div>
        </div>

        <div className="insp-section">
          <h4>Characters in scene</h4>
          <div className="chip-grid">
            {scene.characters.filter((c) => !scene.pov.includes(c)).map((cid) => {
              const ch = allCharacters.find((c) => c.id === cid);
              if (!ch) return null;
              return (
                <span key={cid} className="chip">
                  <span className="chip-avatar" style={{ background: ch.avatarColor }}>{ch.initials}</span>
                  {ch.name}
                </span>
              );
            })}
            <span className="chip-add">+ Add</span>
          </div>
        </div>

        <div className="insp-section">
          <h4>Counts</h4>
          <div className="insp-row"><span className="k">Words</span><span className="v accent" style={{ fontFamily: "var(--font-serif)", fontSize: 18 }}>{wordCount.toLocaleString()}</span></div>
          <div className="insp-row"><span className="k">Reading time</span><span className="v">{readingMin} min</span></div>
          <div className="insp-row"><span className="k">Paragraphs</span><span className="v">{paraCount}</span></div>
          <div className="insp-row"><span className="k">Sentences</span><span className="v">~{sentenceCount}</span></div>
          <div className="insp-row"><span className="k">Longest ¶</span><span className="v">{longest} chars</span></div>
        </div>

        <div className="insp-section">
          <h4>Notes &amp; Comments</h4>
          <div className="notes-list">
            <div className="note-item">
              <div className="note-by"><span>Marin</span><span>May 12</span></div>
              <div>Watch the rhythm — three "kind of" repetitions in the first half. Consider trimming the middle one.</div>
            </div>
            <div className="note-item">
              <div className="note-by"><span>Editor</span><span>May 14</span></div>
              <div>Beat to land: Edda not touching the coin should be louder. Maybe one more sentence of silence before her line.</div>
            </div>
            <div className="note-add">+ Add a note on this scene</div>
          </div>
        </div>

        <div className="insp-section" style={{ borderBottom: "none" }}>
          <h4>Last Snapshot</h4>
          <div className="insp-row">
            <span className="k">v0014</span>
            <span className="v" style={{ color: "var(--text-faint)" }}>16 min ago</span>
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.45 }}>
            "Tightened Edda's warning; cut three lines of throat-clearing in the cottage scene."
          </div>
        </div>

      </div>
    </div>
  );
}
window.Inspector = Inspector;

// ---------------- Bottom Panel ----------------
function BottomPanel({ tab, onTab, output, todos, onToggleTodo, book, scenes, onClose }) {
  const tabs = [
    { id: "wordcount", label: "Word Count" },
    { id: "notes", label: "Notes", count: todos.filter((t) => !t.done).length },
    { id: "output", label: "Output" },
    { id: "problems", label: "Problems" },
  ];

  const totalWords = Object.values(scenes).reduce((n, s) => n + s.wordCount, 0);
  const targetWords = 90000;
  const todayWords = 1124;

  return (
    <div className="bottom">
      <div className="bottom-tabs">
        {tabs.map((t) => (
          <div key={t.id} className={"bottom-tab " + (tab === t.id ? "active" : "")} onClick={() => onTab(t.id)}>
            <span>{t.label}</span>
            {t.count ? <span className="count">{t.count}</span> : null}
          </div>
        ))}
        <div className="bottom-actions">
          <button title="Maximize"><Icon name="minimize" size={12} /></button>
          <button title="Hide panel" onClick={onClose}><Icon name="x" size={13} /></button>
        </div>
      </div>
      <div className="bottom-body">

        {tab === "wordcount" && (
          <React.Fragment>
            <div className="wc-grid">
              <div className="wc-card">
                <div className="label">Manuscript</div>
                <div className="num">{totalWords.toLocaleString()}</div>
                <div className="sub">{Math.round((totalWords / targetWords) * 100)}% of {targetWords.toLocaleString()} target</div>
              </div>
              <div className="wc-card">
                <div className="label">Today</div>
                <div className="num">+{todayWords.toLocaleString()}</div>
                <div className="sub">across 3 scenes</div>
              </div>
              <div className="wc-card">
                <div className="label">7-day avg</div>
                <div className="num">847</div>
                <div className="sub">words / day</div>
              </div>
              <div className="wc-card">
                <div className="label">Est. completion</div>
                <div className="num">Jul 14</div>
                <div className="sub">at current pace</div>
              </div>
            </div>
            <div className="wc-bars">
              <h5>Words by chapter</h5>
              {book.chapters.map((ch) => {
                const w = ch.scenes.reduce((n, sid) => n + (scenes[sid]?.wordCount || 0), 0);
                const max = book.chapters.reduce((m, c) => Math.max(m, c.scenes.reduce((n, sid) => n + (scenes[sid]?.wordCount || 0), 0)), 1);
                return (
                  <div className="wc-bar" key={ch.id}>
                    <span className="name">{ch.title.replace(/^Chapter \d+ — /, "")}</span>
                    <span className="bar"><i style={{ width: (w / max * 100) + "%" }} /></span>
                    <span className="count">{w.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        )}

        {tab === "notes" && (
          <div className="notes-board">
            {todos.map((t) => (
              <div key={t.id} className={"nb-item " + (t.done ? "done" : "")} onClick={() => onToggleTodo(t.id)}>
                <span className="check" />
                <span className="text">{t.text}</span>
                <span className="where">{t.where}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "output" && (
          <div>
            {output.map((line, i) => (
              <div key={i} className={"output-line " + line.lvl}>
                <span className="ts">{line.ts}</span>
                <span className="lvl">{line.lvl}</span>
                <span className="msg">
                  {line.parts.map((p, j) =>
                    p[0] === "accent"
                      ? <span key={j} className="accent">{p[1]}</span>
                      : <span key={j}>{p[0]}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "problems" && (
          <div style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            <div className="output-line warn" style={{ padding: "2px 0" }}>
              <span className="lvl">hint</span>
              <span className="msg"><span className="accent">A Crooked Promise</span> · scene ends on a beat that already happens in scene 1. Consider trimming or merging.</span>
            </div>
            <div className="output-line warn" style={{ padding: "2px 0" }}>
              <span className="lvl">hint</span>
              <span className="msg"><span className="accent">Leaving Tideholm</span> · sub-target (currently 142 words; target ≥ 600).</span>
            </div>
            <div className="output-line info" style={{ padding: "2px 0" }}>
              <span className="lvl">note</span>
              <span className="msg">Character <span className="accent">Hesper of the Heron</span> appears in only 1 scene — consider expanding or cutting.</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
window.BottomPanel = BottomPanel;

// ---------------- Status Bar ----------------
function StatusBar({ scene, wordCount, readingMin, dirtyCount, theme, branch, focus, typewriter, onTogglePalette, onToggleFocus, onToggleTypewriter }) {
  return (
    <div className="statusbar">
      <div className="sb-item accent">
        <Icon name="branch" size={11} />
        <span>{branch}</span>
      </div>
      <div className="sb-item">
        <span className="dot" style={{ background: dirtyCount > 0 ? "var(--accent)" : "var(--status-final)" }} />
        <span>{dirtyCount > 0 ? `${dirtyCount} unsaved` : "All saved"}</span>
      </div>
      <div className="sb-item">
        <Icon name="history" size={11} />
        <span>v0014</span>
      </div>

      <div className="spacer" />

      {scene && (
        <React.Fragment>
          <div className="sb-item">
            <span style={{ color: "var(--text-faint)" }}>POV</span>
            <span>{scene.pov.map((p) => window.SALT_COAST.characters.find((c) => c.id === p)?.name.split(" ")[0]).join("/")}</span>
          </div>
          <div className="sb-item">
            <span>{wordCount.toLocaleString()}</span>
            <span style={{ color: "var(--text-faint)" }}>words</span>
          </div>
          <div className="sb-item">
            <span>{readingMin}</span>
            <span style={{ color: "var(--text-faint)" }}>min read</span>
          </div>
        </React.Fragment>
      )}

      <div className={"sb-item " + (focus ? "accent" : "")} onClick={onToggleFocus} title="Focus mode (F11)">
        <Icon name="focus" size={11} />
        <span>{focus ? "Focus" : "Focus"}</span>
      </div>
      <div className={"sb-item " + (typewriter ? "accent" : "")} onClick={onToggleTypewriter} title="Typewriter mode">
        <Icon name="type" size={11} />
        <span>Typewriter</span>
      </div>
      <div className="sb-item" onClick={onTogglePalette}>
        <Icon name="command" size={11} />
        <span>⌘P</span>
      </div>
      <div className="sb-item">
        <span style={{ color: "var(--text-faint)" }}>{theme}</span>
      </div>
    </div>
  );
}
window.StatusBar = StatusBar;
