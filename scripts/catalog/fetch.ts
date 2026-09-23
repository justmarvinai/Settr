import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirs, readLock, type SourceName } from './paths';

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
      git(dir, 'sparse-checkout', 'set', '--cone', ...sparse);
    }
  }
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

async function download(url: string, file: string): Promise<void> {
  const response = await fetch(url, {
    headers: { 'user-agent': 'settr-catalog-pipeline (+https://github.com/justmarvinai/Settr)' },
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

export interface FetchResult {
  /** Network inputs that could be downloaded (CI); missing ones are skipped offline. */
  cardmarket: boolean;
  tcgdexAssets: boolean;
}

/** Brings all inputs into the cache. GitHub sources are required; the rest is optional (offline). */
export async function fetchSources(options: { network: boolean }): Promise<FetchResult> {
  const lock = readLock();
  if (!process.env.TCGDEX_DIR) checkout('tcgdex', dirs.tcgdex);
  if (!process.env.PTCG_DIR) checkout('ptcgDatabase', dirs.ptcgDatabase, ['data_tc/M6a']);

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

  const result: FetchResult = { cardmarket: false, tcgdexAssets: false };
  if (!options.network) return result;

  mkdirSync(dirs.cardmarket, { recursive: true });
  const cm = 'https://downloads.s3.cardmarket.com/productCatalog/productList';
  await download(`${cm}/products_singles_6.json`, join(dirs.cardmarket, 'products_singles_6.json'));
  await download(
    `${cm}/products_nonsingles_6.json`,
    join(dirs.cardmarket, 'products_nonsingles_6.json'),
  );
  result.cardmarket = true;

  mkdirSync(dirs.tcgdexAssets, { recursive: true });
  await download('https://assets.tcgdex.net/datas.json', join(dirs.tcgdexAssets, 'datas.json'));
  result.tcgdexAssets = true;
  return result;
}
