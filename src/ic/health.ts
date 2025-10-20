import { HOST } from './env';

/**
 * Check if ICP network is available by calling the status endpoint
 * This is a preflight check to prevent crashes when ICP is unavailable
 *
 * @param timeoutMs - Timeout in milliseconds (default: 4000)
 * @returns Promise<boolean> - true if ICP is available, false otherwise
 */
export async function isIcpAvailable(timeoutMs = 4000): Promise<boolean> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(`${HOST}/api/v2/status`, {
      method: 'GET',
      signal: ctrl.signal,
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(id);
  }
}
