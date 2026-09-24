// Gives Vitest (Node) an in-memory IndexedDB for the Dexie repositories.
import 'fake-indexeddb/auto';
import * as fc from 'fast-check';

// Property tests (QUALITY.md §2): the same seed on every run, so CI is reproducible; a random one
// nightly (FC_SEED=random, printed), or a failing run's seed to replay it (FC_SEED=<number>).
const setting = process.env.FC_SEED;
const seed =
  setting === 'random' ? Math.floor(Math.random() * 2 ** 31) : Number(setting ?? 20_260_924);
if (setting === 'random') console.info(`fast-check seed: ${seed}`);
fc.configureGlobal({ seed });
