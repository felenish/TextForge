import { useCallback, useEffect, useState } from 'react';
import * as scenesApi from '../api/scenes';

export interface UseSceneEditorResult {
  content: string;
  isDirty: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onChange: (value: string) => void;
  save: () => Promise<void>;
}

export function useSceneEditor(sceneId: string): UseSceneEditorResult {
  const [loadedSceneId, setLoadedSceneId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive loading: true whenever the requested sceneId hasn't finished loading yet.
  // This avoids synchronous setState calls inside the effect body.
  const loading = loadedSceneId !== sceneId;

  useEffect(() => {
    let cancelled = false;
    scenesApi.getScene(sceneId)
      .then(scene => {
        if (cancelled) return;
        const c = scene.content ?? '';
        setContent(c);
        setSavedContent(c);
        setError(null);
        setLoadedSceneId(sceneId);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError((e as { message?: string }).message ?? 'Failed to load scene.');
        setLoadedSceneId(sceneId);
      });
    return () => { cancelled = true; };
  }, [sceneId]);

  const isDirty = !loading && content !== savedContent;

  const onChange = useCallback((value: string) => setContent(value), []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await scenesApi.saveScene(sceneId, content);
      setSavedContent(content);
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, [sceneId, content]);

  return { content, isDirty, loading, saving, error, onChange, save };
}
