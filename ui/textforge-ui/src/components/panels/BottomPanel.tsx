import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useOutput } from '../../contexts/OutputContext';
import { Icon } from '../ui/Icon';
import { getScene, patchScene } from '../../api/scenes';

type BottomTab = 'wordcount' | 'notes' | 'output' | 'problems';

interface Note {
  id: string;
  text: string;
  done: boolean;
}

interface BottomPanelProps {
  onClose: () => void;
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

function fmtTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function BottomPanel({ onClose }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<BottomTab>('wordcount');
  const { series, wordCount, totalWordCount, sceneWordCounts, activeSceneId } = useWorkspace();
  const { lines, clear } = useOutput();

  // ── Notes ───────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setEditingId(null);
    setEditingText('');
    setDraggingId(null);
    setDragOverId(null);

    if (!activeSceneId)
    {
      setNotes([]);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const scene = await getScene(activeSceneId);
        if (cancelled) return;
        setNotes(scene.checklistItems ?? []);
      } catch {
        if (cancelled) return;
        setNotes([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSceneId]);

  function updateNotes(updater: (prev: Note[]) => Note[]) {
    setNotes(prev => {
      const next = updater(prev);
      if (activeSceneId)
      {
        void patchScene(activeSceneId, { checklistItems: next });
      }
      return next;
    });
  }

  function addNote() {
    if (!activeSceneId) return;
    const text = newNoteText.trim();
    if (!text) return;
    updateNotes(prev => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setNewNoteText('');
  }

  function toggleNote(id: string) {
    updateNotes(prev => prev.map(n => n.id === id ? { ...n, done: !n.done } : n));
  }

  function deleteNote(id: string) {
    updateNotes(prev => prev.filter(n => n.id !== id));
  }

  function reorderNotes(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    updateNotes(prev => {
      const from = prev.findIndex(n => n.id === dragId);
      const to = prev.findIndex(n => n.id === targetId);
      if (from < 0 || to < 0 || from === to) return prev;

      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function startEditing(note: Note) {
    setEditingId(note.id);
    setEditingText(note.text);
  }

  function commitEditing(id: string) {
    const text = editingText.trim();
    if (text) {
      updateNotes(prev => prev.map(n => (n.id === id ? { ...n, text } : n)));
    }
    setEditingId(null);
    setEditingText('');
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingText('');
  }

  function onNoteDragStart(id: string, event: React.DragEvent<HTMLDivElement>) {
    if (editingId) {
      event.preventDefault();
      return;
    }
    setDraggingId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  }

  function onNoteDragOver(id: string, event: React.DragEvent<HTMLDivElement>) {
    if (!draggingId || draggingId === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  }

  function onNoteDrop(id: string, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!draggingId || draggingId === id) return;
    reorderNotes(draggingId, id);
    setDragOverId(null);
  }

  function onNoteDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  // ── Word Count ───────────────────────────────────────────────────────────
  const bookGroups = useMemo(() => {
    if (!series) return [];
    return series.books.map(book => ({
      id: book.id,
      title: book.title,
      chapters: book.chapters.map(ch => ({
        id: ch.id,
        title: ch.title,
        count: ch.scenes.reduce((sum: number, sc) => sum + (sceneWordCounts.get(sc.id) ?? 0), 0),
      })),
    }));
  }, [series, sceneWordCounts]);

  // ── Output auto-scroll ───────────────────────────────────────────────────
  const outputEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="bottom">
      {/* Tab strip */}
      <div className="bottom-tabs">
        {(['wordcount', 'notes', 'output', 'problems'] as BottomTab[]).map(tab => (
          <div
            key={tab}
            className={`bottom-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'wordcount' && 'Word Count'}
            {tab === 'notes' && (
              <>Notes{notes.length > 0 && <span className="count">{notes.length}</span>}</>
            )}
            {tab === 'output' && (
              <>Output{lines.length > 0 && <span className="count">{lines.length}</span>}</>
            )}
            {tab === 'problems' && 'Problems'}
          </div>
        ))}
        <div className="bottom-actions">
          {activeTab === 'output' && lines.length > 0 && (
            <button onClick={clear} title="Clear output">
              <Icon name="x" size={12} />
            </button>
          )}
          <button onClick={onClose} title="Close panel">
            <Icon name="x" size={12} />
          </button>
        </div>
      </div>

      {/* Bodies */}
      <div className="bottom-body">

        {/* E.2 Word Count */}
        {activeTab === 'wordcount' && (
          <>
            <div className="wc-grid">
              <div className="wc-card">
                <div className="label">Manuscript</div>
                <div className="num">{totalWordCount.toLocaleString()}</div>
                <div className="sub">open scenes</div>
              </div>
              <div className="wc-card">
                <div className="label">Active scene</div>
                <div className="num">{wordCount.toLocaleString()}</div>
                <div className="sub">&nbsp;</div>
              </div>
              <div className="wc-card">
                <div className="label">Today</div>
                <div className="num" style={{ color: 'var(--text-faint)' }}>—</div>
                <div className="sub">not tracked yet</div>
              </div>
              <div className="wc-card">
                <div className="label">Est. completion</div>
                <div className="num" style={{ color: 'var(--text-faint)' }}>—</div>
                <div className="sub">no target set</div>
              </div>
            </div>

            {bookGroups.length > 0 ? (
              <div className="wc-bars">
                {bookGroups.map(group => {
                  const groupMax = Math.max(...group.chapters.map(c => c.count), 1);
                  const groupTotal = group.chapters.reduce((n, c) => n + c.count, 0);
                  return (
                    <div key={group.id}>
                      {bookGroups.length > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 2px', fontSize: 'var(--fs-mono-sm)', color: 'var(--text-faint)', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                          <span style={{ fontWeight: 500, color: 'var(--text)' }}>{group.title}</span>
                          <span>{groupTotal > 0 ? groupTotal.toLocaleString() : '—'}</span>
                        </div>
                      )}
                      {group.chapters.map(ch => (
                        <div key={ch.id} className="wc-bar">
                          <span className="name">{ch.title}</span>
                          <div className="bar">
                            <i style={{ width: `${ch.count === 0 ? 0 : Math.max(2, (ch.count / groupMax) * 100)}%` }} />
                          </div>
                          <span className="count">{ch.count > 0 ? ch.count.toLocaleString() : '—'}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '12px 16px', fontSize: 'var(--fs-mono-sm)', color: 'var(--text-faint)' }}>
                Open a series to see word counts.
              </div>
            )}
          </>
        )}

        {/* E.3 Notes */}
        {activeTab === 'notes' && (
          <div className="notes-board">
            {!activeSceneId && (
              <div style={{ color: 'var(--text-faint)', fontSize: 'var(--fs-mono-sm)', padding: '4px 0' }}>
                Open a scene to view checklist notes.
              </div>
            )}
            {activeSceneId && notes.length === 0 && (
              <div style={{ color: 'var(--text-faint)', fontSize: 'var(--fs-mono-sm)', padding: '4px 0' }}>
                No notes yet.
              </div>
            )}
            {notes.map(note => (
              <div
                key={note.id}
                className={`nb-item${note.done ? ' done' : ''}`}
                draggable={editingId !== note.id}
                onDragStart={e => onNoteDragStart(note.id, e)}
                onDragOver={e => onNoteDragOver(note.id, e)}
                onDrop={e => onNoteDrop(note.id, e)}
                onDragEnd={onNoteDragEnd}
                onClick={() => {
                  if (editingId !== note.id) toggleNote(note.id);
                }}
                style={{
                  border: dragOverId === note.id ? '1px dashed var(--border-strong)' : undefined,
                }}
              >
                <span
                  className="drag-handle"
                  title="Drag to reorder"
                  onClick={e => e.stopPropagation()}
                >
                  ⋮⋮
                </span>
                <div className="check" />
                {editingId === note.id ? (
                  <input
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onBlur={() => commitEditing(note.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitEditing(note.id);
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEditing();
                      }
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'var(--bg-editor)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px 6px',
                      color: 'var(--text)',
                      fontSize: 'var(--fs-mono-sm)',
                    }}
                  />
                ) : (
                  <span className="text" onDoubleClick={e => { e.stopPropagation(); startEditing(note); }}>
                    {note.text}
                  </span>
                )}
                <div className="note-actions">
                  <button
                    style={{ background: 'none', color: 'var(--text-faint)', padding: '0 2px' }}
                    onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                    title="Delete note"
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input
                value={newNoteText}
                onChange={e => setNewNoteText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="+ Add a note…"
                disabled={!activeSceneId}
                style={{
                  flex: 1, background: 'var(--bg-editor)', border: '1px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-sm)', padding: '5px 10px',
                  fontSize: 'var(--fs-mono-sm)', color: 'var(--text)', outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* E.4 Output */}
        {activeTab === 'output' && (
          lines.length === 0 ? (
            <div style={{
              padding: '12px 16px', fontSize: 'var(--fs-mono-sm)', color: 'var(--text-faint)',
            }}>
              No output yet.
            </div>
          ) : (
            <>
              {lines.map(line => (
                <div key={line.id} className={`output-line ${line.level}`}>
                  <span className="ts">{fmtTime(line.ts)}</span>
                  <span className="lvl">{line.level}</span>
                  <span className="msg">{line.msg}</span>
                </div>
              ))}
              <div ref={outputEndRef} />
            </>
          )
        )}

        {/* E.5 Problems */}
        {activeTab === 'problems' && (
          <div style={{
            padding: '12px 16px', fontSize: 'var(--fs-mono-sm)', color: 'var(--text-faint)',
          }}>
            No problems detected.
          </div>
        )}

      </div>
    </div>
  );
}
