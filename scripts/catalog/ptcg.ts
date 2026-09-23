import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirs } from './paths';

/**
 * Official Traditional Chinese card names from type-null/PTCG-database (MIT; scraped from
 * asia.pokemon-card.com/tw), keyed by card number (ADR-026). Missing folder = no TC names.
 */
export function loadTraditionalChineseNames(setCode: string): Map<string, string> {
  const dir = join(dirs.ptcgDatabase, 'data_tc', setCode);
  const names = new Map<string, string>();
  if (!existsSync(dir)) return names;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const card = JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
      number?: string;
      name?: string;
    };
    if (card.number && card.name) names.set(card.number, card.name.trim());
  }
  return names;
}
