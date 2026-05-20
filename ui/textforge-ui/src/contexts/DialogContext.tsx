import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PromptOptions {
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  dangerous?: boolean;
}

type ActiveDialog =
  | { kind: 'prompt'; options: PromptOptions; resolve: (v: string | null) => void }
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (v: boolean) => void };

interface DialogContextValue {
  prompt: (options: PromptOptions) => Promise<string | null>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ── Context ────────────────────────────────────────────────────────────────

const DialogContext = createContext<DialogContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);

  const prompt = useCallback(
    (options: PromptOptions): Promise<string | null> =>
      new Promise(resolve => setDialog({ kind: 'prompt', options, resolve })),
    [],
  );

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> =>
      new Promise(resolve => setDialog({ kind: 'confirm', options, resolve })),
    [],
  );

  function close(value: string | null | boolean) {
    if (!dialog) return;
    if (dialog.kind === 'prompt') dialog.resolve(value as string | null);
    else dialog.resolve(value as boolean);
    setDialog(null);
  }

  return (
    <DialogContext.Provider value={{ prompt, confirm }}>
      {children}
      {dialog && <DialogModal dialog={dialog} onClose={close} />}
    </DialogContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

// ── Modal UI ───────────────────────────────────────────────────────────────

function DialogModal({
  dialog,
  onClose,
}: {
  dialog: ActiveDialog;
  onClose: (value: string | null | boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(
    dialog.kind === 'prompt' ? (dialog.options.defaultValue ?? '') : '',
  );

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(dialog.kind === 'prompt' ? null : false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dialog, onClose]);

  if (dialog.kind === 'prompt') {
    const { options } = dialog;
    const canConfirm = value.trim().length > 0;
    return (
      <div className="vs-modal-overlay" onMouseDown={() => onClose(null)}>
        <div className="dlg-box" onMouseDown={e => e.stopPropagation()}>
          <div className="dlg-title">{options.title}</div>
          <input
            ref={inputRef}
            className="vs-form-input"
            placeholder={options.placeholder ?? ''}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && canConfirm) onClose(value.trim());
            }}
          />
          <div className="dlg-actions">
            <button className="vs-btn secondary" onClick={() => onClose(null)}>
              Cancel
            </button>
            <button
              className="vs-btn primary"
              disabled={!canConfirm}
              onClick={() => onClose(value.trim())}
            >
              {options.confirmLabel ?? 'OK'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { options } = dialog;
  return (
    <div className="vs-modal-overlay" onMouseDown={() => onClose(false)}>
      <div className="dlg-box" onMouseDown={e => e.stopPropagation()}>
        <div className="dlg-title">{options.title}</div>
        <p className="dlg-message">{options.message}</p>
        <div className="dlg-actions">
          <button className="vs-btn secondary" onClick={() => onClose(false)}>
            Cancel
          </button>
          <button
            className={`vs-btn ${options.dangerous ? 'danger' : 'primary'}`}
            onClick={() => onClose(true)}
          >
            {options.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
