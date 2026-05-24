interface LogPayload {
  level: 'info' | 'warn' | 'error';
  message: string;
  detail?: string;
  stack?: string;
}

// Best-effort: never throws, never recurses.
async function send(payload: LogPayload): Promise<void> {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5_000),
    });
  } catch { /* swallow — logging must never cause more errors */ }
}

export function logError(message: string, detail?: string, stack?: string): void {
  void send({ level: 'error', message, detail, stack });
}

export function logWarn(message: string, detail?: string): void {
  void send({ level: 'warn', message, detail });
}

export function logInfo(message: string): void {
  void send({ level: 'info', message });
}
