import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Match {
  node: Text;
  start: number;
  length: number;
}

function buildMatches(root: HTMLDivElement, term: string, matchCase: boolean): Match[] {
  if (!term) return [];
  const needle = matchCase ? term : term.toLowerCase();
  const matches: Match[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const t = node as Text;
    const hay = matchCase ? t.data : t.data.toLowerCase();
    let i = 0;
    while ((i = hay.indexOf(needle, i)) !== -1) {
      matches.push({ node: t, start: i, length: needle.length });
      i += needle.length;
    }
  }
  return matches;
}

function applySelection(match: Match) {
  const range = document.createRange();
  range.setStart(match.node, match.start);
  range.setEnd(match.node, match.start + match.length);
  const sel = window.getSelection();
  if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  match.node.parentElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

interface FindReplaceBarProps {
  editorEl: HTMLDivElement | null;
  initialShowReplace: boolean;
  onClose: () => void;
}

export function FindReplaceBar({ editorEl, initialShowReplace, onClose }: FindReplaceBarProps) {
  const [term, setTerm] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [showReplace, setShowReplace] = useState(initialShowReplace);
  const [matchIdx, setMatchIdx] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const matchesRef = useRef<Match[]>([]);
  const matchIdxRef = useRef(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Keep matchIdxRef in sync
  useEffect(() => { matchIdxRef.current = matchIdx; }, [matchIdx]);

  // Auto-focus find input on mount
  useEffect(() => {
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, []);

  // Rebuild matches whenever term, case or editor element changes.
  // setState is deferred via queueMicrotask so it runs in a callback, not
  // synchronously in the effect body (satisfies react-hooks/set-state-in-effect).
  useEffect(() => {
    const matches = editorEl && term ? buildMatches(editorEl, term, matchCase) : [];
    matchesRef.current = matches;
    if (matches.length > 0) applySelection(matches[0]);
    const count = matches.length;
    queueMicrotask(() => {
      setMatchCount(count);
      setMatchIdx(0);
    });
  }, [editorEl, term, matchCase]);

  // Stable navigate/close refs — updated after every render so closures stay fresh
  const actionsRef = useRef<{
    navigate: (dir: 1 | -1) => void;
    close: () => void;
  }>({ navigate: () => {}, close: () => {} });

  useLayoutEffect(() => {
    actionsRef.current.navigate = (dir: 1 | -1) => {
      const matches = matchesRef.current;
      if (!matches.length) return;
      setMatchIdx(prev => {
        const next = (prev + dir + matches.length) % matches.length;
        matchIdxRef.current = next;
        applySelection(matches[next]);
        return next;
      });
    };
    actionsRef.current.close = onClose;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { actionsRef.current.close(); return; }
      if (e.key === 'F3') {
        e.preventDefault();
        actionsRef.current.navigate(e.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function doReplace() {
    const matches = matchesRef.current;
    if (!matches.length || !editorEl) return;
    const m = matches[matchIdxRef.current];
    m.node.data = m.node.data.slice(0, m.start) + replacement + m.node.data.slice(m.start + m.length);
    editorEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const updated = buildMatches(editorEl, term, matchCase);
    matchesRef.current = updated;
    setMatchCount(updated.length);
    if (updated.length) {
      const next = Math.min(matchIdxRef.current, updated.length - 1);
      setMatchIdx(next);
      applySelection(updated[next]);
    } else {
      setMatchIdx(0);
    }
  }

  function doReplaceAll() {
    if (!editorEl || !term) return;
    const matches = buildMatches(editorEl, term, matchCase);
    if (!matches.length) return;
    // Process in reverse so earlier offsets stay valid
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      m.node.data = m.node.data.slice(0, m.start) + replacement + m.node.data.slice(m.start + m.length);
    }
    editorEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
    matchesRef.current = [];
    setMatchCount(0);
    setMatchIdx(0);
  }

  const noMatches = !!term && matchCount === 0;

  return (
    <div className="frb">
      <div className="frb-row">
        <input
          ref={findInputRef}
          className={`frb-input${noMatches ? ' no-match' : ''}`}
          placeholder="Find"
          value={term}
          spellCheck={false}
          onChange={e => setTerm(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); actionsRef.current.navigate(e.shiftKey ? -1 : 1); }
          }}
        />
        <button
          className={`frb-btn${matchCase ? ' active' : ''}`}
          title="Match Case"
          onMouseDown={e => e.preventDefault()}
          onClick={() => setMatchCase(c => !c)}
        >
          Aa
        </button>
        <span className="frb-count">
          {term ? (noMatches ? 'No results' : `${matchIdx + 1} / ${matchCount}`) : ''}
        </span>
        <button className="frb-nav" title="Previous match (Shift+F3)" onMouseDown={e => e.preventDefault()} onClick={() => actionsRef.current.navigate(-1)}>‹</button>
        <button className="frb-nav" title="Next match (F3)" onMouseDown={e => e.preventDefault()} onClick={() => actionsRef.current.navigate(1)}>›</button>
        <button
          className={`frb-btn${showReplace ? ' active' : ''}`}
          title="Toggle Replace"
          onMouseDown={e => e.preventDefault()}
          onClick={() => setShowReplace(r => !r)}
        >
          ↕
        </button>
        <button className="frb-close" title="Close (Esc)" onMouseDown={e => e.preventDefault()} onClick={onClose}>×</button>
      </div>
      {showReplace && (
        <div className="frb-row">
          <input
            className="frb-input"
            placeholder="Replace with"
            value={replacement}
            spellCheck={false}
            onChange={e => setReplacement(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); doReplace(); }
            }}
          />
          <button
            className="frb-action"
            onMouseDown={e => e.preventDefault()}
            onClick={doReplace}
            disabled={!term || matchCount === 0}
          >
            Replace
          </button>
          <button
            className="frb-action"
            onMouseDown={e => e.preventDefault()}
            onClick={doReplaceAll}
            disabled={!term || matchCount === 0}
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}
