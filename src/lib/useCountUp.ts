import { useEffect, useEffectEvent, useState } from 'react';
import { motionWanted } from './motion';

/** Views whose number has already counted up in this session. */
const counted = new Set<string>();

const DURATION_MS = 700;

/**
 * A number that counts up from 0 the first time a view shows it (DESIGN_SYSTEM.md §7 moment 3,
 * the hero odometer): once per `view` and session, never on later renders or visits, and not at
 * all under reduced motion. `counting` is true while it runs, so the caller can hand screen
 * readers the final value instead.
 */
export function useCountUp(view: string, target: number): { value: number; counting: boolean } {
  const [progress, setProgress] = useState(() =>
    target === 0 || counted.has(view) || !motionWanted() ? 1 : 0,
  );

  const start = useEffectEvent(() => {
    counted.add(view);
    const begin = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - begin) / DURATION_MS);
      setProgress(1 - (1 - t) ** 3); // ease-out
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  const pending = progress < 1;
  useEffect(() => {
    if (!pending) return undefined;
    return start();
  }, [pending]);

  return pending
    ? { value: Math.round(target * progress), counting: true }
    : { value: target, counting: false };
}
