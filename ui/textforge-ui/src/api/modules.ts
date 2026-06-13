import { get, post } from './client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface ModuleDto {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  builtIn: boolean;
  linkable: boolean;
  enabled: boolean;
}

export interface HyperlinkResolutionDto {
  target: string;
  section: string;
  entityId: string;
  /** Display name returned by the server, or null if client resolution is needed. */
  label: string | null;
  icon: string | null;
  /** True when the section is an external module that must resolve the entity in the browser. */
  requiresClientResolution: boolean;
}

// ── Props contract for module UI bundles ──────────────────────────────────────

/**
 * Props injected by TextForge's ModuleLoader into every module component.
 * This interface is the stable public contract between TextForge and module authors.
 */
export interface ModuleProps {
  /** ID of the currently open book project. */
  projectId: string;
  /** This module's id from module.json. */
  moduleId: string;
  /** Base URL for module management endpoints, e.g. "/api/modules/com.example.corkboard". */
  apiBase: string;
  /** Base URL for generic storage, e.g. "/api/modules/com.example.corkboard/storage". */
  storageBase: string;
  /** Whether this module's sidebar tab is currently selected. */
  isActive: boolean;
  /**
   * The module version stored in book.tfbook when the project was last saved
   * with this module active. Null on the first time the module is enabled.
   * Use this to detect whether a data migration is needed.
   */
  previousVersion: string | null;
  /** Version from the currently installed module.json manifest. */
  currentVersion: string;
}

/**
 * Return shape for a module's optional resolveLinkable export.
 * Required only when module.json declares "linkable": true.
 */
export interface LinkableMeta {
  id: string;
  name: string;
  icon?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getModules = (bookId: string): Promise<ModuleDto[]> =>
  get(`/api/modules?bookId=${bookId}`);

export const enableModule = (moduleId: string, bookId: string): Promise<void> =>
  post(`/api/modules/${moduleId}/enable?bookId=${bookId}`, null);

export const disableModule = (moduleId: string, bookId: string): Promise<void> =>
  post(`/api/modules/${moduleId}/disable?bookId=${bookId}`, null);

export const resolveHyperlink = (target: string): Promise<HyperlinkResolutionDto> =>
  get(`/api/hyperlinks/resolve?target=${encodeURIComponent(target)}`);

// ── Storage helpers ───────────────────────────────────────────────────────────

export const readModuleFile = async (
  storageBase: string,
  path: string,
  bookId: string,
): Promise<unknown> => {
  const res = await fetch(`${storageBase}/${path}?bookId=${bookId}`);
  if (!res.ok) throw { message: `HTTP ${res.status}` };
  return res.json();
};

export const writeModuleFile = (
  storageBase: string,
  path: string,
  bookId: string,
  body: unknown,
): Promise<void> =>
  fetch(`${storageBase}/${path}?bookId=${bookId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(() => undefined);

export const deleteModuleFile = (
  storageBase: string,
  path: string,
  bookId: string,
): Promise<void> =>
  fetch(`${storageBase}/${path}?bookId=${bookId}`, { method: 'DELETE' }).then(
    () => undefined,
  );

export const listModuleDirectory = (
  storageBase: string,
  dir: string,
  bookId: string,
): Promise<string[]> =>
  get(`${storageBase}?list=${encodeURIComponent(dir)}&bookId=${bookId}`);
