/* ============================================================
   TextForge Studio — Editor: tabs, breadcrumb, prose, minimap
   ============================================================ */

const { useState: useState_E, useEffect: useEffect_E, useRef: useRef_E, useMemo: useMemo_E, useCallback } = React;

// ---------------- Tabs ----------------
function TabStrip({ openIds, scenes, activeId, dirty, onPick, onClose }) {
  return (
    <div className="tabs">
      {openIds.map((sid) => {
        const sc = scenes[sid];
        if (!sc) return null;
        const isActive = sid === activeId;
        const isDirty = dirty.includes(sid);
        return (
          <div
            key={sid}
            className={"tab " + (isActive ? "active" : "")}
            onClick={() => onPick(sid)}
            title={sc.title}
          >
            <span className="tab-icon"><Icon name="scene" size={12} /></span>
            <span>{sc.title}</span>
            {isDirty ? (
              <span className="tab-dirty" title="unsaved" />
            ) : (
              <button
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); onClose(sid); }}
                title="Close"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
        );
      })}
      <div className="tab-spacer" />
    </div>
  );
}
window.TabStrip = TabStrip;

// ---------------- Breadcrumb ----------------
function Breadcrumb({ book, scene, chapter }) {
  if (!scene || !chapter) return null;
  return (
    <div className="breadcrumb">
      <span className="crumb"><Icon name="book" size={11} /></span>
      <span className="crumb">{book.title}</span>
      <span className="sep"><Icon name="chev-right" size={10} /></span>
      <span className="crumb">{chapter.title}</span>
      <span className="sep"><Icon name="chev-right" size={10} /></span>
      <span className="crumb current">{scene.title}</span>
      <span style={{ flex: 1 }} />
      <span style={{ color: "var(--text-faint)" }}>
        {scene.wordCount.toLocaleString()} words · {scene.readingMin} min read
      </span>
    </div>
  );
}
window.Breadcrumb = Breadcrumb;

// ---------------- Prose Editor (uncontrolled contenteditable) ----------------
function ProseEditor({ scene, inlineNotes = [], onChange, fontFamily, fontSize, lineHeight, typewriter }) {
  const ref = useRef_E(null);
  const lastSceneId = useRef_E(null);

  // Initialize HTML whenever the scene changes (but NOT on every keystroke,
  // so caret stays put).
  useEffect_E(() => {
    if (!ref.current) return;
    if (lastSceneId.current === scene.id) return;
    lastSceneId.current = scene.id;

    // build inline-notes index by paragraph
    const notesByAfter = {};
    inlineNotes.forEach((n) => {
      notesByAfter[n.afterPara] = notesByAfter[n.afterPara] || [];
      notesByAfter[n.afterPara].push(n);
    });

    const escape = (s) => s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const parts = [];
    scene.content.forEach((para, i) => {
      parts.push(`<p data-i="${i}">${escape(para)}</p>`);
      if (notesByAfter[i]) {
        notesByAfter[i].forEach((n) => {
          parts.push(
            `<aside class="inline-note" contenteditable="false">
               <div class="note-eyebrow"><span>note · ${escape(n.author)}</span><span>${escape(n.date)}</span></div>
               <div>${escape(n.text)}</div>
             </aside>`
          );
        });
      }
    });
    ref.current.innerHTML = parts.join("");
  }, [scene.id, inlineNotes]);

  // Typewriter focus: mark current paragraph
  useEffect_E(() => {
    if (!ref.current) return;
    const root = ref.current;
    function updateCurrent() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node = sel.getRangeAt(0).startContainer;
      while (node && node !== root && node.nodeName !== "P") {
        node = node.parentNode;
      }
      root.querySelectorAll("p.is-current").forEach((p) => p.classList.remove("is-current"));
      if (node && node.nodeName === "P") node.classList.add("is-current");
    }
    if (typewriter) {
      updateCurrent();
      document.addEventListener("selectionchange", updateCurrent);
      return () => document.removeEventListener("selectionchange", updateCurrent);
    } else {
      root.querySelectorAll("p.is-current").forEach((p) => p.classList.remove("is-current"));
    }
  }, [typewriter, scene.id]);

  function handleInput() {
    if (!ref.current) return;
    const paras = Array.from(ref.current.querySelectorAll("p")).map((p) => p.textContent || "");
    onChange(paras);
  }

  return (
    <div
      ref={ref}
      className="prose prose-editable"
      contentEditable
      suppressContentEditableWarning
      spellCheck
      onInput={handleInput}
      style={{
        fontFamily,
        fontSize: fontSize + "px",
        lineHeight,
      }}
    />
  );
}
window.ProseEditor = ProseEditor;

