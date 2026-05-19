import { useCallback, useEffect, useRef, useState } from 'react';
import type { CharacterDto } from '../../api/characters';
import * as charactersApi from '../../api/characters';
import { Icon } from '../ui/Icon';

interface CharacterEditorProps {
  characterId: string;
  onSaved?: (character: CharacterDto) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const GENDER_OPTIONS = ['', 'Male', 'Female', 'Non-binary', 'Other'];

export function CharacterEditor({ characterId, onSaved }: CharacterEditorProps) {
  const [character, setCharacter] = useState<CharacterDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<CharacterDto | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageKey, setImageKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setCharacter(null);
    latestRef.current = null;
    charactersApi.getCharacter(characterId)
      .then(c => { setCharacter(c); latestRef.current = c; })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [characterId]);

  const flushSave = useCallback(async (c: CharacterDto) => {
    setSaveStatus('saving');
    try {
      const saved = await charactersApi.saveCharacterDetails(c.id, {
        name: c.name,
        role: c.role,
        age: c.age,
        gender: c.gender,
        personality: c.personality,
        biography: c.biography,
      });
      setSaveStatus('saved');
      onSaved?.(saved);
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 1500);
    } catch {
      setSaveStatus('error');
    }
  }, [onSaved]);

  const scheduleSave = useCallback((updated: CharacterDto) => {
    latestRef.current = updated;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(updated), 800);
  }, [flushSave]);

  const update = useCallback((patch: Partial<CharacterDto>) => {
    setCharacter(prev => {
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
      const saved = await charactersApi.uploadCharacterImage(characterId, file);
      setCharacter(saved);
      setImageKey(k => k + 1);
      onSaved?.(saved);
    } catch { /* ignore */ }
    e.target.value = '';
  }, [characterId, onSaved]);

  const handleImageRemove = useCallback(async () => {
    if (!character) return;
    try {
      await charactersApi.deleteCharacterImage(characterId);
      const updated = { ...character, hasImage: false };
      setCharacter(updated);
      setImageKey(k => k + 1);
      onSaved?.(updated);
    } catch { /* ignore */ }
  }, [characterId, character, onSaved]);

  if (loading) {
    return (
      <div className="char-ed-wrap">
        <div className="char-ed-loading">Loading…</div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="char-ed-wrap">
        <div className="char-ed-loading">Character not found.</div>
      </div>
    );
  }

  const avatarInitials = character.name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const imageUrl = character.hasImage
    ? `${charactersApi.getCharacterImageUrl(characterId)}?v=${imageKey}`
    : null;

  return (
    <div className="char-ed-wrap">
      <div className="char-ed-scroll">
        <div className="char-ed-body">

          {/* Avatar + identity */}
          <div className="char-ed-identity">
            <div className="char-ed-avatar-col">
              <div className="char-ed-avatar" onClick={() => imageInputRef.current?.click()}>
                {imageUrl
                  ? <img src={imageUrl} alt={character.name} />
                  : <span>{avatarInitials || <Icon name="user" size={28} stroke={1} />}</span>
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
              {character.hasImage && (
                <button className="char-ed-img-remove" onClick={handleImageRemove} title="Remove image">
                  <Icon name="x" size={12} /> Remove
                </button>
              )}
            </div>

            <div className="char-ed-name-col">
              <input
                className="char-ed-name"
                value={character.name}
                onChange={e => update({ name: e.target.value })}
                placeholder="Character name"
              />
              <input
                className="char-ed-role"
                value={character.role}
                onChange={e => update({ role: e.target.value })}
                placeholder="Role (e.g. Protagonist)"
              />
              <div className="char-ed-row">
                <div className="char-ed-field">
                  <label>Age</label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={character.age ?? ''}
                    onChange={e => update({ age: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                    placeholder="—"
                  />
                </div>
                <div className="char-ed-field">
                  <label>Gender</label>
                  <select
                    value={character.gender ?? ''}
                    onChange={e => update({ gender: e.target.value || null })}
                  >
                    {GENDER_OPTIONS.map(g => (
                      <option key={g} value={g}>{g || '—'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Personality */}
          <div className="char-ed-section">
            <label className="char-ed-label">Personality</label>
            <textarea
              className="char-ed-textarea char-ed-personality"
              value={character.personality ?? ''}
              onChange={e => update({ personality: e.target.value || null })}
              placeholder="Describe their personality traits, quirks, and mannerisms…"
              rows={3}
            />
          </div>

          {/* Biography */}
          <div className="char-ed-section">
            <label className="char-ed-label">Biography</label>
            <textarea
              className="char-ed-textarea char-ed-biography"
              value={character.biography ?? ''}
              onChange={e => update({ biography: e.target.value || null })}
              placeholder="Background, history, and story arc…"
              rows={8}
            />
          </div>

        </div>
      </div>

      {/* Save status indicator */}
      <div className={`char-ed-status char-ed-status--${saveStatus}`}>
        {saveStatus === 'saving' && 'Saving…'}
        {saveStatus === 'saved' && 'Saved'}
        {saveStatus === 'error' && 'Save failed'}
      </div>
    </div>
  );
}
