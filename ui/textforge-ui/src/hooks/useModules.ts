import { useEffect, useReducer } from 'react';
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

type State = { status: 'idle' | 'loading'; modules: ModuleDto[] };
type Action =
  | { type: 'fetch_start' }
  | { type: 'fetch_done'; modules: ModuleDto[] }
  | { type: 'fetch_error' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'fetch_start': return { ...state, status: 'loading' };
    case 'fetch_done':  return { status: 'idle', modules: action.modules };
    case 'fetch_error': return { status: 'idle', modules: [] };
  }
}

/**
 * Fetches the module list for a given book from the registry.
 * Re-fetches whenever bookId changes. Falls back to an empty list on error
 * so the sidebar degrades gracefully if the API is unavailable.
 */
export function useModules(bookId: string | null): UseModulesResult {
  const [{ status, modules }, dispatch] = useReducer(reducer, { status: 'idle', modules: [] });

  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;
    dispatch({ type: 'fetch_start' });

    getModules(bookId)
      .then(data => { if (!cancelled) dispatch({ type: 'fetch_done', modules: data }); })
      .catch(() => { if (!cancelled) dispatch({ type: 'fetch_error' }); });

    return () => { cancelled = true; };
  }, [bookId]);

  const modules_ = bookId ? modules : [];
  const enabledIds = new Set(modules_.filter(m => m.enabled).map(m => m.id));

  return { modules: modules_, enabledIds, loading: status === 'loading' };
}
