import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { useToast } from '../../contexts/ToastContext';
import { BranchSelector } from '../versions/BranchSelector';
import { TakeSnapshotForm } from '../versions/TakeSnapshotForm';
import { SnapshotCard } from '../versions/SnapshotCard';
import { ScenePreviewModal } from '../versions/ScenePreviewModal';
import {
  getVersionStatus, getSnapshots, getBranches,
  takeSnapshot, switchBranch, createBranch,
  getSnapshot, restoreSnapshot,
} from '../../api/versions';
import type { SnapshotSummaryDto, SnapshotDetailDto, BranchDto, SceneChangeDto } from '../../api/versions';

type View = 'list' | 'form' | 'detail';

interface PreviewState {
  sceneId: string;
  sceneTitle: string;
  snapshotId: string;
  snapshotLabel: string;
}

const CHANGE_ICON: Record<string, string> = {
  added: '+',
  modified: '~',
  removed: '−',
  unchanged: '·',
};

export function VersionsSidebar() {
  const { showToast } = useToast();
  const [branch, setBranch] = useState('');
  const [snapshots, setSnapshots] = useState<SnapshotSummaryDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('list');
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<SnapshotDetailDto | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [status, list, blist] = await Promise.all([
        getVersionStatus(),
        getSnapshots(),
        getBranches(),
      ]);
      setBranch(status.branch);
      setSnapshots(list.snapshots);
      setHasMore(list.hasMore);
      setBranches(blist);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Failed to load version history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleTakeSnapshot(label: string, message: string) {
    setSubmitting(true);
    try {
      await takeSnapshot(label, message);
      window.dispatchEvent(new CustomEvent('tf:snapshot-taken'));
      setView('list');
      await load();
    } catch (err: unknown) {
      showToast((err as { message?: string })?.message ?? 'Failed to take snapshot.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSwitchBranch(name: string) {
    try {
      await switchBranch(name);
      await load();
    } catch (err: unknown) {
      showToast((err as { message?: string })?.message ?? 'Failed to switch branch.');
    }
  }

  async function handleCreateBranch(name: string) {
    try {
      await createBranch(name);
      await load();
    } catch (err: unknown) {
      showToast((err as { message?: string })?.message ?? 'Failed to create branch.');
    }
  }

  async function handleViewDetail(id: string) {
    try {
      const d = await getSnapshot(id);
      setDetail(d);
      setView('detail');
    } catch (err: unknown) {
      showToast((err as { message?: string })?.message ?? 'Failed to load snapshot.');
    }
  }

  async function handleRestore(id: string) {
    setRestoring(true);
    try {
      await restoreSnapshot(id);
      window.dispatchEvent(new CustomEvent('tf:snapshot-restored'));
      setConfirmRestore(null);
      setView('list');
      setDetail(null);
      await load();
      showToast('Snapshot restored.');
    } catch (err: unknown) {
      showToast((err as { message?: string })?.message ?? 'Restore failed.');
    } finally {
      setRestoring(false);
    }
  }

  function goBackToList() {
    setView('list');
    setDetail(null);
    setConfirmRestore(null);
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="sb-header">
        {view === 'detail' ? (
          <>
            <button className="vs-icon-btn" onClick={goBackToList} title="Back">
              <Icon name="chev-right" size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <span style={{ flex: 1 }}>Snapshot Details</span>
          </>
        ) : (
          <>
            <span>Version History</span>
            <div className="actions">
              {view === 'list' && (
                <>
                  <button title="New Snapshot" onClick={() => setView('form')}>
                    <Icon name="plus" size={14} />
                  </button>
                  <button title="Refresh" onClick={() => void load()}>
                    <Icon name="refresh" size={13} />
                  </button>
                </>
              )}
              {view === 'form' && (
                <button title="Cancel" onClick={() => setView('list')}>
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Branch bar ── */}
      {view !== 'form' && (
        <BranchSelector
          current={branch}
          branches={branches}
          onSwitch={handleSwitchBranch}
          onCreate={handleCreateBranch}
        />
      )}

      {/* ── Body ── */}
      <div className="sb-body">

        {/* Take snapshot form */}
        {view === 'form' && (
          <TakeSnapshotForm
            onSubmit={(l, m) => void handleTakeSnapshot(l, m)}
            onCancel={() => setView('list')}
            isSubmitting={submitting}
          />
        )}

        {/* List view */}
        {view === 'list' && (
          <>
            {loading && (
              <div className="vs-empty">
                <Icon name="refresh" size={20} style={{ opacity: 0.4, color: 'var(--text-faint)' }} />
                <span>Loading…</span>
              </div>
            )}
            {!loading && error && (
              <div className="vs-empty">
                <span style={{ color: 'var(--signal-error)', fontSize: 'var(--fs-mono-sm)', textAlign: 'center' }}>
                  {error}
                </span>
                <button className="vs-btn secondary" onClick={() => void load()}>Retry</button>
              </div>
            )}
            {!loading && !error && snapshots.length === 0 && (
              <div className="vs-empty">
                <Icon name="history" size={28} stroke={1} style={{ color: 'var(--text-faint)', opacity: 0.5 }} />
                <span>No snapshots yet.</span>
                <button className="vs-btn primary" onClick={() => setView('form')}>
                  Take first snapshot
                </button>
              </div>
            )}
            {!loading && !error && snapshots.length > 0 && (
              <div className="commits">
                {snapshots.map((s, i) => (
                  <div key={s.id}>
                    <SnapshotCard
                      snapshot={s}
                      isLast={i === snapshots.length - 1}
                      onViewDetails={() => void handleViewDetail(s.id)}
                      onRestore={() => setConfirmRestore(confirmRestore === s.id ? null : s.id)}
                    />
                    {confirmRestore === s.id && (
                      <div className="vs-restore-confirm">
                        <span>Restore all scene files to this snapshot?</span>
                        <div className="vs-restore-actions">
                          <button className="vs-btn secondary" onClick={() => setConfirmRestore(null)}>
                            Cancel
                          </button>
                          <button
                            className="vs-btn danger"
                            onClick={() => void handleRestore(s.id)}
                            disabled={restoring}
                          >
                            {restoring ? 'Restoring…' : 'Restore'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {hasMore && (
                  <div className="vs-load-more">
                    <button className="vs-btn secondary">Load more…</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Detail view */}
        {view === 'detail' && detail && (
          <div className="vs-detail">
            <div className="vs-detail-meta">
              <div className="vs-detail-label">{detail.label}</div>
              {detail.message && <div className="vs-detail-msg">{detail.message}</div>}
              <div className="vs-detail-info">
                <span><Icon name="branch" size={11} /> {detail.branch}</span>
                <span>{new Date(detail.timestampUtc).toLocaleString()}</span>
              </div>
            </div>

            <div className="vs-changes">
              <div className="vs-changes-title">
                Changes ({detail.changes.filter(c => c.changeKind !== 'unchanged').length})
              </div>
              {detail.changes.filter(c => c.changeKind !== 'unchanged').length === 0 ? (
                <div className="vs-changes-empty">No changes from parent.</div>
              ) : (
                detail.changes
                  .filter((c): c is SceneChangeDto => c.changeKind !== 'unchanged')
                  .map(c => (
                    <button
                      key={c.sceneId}
                      className={`vs-change-row vs-change-${c.changeKind}`}
                      onClick={() => setPreview({
                        sceneId: c.sceneId,
                        sceneTitle: c.sceneTitle,
                        snapshotId: detail.id,
                        snapshotLabel: detail.label,
                      })}
                    >
                      <span className="vs-change-kind">{CHANGE_ICON[c.changeKind]}</span>
                      <span className="vs-change-name">{c.sceneTitle}</span>
                    </button>
                  ))
              )}
            </div>

            {confirmRestore === detail.id ? (
              <div className="vs-restore-confirm">
                <span>Restore all scene files to this snapshot?</span>
                <div className="vs-restore-actions">
                  <button className="vs-btn secondary" onClick={() => setConfirmRestore(null)}>
                    Cancel
                  </button>
                  <button
                    className="vs-btn danger"
                    onClick={() => void handleRestore(detail.id)}
                    disabled={restoring}
                  >
                    {restoring ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="vs-detail-footer">
                <button
                  className="vs-btn danger-outline full"
                  onClick={() => setConfirmRestore(detail.id)}
                >
                  <Icon name="history" size={13} />
                  Restore this snapshot
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="sb-footer">
        <span>
          <span className="num">{snapshots.length}</span>
          {' '}snapshot{snapshots.length !== 1 ? 's' : ''}
        </span>
        <span>{branch}</span>
      </div>

      {/* Scene preview modal */}
      {preview && (
        <ScenePreviewModal
          sceneId={preview.sceneId}
          sceneTitle={preview.sceneTitle}
          snapshotId={preview.snapshotId}
          snapshotLabel={preview.snapshotLabel}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
