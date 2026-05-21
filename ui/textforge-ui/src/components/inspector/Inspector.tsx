import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { getScene, patchScene, setSceneStatus } from '../../api/scenes';
import { getCharacters } from '../../api/characters';
import type { CharacterDto } from '../../api/characters';
import { getVersionStatus, takeSnapshot } from '../../api/versions';
import type { SnapshotSummaryDto } from '../../api/versions';
import { useToast } from '../../contexts/ToastContext';
import { Icon } from '../ui/Icon';

type Status = 'draft' | 'revised' | 'final';
const STATUSES: Status[] = ['draft', 'revised', 'final'];

function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface InspectorProps {
  onViewHistory?: () => void;
}

export function Inspector({ onViewHistory }: InspectorProps) {
  const {
    series,
    activeSceneId,
    activeSceneTitle,
    activeBookId,
    wordCount,
    contentStats,
  } = useWorkspace();

  const activeBook = activeBookId ? series?.books.find(b => b.id === activeBookId) ?? null : null;
  const activeChapter = activeBook?.chapters.find(c => c.scenes.some(s => s.id === activeSceneId)) ?? null;

  const [status, setStatus] = useState<Status>('draft');
  const [pov, setPov] = useState('');
  const [sceneCharIds, setSceneCharIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [allChars, setAllChars] = useState<CharacterDto[]>([]);

  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const povSavedRef = useRef('');
  const { showToast } = useToast();

  const [latestSnapshot, setLatestSnapshot] = useState<SnapshotSummaryDto | null>(null);
  const [showSnapshotInput, setShowSnapshotInput] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [takingSnapshot, setTakingSnapshot] = useState(false);

  useEffect(() => {
    getVersionStatus()
      .then(s => setLatestSnapshot(s.latestSnapshot))
      .catch(() => {});
  }, []);

  async function handleTakeSnapshot() {
    const label = snapshotLabel.trim();
    if (!label || takingSnapshot) return;
    setTakingSnapshot(true);
    try {
      const snap = await takeSnapshot(label);
      setLatestSnapshot(snap);
      setSnapshotLabel('');
      setShowSnapshotInput(false);
      showToast(`Snapshot "${label}" saved.`);
    } catch (err: unknown) {
      showToast((err as { message?: string })?.message ?? 'Failed to take snapshot.');
    } finally {
      setTakingSnapshot(false);
    }
  }

  useEffect(() => {
    if (!activeSceneId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('draft');
      setPov('');
      setSceneCharIds([]);
      setNotes('');
      return;
    }
    let cancelled = false;
    Promise.all([getScene(activeSceneId), getCharacters()])
      .then(([s, chars]) => {
        if (cancelled) return;
        setStatus((s.status as Status) || 'draft');
        setPov(s.pov ?? '');
        povSavedRef.current = s.pov ?? '';
        setSceneCharIds(s.characterIds ?? []);
        setNotes(s.notes ?? '');
        setAllChars(chars);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeSceneId]);

  async function handleStatusClick(next: Status) {
    if (!activeSceneId || next === status) return;
    const prev = status;
    setStatus(next);
    try { await setSceneStatus(activeSceneId, next); }
    catch { setStatus(prev); }
  }

  async function handlePovBlur() {
    if (!activeSceneId || pov === povSavedRef.current) return;
    povSavedRef.current = pov;
    try { await patchScene(activeSceneId, { pov: pov || '' }); }
    catch { /* ignore */ }
  }

  function handlePovKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur();
  }

  async function addCharToScene(charId: string) {
    if (!activeSceneId || sceneCharIds.includes(charId)) return;
    const next = [...sceneCharIds, charId];
    setSceneCharIds(next);
    try { await patchScene(activeSceneId, { characterIds: next }); }
    catch { setSceneCharIds(prev => prev.filter(id => id !== charId)); }
  }

  async function removeCharFromScene(charId: string) {
    if (!activeSceneId) return;
    const next = sceneCharIds.filter(id => id !== charId);
    setSceneCharIds(next);
    try { await patchScene(activeSceneId, { characterIds: next }); }
    catch { setSceneCharIds(prev => [...prev, charId]); }
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      if (!activeSceneId) return;
      try { await patchScene(activeSceneId, { notes: value }); }
      catch { /* ignore */ }
    }, 800);
  }

  const sceneChars = sceneCharIds
    .map(id => allChars.find(c => c.id === id))
    .filter((c): c is CharacterDto => c !== undefined);

  const availableChars = allChars.filter(c => !sceneCharIds.includes(c.id));

  if (!activeSceneId) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-faint)', fontSize: 'var(--fs-mono-sm)', textAlign: 'center',
        padding: 24,
      }}>
        No scene selected.
      </div>
    );
  }

  return (
    <div className="insp-body">

        <div className="insp-section">
          <h4>Book</h4>
          <div className="insp-row">
            <span className="k">Title</span>
            <span className="v" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeBook?.title ?? '—'}
            </span>
          </div>
          <div className="insp-row">
            <span className="k">Chapter</span>
            <span className="v" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeChapter?.title ?? '—'}
            </span>
          </div>
        </div>

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

        <div className="insp-section">
          <h4>POV</h4>
          <input
            id="pov-chars"
            list="pov-chars-list"
            className="insp-input"
            value={pov}
            onChange={e => setPov(e.target.value)}
            onBlur={handlePovBlur}
            onKeyDown={handlePovKeyDown}
            placeholder="Point of view character…"
          />
          <datalist id="pov-chars-list">
            {allChars.map(c => <option key={c.id} value={c.name} />)}
          </datalist>
        </div>

        <div className="insp-section">
          <h4>Characters in scene</h4>
          <div className="chip-grid" style={{ marginBottom: sceneChars.length > 0 ? 8 : 0 }}>
            {sceneChars.map(c => (
              <span key={c.id} className="chip">
                <span className="chip-avatar" style={{ background: `hsl(${(c.name.charCodeAt(0) * 37) % 360},60%,65%)` }}>
                  {initials(c.name)}
                </span>
                {c.name}
                <button
                  className="chip-remove"
                  onClick={() => removeCharFromScene(c.id)}
                  title={`Remove ${c.name}`}
                >×</button>
              </span>
            ))}
          </div>
          {availableChars.length > 0 && (
            <select
              className="insp-select"
              value=""
              onChange={e => { if (e.target.value) addCharToScene(e.target.value); }}
            >
              <option value="" disabled>+ Add character</option>
              {availableChars.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="insp-section">
          <h4>Notes</h4>
          <textarea
            className="insp-notes"
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="Author notes about this scene…"
            rows={4}
          />
        </div>

        <div className="insp-section">
          <h4>Last Snapshot</h4>
          {latestSnapshot ? (
            <>
              <div className="insp-row">
                <span className="k">Label</span>
                <span className="v" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {latestSnapshot.label}
                </span>
              </div>
              <div className="insp-row">
                <span className="k">When</span>
                <span className="v">{formatRelative(latestSnapshot.timestampUtc)}</span>
              </div>
            </>
          ) : (
            <div className="insp-row">
              <span style={{ color: 'var(--text-faint)', fontSize: 'var(--fs-mono-xs)' }}>No snapshots yet</span>
            </div>
          )}
          {showSnapshotInput ? (
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              <input
                className="insp-input"
                style={{ margin: 0 }}
                placeholder="Snapshot label…"
                value={snapshotLabel}
                onChange={e => setSnapshotLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleTakeSnapshot();
                  if (e.key === 'Escape') { setShowSnapshotInput(false); setSnapshotLabel(''); }
                }}
                autoFocus
                disabled={takingSnapshot}
              />
              <button
                className="vs-icon-btn"
                onClick={() => void handleTakeSnapshot()}
                disabled={!snapshotLabel.trim() || takingSnapshot}
                title="Save snapshot"
              >
                <Icon name="save" size={13} />
              </button>
              <button
                className="vs-icon-btn"
                onClick={() => { setShowSnapshotInput(false); setSnapshotLabel(''); }}
                title="Cancel"
              >
                <Icon name="x" size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="vs-btn primary" style={{ flex: 1 }} onClick={() => setShowSnapshotInput(true)}>
                <Icon name="plus" size={11} /> Snapshot
              </button>
              {onViewHistory && (
                <button className="vs-btn secondary" style={{ flex: 1 }} onClick={onViewHistory}>
                  <Icon name="history" size={11} /> History
                </button>
              )}
            </div>
          )}
        </div>

    </div>
  );
}
