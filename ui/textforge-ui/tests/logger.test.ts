import { afterEach, describe, expect, it, vi } from 'vitest';
import { logError, logInfo, logWarn } from '../src/lib/logger';

describe('logger fire-and-forget behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts expected payload for info/warn/error logs', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    logInfo('boot complete');
    logWarn('slow op', 'detail');
    logError('boom', 'detail', 'stack');

    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(bodies[0]).toEqual({ level: 'info', message: 'boot complete' });
    expect(bodies[1]).toEqual({ level: 'warn', message: 'slow op', detail: 'detail' });
    expect(bodies[2]).toEqual({ level: 'error', message: 'boom', detail: 'detail', stack: 'stack' });
  });

  it('swallows network errors and does not throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));

    expect(() => logInfo('still safe')).not.toThrow();
    expect(() => logWarn('still safe', 'detail')).not.toThrow();
    expect(() => logError('still safe', 'detail', 'stack')).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();
  });
});
