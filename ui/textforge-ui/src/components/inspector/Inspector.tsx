import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { getScene, patchScene, setSceneStatus } from '../../api/scenes';
import { getCharacters } from '../../api/characters';
import type { CharacterDto } from '../../api/characters';

type Status = 'draft' | 'revised' | 'final';
const STATUSES: Status[] = ['draft', 'revised', 'final'];

function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function Inspector() {
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

  useEffect(() => {
    if (!activeSceneId) {
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
    catch {}
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
      catch {}
    }, 800);
  }

  const sceneChars = sceneCharIds
    .map(id => allChars.find(c => c.id === id))
    .filter((c): c is CharacterDto => c !== undefined);

  const availableChars = allChars.filter(c => !sceneCharIds.includes(c.id));

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
