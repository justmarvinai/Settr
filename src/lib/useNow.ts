import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `intervalMs`. Components read time through this hook instead of
 * calling Date.now() while rendering, so renders stay pure and relative dates stay current.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
