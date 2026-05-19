import { useEffect, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { getScene } from '../../api/scenes';
import { setSceneStatus } from '../../api/scenes';

type Status = 'draft' | 'revised' | 'final';
const STATUSES: Status[] = ['draft', 'revised', 'final'];

function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

export function Inspector() {
  const {
    activeSceneId,
    activeSceneTitle,
    wordCount,
    contentStats,
  } = useWorkspace();

  const [status, setStatus] = useState<Status>('draft');

  useEffect(() => {
    if (!activeSceneId) return;
    let cancelled = false;
    getScene(activeSceneId)
      .then(s => { if (!cancelled) setStatus((s.status as Status) || 'draft'); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeSceneId]);

  async function handleStatusClick(next: Status) {
    if (!activeSceneId || next === status) return;
    setStatus(next);
    try { await setSceneStatus(activeSceneId, next); } catch { setStatus(status); }
  }

  if (!activeSceneId) {
    return (
      <aside className="inspector">
        <div className="insp-header"><span>Inspector</span></div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-faint)', fontSize: 'var(--fs-mono-sm)', textAlign: 'center',
          padding: 24,
        }}>
          No scene selected.
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <div className="insp-header">
        <span>Inspector</span>
      </div>
      <div className="insp-body">

        {/* D.2 Scene */}
        <div className="insp-section">
          <h4>Scene</h4>
          <div className="insp-row" style={{ marginBottom: 10 }}>
            <span className="k">Title</span>
            <span className="v" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeSceneTitle}
            </span>
          </div>
          <div className="status-pill-row">
            {STATUSES.map(s => (
              <button
                key={s}
                className={`status-pill ${s} ${status === s ? 'active' : ''}`}
                onClick={() => handleStatusClick(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* D.3 Counts */}
        <div className="insp-section">
          <h4>Counts</h4>
          <div className="insp-row">
            <span className="k">Words</span>
            <span className="v accent">{wordCount.toLocaleString()}</span>
          </div>
          <div className="insp-row">
            <span className="k">Reading time</span>
            <span className="v">{readingMinutes(wordCount)} min</span>
          </div>
          <div className="insp-row">
            <span className="k">Paragraphs</span>
            <span className="v">{contentStats?.paragraphCount ?? '—'}</span>
          </div>
          <div className="insp-row">
            <span className="k">Sentences</span>
            <span className="v">{contentStats?.sentenceCount ?? '—'}</span>
          </div>
        </div>

        {/* D.4 POV / Characters */}
        <div className="insp-section">
          <h4>POV</h4>
          <div className="insp-row">
            <span className="k">Point of view</span>
            <span className="v" style={{ color: 'var(--text-faint)' }}>—</span>
          </div>
        </div>

        <div className="insp-section">
          <h4>Characters in scene</h4>
          <div className="chip-grid">
            <span className="chip-add">+ Add character</span>
          </div>
        </div>

        {/* D.5 Notes */}
        <div className="insp-section">
          <h4>Notes</h4>
          <div className="notes-list" />
          <div className="note-add">+ Add note</div>
        </div>

        {/* D.6 Last Snapshot */}
        <div className="insp-section">
          <h4>Last snapshot</h4>
          <div className="insp-row">
            <span className="k">Snapshot</span>
            <span className="v" style={{ color: 'var(--text-faint)' }}>None</span>
          </div>
        </div>

      </div>
    </aside>
  );
}
