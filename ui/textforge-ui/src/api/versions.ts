import { get, post, put } from './client';

export interface SnapshotSummaryDto {
  id: string;
  label: string;
  timestampUtc: string;
  branch: string;
  sceneCount: number;
}

export interface SnapshotListDto {
  snapshots: SnapshotSummaryDto[];
  hasMore: boolean;
}

export interface SceneChangeDto {
  sceneId: string;
  sceneTitle: string;
  changeKind: 'added' | 'modified' | 'removed' | 'unchanged';
}

export interface SnapshotDetailDto {
  id: string;
  label: string;
  message: string;
  timestampUtc: string;
  branch: string;
  parentId: string | null;
  changes: SceneChangeDto[];
}

export interface VersionStatusDto {
  branch: string;
  latestSnapshot: SnapshotSummaryDto | null;
}

export interface BranchDto {
  name: string;
  isCurrent: boolean;
  tip: SnapshotSummaryDto | null;
}

export interface SceneAtSnapshotDto {
  sceneId: string;
  snapshotId: string;
  content: string | null;
}

export interface RestoreResultDto {
  restored: number;
  skipped: string[];
}

export const getVersionStatus = (): Promise<VersionStatusDto> =>
  get('/api/versions/status');

export const getSnapshots = (branch?: string, limit = 30, offset = 0): Promise<SnapshotListDto> => {
  const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (branch) p.set('branch', branch);
  return get(`/api/versions/snapshots?${p}`);
};

export const getSnapshot = (id: string): Promise<SnapshotDetailDto> =>
  get(`/api/versions/snapshots/${id}`);

export const takeSnapshot = (label: string, message?: string): Promise<SnapshotSummaryDto> =>
  post('/api/versions/snapshots', { label, message: message ?? '' });

export const getBranches = (): Promise<BranchDto[]> =>
  get('/api/versions/branches');

export const createBranch = (name: string, fromSnapshotId?: string): Promise<BranchDto> =>
  post('/api/versions/branches', { name, fromSnapshotId: fromSnapshotId ?? null });

export const switchBranch = (name: string): Promise<void> =>
  put('/api/versions/branches/current', { name });

export const getSceneHistory = (sceneId: string): Promise<SnapshotSummaryDto[]> =>
  get(`/api/versions/scenes/${sceneId}/history`);

export const getSceneAtSnapshot = (sceneId: string, snapshotId: string): Promise<SceneAtSnapshotDto> =>
  get(`/api/versions/scenes/${sceneId}/at/${snapshotId}`);

export const restoreScene = (sceneId: string, snapshotId: string): Promise<void> =>
  post(`/api/versions/scenes/${sceneId}/restore/${snapshotId}`, {});

export const restoreSnapshot = (snapshotId: string): Promise<RestoreResultDto> =>
  post(`/api/versions/restore/${snapshotId}`, {});
