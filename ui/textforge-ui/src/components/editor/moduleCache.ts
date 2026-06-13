import type { LinkableMeta } from '../../api/modules';
import type { ModuleExports } from './ModuleLoader';

export const moduleCache = new Map<string, ModuleExports>();

export function resolveModuleLinkable(entryPoint: string, entityId: string): LinkableMeta | null {
  const exports = moduleCache.get(entryPoint);
  return exports?.resolveLinkable?.(entityId) ?? null;
}
