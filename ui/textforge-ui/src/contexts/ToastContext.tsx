import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface ToastEntry {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          {toasts.map(t => (
            <div
              key={t.id}
              style={{
                background: '#3c1e1e',
                color: '#f48771',
                padding: '10px 12px 10px 14px',
                borderRadius: '4px',
                border: '1px solid #7a3f3f',
                fontSize: '13px',
                maxWidth: '340px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                pointerEvents: 'all',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              <span style={{ flex: 1, lineHeight: '1.4' }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f48771',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
