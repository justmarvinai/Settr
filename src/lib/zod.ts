// oxlint-disable-next-line eslint/no-restricted-imports -- the one place that imports Zod itself
import { z } from 'zod';

/**
 * Zod, set up for Settr: import `z` from here, never from 'zod'.
 *
 * Settr's CSP has no 'unsafe-eval' (vercel.json). Zod 4 compiles object parsers with `new Function`
 * when it may and probes for that when it builds the first object schema; the CSP blocks the probe,
 * and although Zod catches the error, browsers report a CSP violation (Firefox even logs it). So Zod
 * runs jitless. Schemas are built at module load, so this must run before any of them: every module
 * that builds schemas imports `z` from here, which makes this module evaluate first in any chunk.
 */
z.config({ jitless: true });

export { z };
