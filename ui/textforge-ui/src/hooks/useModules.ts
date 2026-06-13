import { useEffect, useState } from 'react';
import { getModules, type ModuleDto } from '../api/modules';

/** Built-in module IDs — must match the id fields in the module.json manifests. */
export const BUILTIN_MODULE_IDS = {
  characters: 'textforge.builtin.characters',
  locations: 'textforge.builtin.locations',
  outlines: 'textforge.builtin.outlines',
  plotGrids: 'textforge.builtin.plotgrids',
} as const;

export interface UseModulesResult {
  modules: ModuleDto[];
  /** Set of module IDs that are currently enabled for the active book. */
  enabledIds: ReadonlySet<string>;
  /** True while the first fetch is in flight. */
  loading: boolean;
}

/**
 * Fetches the module list for a given book from the registry.
 * Re-fetches whenever bookId changes. Falls back to an empty list on error
 * so the sidebar degrades gracefully if the API is unavailable.
 */
export function useModules(bookId: string | null): UseModulesResult {
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookId) {
      setModules([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getModules(bookId)
      .then(data => {
        if (!cancelled) setModules(data);
      })
      .catch(() => {
        // Graceful degradation — show all sections if the fetch fails
        if (!cancelled) setModules([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [bookId]);

  const enabledIds = new Set(modules.filter(m => m.enabled).map(m => m.id));

  return { modules, enabledIds, loading };
}