// ---------------- Scene Empty State ----------------
function EditorEmpty() {
  return (
    <div className="editor-empty">
      <div className="glyph">⁂</div>
      <div>No scene open.</div>
      <div style={{ fontSize: 11 }}>Pick a scene from the Manuscript explorer, or open the command palette.</div>
      <div className="kb">
        <kbd>⌘</kbd><kbd>P</kbd>
        <span style={{ color: "var(--text-faint)", padding: "0 4px" }}>Open scene</span>
        <kbd>⌘</kbd><kbd>⇧</kbd><kbd>P</kbd>
        <span style={{ color: "var(--text-faint)", padding: "0 4px" }}>Command palette</span>
      </div>
    </div>
  );
}
window.EditorEmpty = EditorEmpty;

// ---------------- Minimap ----------------
function Minimap({ scene }) {
  // Build a stylized representation of the prose: each paragraph yields a few
  // mini-lines proportional to character count.
  const lines = useMemo_E(() => {
    if (!scene) return [];
    const out = [{ h1: true }];
    scene.content.forEach((p) => {
      const charCount = p.length;
      const numLines = Math.max(1, Math.round(charCount / 65));
      for (let i = 0; i < numLines; i++) {
        // last line is shorter
        const w = i === numLines - 1 ? 40 + Math.random() * 40 : 88 + Math.random() * 10;
        out.push({ w });
      }
      out.push({ empty: true });
    });
    return out;
  }, [scene?.id]);

  return (
    <div className="minimap">
      <div className="minimap-inner">
        {lines.map((l, i) => (
          <div
            key={i}
            className={"minimap-line " + (l.h1 ? "h1" : "") + (l.empty ? " empty" : "")}
            style={{ width: l.empty ? 0 : (l.h1 ? undefined : l.w + "%") }}
          />
        ))}
      </div>
      <div className="minimap-viewport" style={{ top: 20, height: 90 }} />
    </div>
  );
}
window.Minimap = Minimap;

// ---------------- Scene Editor Frame ----------------
function SceneEditor({ book, scene, chapter, content, inlineNotes, onProseChange, fontFamily, fontSize, lineHeight, focus, typewriter, showMinimap }) {

  const charList = (scene.characters || []).map((cid) =>
    window.SALT_COAST.characters.find((c) => c.id === cid)
  ).filter(Boolean);

  return (
    <div className={"editor-area " + (showMinimap ? "" : "no-minimap")}>
      <div className="editor-scroll">
        <div className={"editor-doc " + (focus ? "focus" : "")}>
          {!focus && (
            <div className="scene-head">
              <div className="eyebrow">
                {chapter.title.replace(/^Chapter \d+ — /, "Ch. ").replace(/^Chapter /, "Ch. ")} · scene
              </div>
              <h1>{scene.title}</h1>
              <div className="scene-meta-row">
                <span><Icon name="anchor" size={11} style={{ verticalAlign: "-2px", marginRight: 4 }} />{scene.location}</span>
                <span className="dot-sep">·</span>
                <span>POV: {charList.filter((c) => scene.pov.includes(c.id)).map((c) => c.name).join(" / ") || "—"}</span>
                <span className="dot-sep">·</span>
                <span style={{ textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)" }}>{scene.status}</span>
              </div>
            </div>
          )}

          <ProseEditor
            scene={{ ...scene, content }}
            inlineNotes={inlineNotes}
            onChange={onProseChange}
            fontFamily={fontFamily}
            fontSize={fontSize}
            lineHeight={lineHeight}
            typewriter={typewriter}
          />
        </div>
      </div>

      {showMinimap && !focus ? <Minimap scene={{ ...scene, content }} /> : null}
    </div>
  );
}
window.SceneEditor = SceneEditor;
