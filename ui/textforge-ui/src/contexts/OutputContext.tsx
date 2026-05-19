import { createContext, useCallback, useContext, useState } from 'react';

export interface OutputLine {
  id: number;
  ts: Date;
  level: 'info' | 'ok' | 'warn';
  msg: string;
}

interface OutputContextValue {
  lines: OutputLine[];
  log: (level: OutputLine['level'], msg: string) => void;
  clear: () => void;
}

const OutputContext = createContext<OutputContextValue>({
  lines: [],
  log: () => {},
  clear: () => {},
});

let _nextId = 0;

export function OutputProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<OutputLine[]>([]);

  const log = useCallback((level: OutputLine['level'], msg: string) => {
    setLines(prev => [...prev.slice(-199), { id: _nextId++, ts: new Date(), level, msg }]);
  }, []);

  const clear = useCallback(() => setLines([]), []);

  return (
    <OutputContext.Provider value={{ lines, log, clear }}>
      {children}
    </OutputContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOutput = () => useContext(OutputContext);
