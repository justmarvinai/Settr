import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG_SETS } from './config';
import { dirs, LOCK_FILE, readLock, type SourceName } from './paths';

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_LFS_SKIP_SMUDGE: '1' },
  })
    .toString()
    .trim();

/**
 * Checks out a GitHub repository at the pinned commit: shallow, and with `sparse` only the listed
 * folders (the Traditional Chinese database is 670 MB; we need one folder of it).
 */
function checkout(name: SourceName, dir: string, sparse?: string[]): string {
  const { repo, commit } = readLock()[name];
  if (!existsSync(join(dir, '.git'))) {
    mkdirSync(dir, { recursive: true });
    git(dir, 'init', '--quiet');
    git(dir, 'remote', 'add', 'origin', repo);
    if (sparse) {
      git(dir, 'config', 'remote.origin.promisor', 'true');
      git(dir, 'config', 'remote.origin.partialclonefilter', 'blob:none');
    }
  }
  // Every run, so a cached checkout picks up folders of newly configured sets.
  if (sparse) git(dir, 'sparse-checkout', 'set', '--cone', ...sparse);
  const head = (() => {
    try {
      return git(dir, 'rev-parse', 'HEAD');
    } catch {
      return '';
    }
  })();
  if (head !== commit) {
    const filter = sparse ? ['--filter=blob:none'] : [];
    git(dir, 'fetch', '--quiet', '--depth', '1', ...filter, 'origin', commit);
    git(dir, 'checkout', '--quiet', '--force', commit);
  }
  return commit;
}

export async function download(url: string, file: string): Promise<void> {
  const response = await fetch(url, {
    headers: { 'user-agent': 'settr-catalog-pipeline (+https://github.com/justmarvinai/Settr)' },
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

/** Moves every pinned source to its upstream HEAD (weekly sync); returns the ones that changed. */
export function updateLock(): string[] {
  const lock = readLock();
  const changed: string[] = [];
  for (const [name, source] of Object.entries(lock)) {
    const head = execFileSync('git', ['ls-remote', source.repo, 'HEAD'])
      .toString()
      .split('\t')[0]
      ?.trim();
    if (head && head !== source.commit) {
      changed.push(`${name}: ${source.commit.slice(0, 7)} → ${head.slice(0, 7)}`);
      source.commit = head;
    }
  }
  writeFileSync(LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`);
  return changed;
}

/** Brings all inputs into the cache. GitHub sources are required; Cardmarket's files need network. */
export async function fetchSources(options: { network: boolean }): Promise<void> {
  const lock = readLock();
  if (!process.env.TCGDEX_DIR) checkout('tcgdex', dirs.tcgdex);
  if (!process.env.PTCG_DIR)
    checkout(
      'ptcgDatabase',
      dirs.ptcgDatabase,
      CATALOG_SETS.flatMap((c) =>
        c.traditionalChinese ? [`data_tc/${c.traditionalChinese}`] : [],
      ),
    );

  mkdirSync(dirs.pokeapi, { recursive: true });
  for (const file of ['pokemon_species_names.csv']) {
    const target = join(dirs.pokeapi, `${lock.pokeapi.commit.slice(0, 12)}-${file}`);
    if (!existsSync(target)) {
      await download(
        `https://raw.githubusercontent.com/PokeAPI/pokeapi/${lock.pokeapi.commit}/data/v2/csv/${file}`,
        target,
      );
    }
  }

  if (!options.network) return;
  mkdirSync(dirs.cardmarket, { recursive: true });
  const cm = 'https://downloads.s3.cardmarket.com/productCatalog/productList';
  await download(`${cm}/products_singles_6.json`, join(dirs.cardmarket, 'products_singles_6.json'));
  await download(
    `${cm}/products_nonsingles_6.json`,
    join(dirs.cardmarket, 'products_nonsingles_6.json'),
  );
}
