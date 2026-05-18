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
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setContent('');
    setSavedContent('');
    setError(null);
    scenesApi.getScene(sceneId)
      .then(scene => {
        if (cancelled) return;
        const c = scene.content ?? '';
        setContent(c);
        setSavedContent(c);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError((e as { message?: string }).message ?? 'Failed to load scene.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
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
