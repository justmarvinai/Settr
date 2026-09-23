import { db, savePriceSession, useHoldings, useLatestPrices, useSettings } from '@/db';
import { nowIso, todayIso } from '@/domain/ids';
import {
  seriesStates,
  sessionQueue,
  type PriceSessionState,
  type SeriesState,
  type SessionOrder,
  type SessionScope,
} from '@/domain/valuation';
import { useLibraryRows, type LibraryRow } from '@/features/collection';

export interface SessionData {
  states: SeriesState[];
  byKey: ReadonlyMap<string, SeriesState>;
  /** A lot's row per series (name, picture, set order) for display. */
  rowOf: (state: SeriesState) => LibraryRow | undefined;
  today: string;
}

/**
 * Every price series with open lots valued by it, with their names from the catalog; undefined
 * while loading. Suspends while set chunks load (like the Sammlung lists).
 */
export function useSessionData(): SessionData | undefined {
  const holdings = useHoldings();
  const latest = useLatestPrices();
  const settings = useSettings();
  const cardRows = useLibraryRows('card');
  const sealedRows = useLibraryRows('sealed');
  if (!holdings || !latest || !cardRows || !sealedRows) return undefined;
  const today = todayIso();
  const states = seriesStates(holdings, latest, {
    today,
    staleAfterDays: settings.price.staleAfterDays,
  });
  const rows = new Map([...cardRows, ...sealedRows].map((r) => [r.holding.id, r]));
  return {
    states,
    byKey: new Map(states.map((s) => [s.seriesKey, s])),
    rowOf: (state) => {
      for (const lot of state.lots) {
        const row = rows.get(lot.id);
        if (row) return row;
      }
      return undefined;
    },
    today,
  };
}

/** Builds a session's queue and stores it (replacing a paused one); returns how many it holds. */
export async function startSession(
  data: SessionData,
  scope: SessionScope,
  order: SessionOrder,
  selection?: ReadonlySet<string>,
): Promise<number> {
  const queue = sessionQueue(data.states, scope, order, {
    ...(selection ? { selection } : {}),
    setSort: (state) => data.rowOf(state)?.setSort ?? Number.MAX_SAFE_INTEGER,
  });
  const state: PriceSessionState = {
    scope,
    order,
    queue,
    position: 0,
    results: {},
    startedAt: nowIso(),
  };
  await savePriceSession(db, state);
  return queue.length;
}
