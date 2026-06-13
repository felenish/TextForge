import { useEffect, useRef, useState } from 'react';
import type { ModuleProps, LinkableMeta } from '../../api/modules';

/** Shape of an external module bundle's exports. */
export interface ModuleExports {
  /** Mount function called by the loader. Must render UI into the provided container. */
  mount: (container: HTMLElement, props: ModuleProps) => (() => void) | void;
  /** Optional: resolve a linkable entity by id. */
  resolveLinkable?: (entityId: string) => LinkableMeta | null | undefined;
}

interface ModuleLoaderProps {
  moduleId: string;
  boardId: string;
  boardName: string;
  entryPoint: string;
  projectId: string;
  previousVersion: string | null;
  currentVersion: string;
  isActive: boolean;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/** Registry of already-loaded module exports, keyed by entryPoint URL. */
const moduleCache = new Map<string, ModuleExports>();

/**
 * Loads an external module bundle (UMD or ESM) and mounts it into a container div.
 *
 * UMD detection: after script injection, checks window.__textforge_module_last__.
 * ESM detection: dynamic import() via the entryPoint URL.
 *
 * The module's mount() receives ModuleProps and returns an optional cleanup fn.
 */
export function ModuleLoader({ moduleId, boardId, boardName, entryPoint, projectId, previousVersion, currentVersion, isActive }: ModuleLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState('loading');
      setErrorMsg(null);

      try {
        let exports: ModuleExports;

        if (moduleCache.has(entryPoint)) {
          exports = moduleCache.get(entryPoint)!;
        } else if (entryPoint.endsWith('.mjs') || entryPoint.includes('type=module')) {
          // ESM bundle
          const mod = await import(/* @vite-ignore */ entryPoint) as Record<string, unknown>;
          if (typeof mod.mount !== 'function') throw new Error('Module must export a mount() function.');
          exports = mod as unknown as ModuleExports;
          moduleCache.set(entryPoint, exports);
        } else {
          // UMD bundle: inject a <script> tag and wait for window.__textforge_module_last__
          exports = await loadUmd(entryPoint);
          moduleCache.set(entryPoint, exports);
        }

        if (cancelled) return;

        if (!containerRef.current) return;

        const props: ModuleProps = {
          projectId,
          moduleId,
          boardId,
          boardName,
          apiBase: `/api/modules/${moduleId}`,
          storageBase: `/api/modules/${moduleId}/storage`,
          isActive,
          previousVersion,
          currentVersion,
        };

        const cleanup = exports.mount(containerRef.current, props);
        cleanupRef.current = cleanup ?? null;
        setLoadState('ready');
      } catch (err) {
        if (!cancelled) {
          setLoadState('error');
          setErrorMsg(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryPoint, moduleId, boardId, projectId]);

  if (loadState === 'error') {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        <strong style={{ color: 'var(--status-danger)' }}>Module failed to load</strong>
        <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{errorMsg}</pre>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }}>
      {loadState === 'loading' && (
        <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Loading module…</div>
      )}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, display: loadState === 'ready' ? 'flex' : 'none', flexDirection: 'column' }} />
    </div>
  );
}

/** Resolve a linkable entity from an already-loaded module bundle. */
export function resolveModuleLinkable(entryPoint: string, entityId: string): LinkableMeta | null {
  const exports = moduleCache.get(entryPoint);
  return exports?.resolveLinkable?.(entityId) ?? null;
}

function loadUmd(src: string): Promise<ModuleExports> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      const w = window as unknown as Record<string, unknown>;
      const mod = w['__textforge_module_last__'] as ModuleExports | undefined;
      delete w['__textforge_module_last__'];
      if (!mod || typeof mod.mount !== 'function') {
        reject(new Error('UMD module did not assign window.__textforge_module_last__ with a mount() export.'));
      } else {
        resolve(mod);
      }
    };
    script.onerror = () => reject(new Error(`Failed to fetch module script: ${src}`));
    document.head.appendChild(script);
  });
}
