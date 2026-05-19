import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LocationDto } from '../../api/locations';
import * as locationsApi from '../../api/locations';
import { Icon } from '../ui/Icon';

interface LocationEditorProps {
  locationId: string;
  onSaved?: (location: LocationDto) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function LocationEditor({ locationId, onSaved }: LocationEditorProps) {
  const [location, setLocation] = useState<LocationDto | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loading = loadedId !== locationId;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<LocationDto | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageKey, setImageKey] = useState(0);

  useLayoutEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    latestRef.current = null;
    locationsApi.getLocation(locationId)
      .then(l => {
        if (cancelled) return;
        setLocation(l);
        setLoadedId(locationId);
        latestRef.current = l;
      })
      .catch(() => { if (!cancelled) setLoadedId(locationId); });
    return () => { cancelled = true; };
  }, [locationId]);

  const flushSave = useCallback(async (l: LocationDto) => {
    setSaveStatus('saving');
    try {
      const saved = await locationsApi.saveLocationDetails(l.id, {
        name: l.name,
        description: l.description,
      });
      setSaveStatus('saved');
      onSaved?.(saved);
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 1500);
    } catch {
      setSaveStatus('error');
    }
  }, [onSaved]);

  const scheduleSave = useCallback((updated: LocationDto) => {
    latestRef.current = updated;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(updated), 800);
  }, [flushSave]);

  const update = useCallback((patch: Partial<LocationDto>) => {
    setLocation(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      scheduleSave(updated);
      return updated;
    });
  }, [scheduleSave]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const saved = await locationsApi.uploadLocationImage(locationId, file);
      setLocation(saved);
      setImageKey(k => k + 1);
      onSaved?.(saved);
    } catch { /* ignore */ }
    e.target.value = '';
  }, [locationId, onSaved]);

  const handleImageRemove = useCallback(async () => {
    if (!location) return;
    try {
      await locationsApi.deleteLocationImage(locationId);
      const updated = { ...location, hasImage: false };
      setLocation(updated);
      setImageKey(k => k + 1);
      onSaved?.(updated);
    } catch { /* ignore */ }
  }, [locationId, location, onSaved]);

  if (loading) {
    return (
      <div className="char-ed-wrap">
        <div className="char-ed-loading">Loading…</div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="char-ed-wrap">
        <div className="char-ed-loading">Location not found.</div>
      </div>
    );
  }

  const imageUrl = location.hasImage
    ? `${locationsApi.getLocationImageUrl(locationId)}?v=${imageKey}`
    : null;

  return (
    <div className="char-ed-wrap">
      <div className="char-ed-scroll">
        <div className="char-ed-body">

          {/* Image + name */}
          <div className="char-ed-identity">
            <div className="char-ed-avatar-col">
              <div className="char-ed-avatar loc-avatar" onClick={() => imageInputRef.current?.click()}>
                {imageUrl
                  ? <img src={imageUrl} alt={location.name} />
                  : <Icon name="map-pin" size={28} stroke={1.5} />
                }
                <div className="char-ed-avatar-overlay">
                  <Icon name="pencil" size={16} />
                </div>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              {location.hasImage && (
                <button className="char-ed-img-remove" onClick={handleImageRemove} title="Remove image">
                  <Icon name="x" size={12} /> Remove
                </button>
              )}
            </div>

            <div className="char-ed-name-col">
              <input
                className="char-ed-name"
                value={location.name}
                onChange={e => update({ name: e.target.value })}
                placeholder="Location name"
              />
            </div>
          </div>

          {/* Description */}
          <div className="char-ed-section">
            <label className="char-ed-label">Description</label>
            <textarea
              className="char-ed-textarea char-ed-biography"
              value={location.description ?? ''}
              onChange={e => update({ description: e.target.value || null })}
              placeholder="Describe this place — its appearance, atmosphere, and significance to the story…"
              rows={10}
            />
          </div>

        </div>
      </div>

      <div className={`char-ed-status char-ed-status--${saveStatus}`}>
        {saveStatus === 'saving' && 'Saving…'}
        {saveStatus === 'saved' && 'Saved'}
        {saveStatus === 'error' && 'Save failed'}
      </div>
    </div>
  );
}
