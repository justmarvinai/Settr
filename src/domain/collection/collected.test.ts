import { describe, expect, it } from 'vitest';
import { newId } from '../ids';
import { holding } from '../../../tests/factories';
import { collectedSets } from './collected';

const chunkOf = (setId: string) => (setId === 'intl:30th-c' ? 'intl:30th' : setId);

describe('collectedSets', () => {
  it('counts open card lots per set chunk and language, most first', () => {
    const sets = collectedSets(
      [
        holding({ language: 'de' }),
        holding({ language: 'de', setId: 'intl:30th-c' }), // a subset counts for its main set
        holding({ language: 'en' }),
        holding({ language: 'ja', setId: 'asia:M6a', print: 'asia' }),
        holding({ language: 'ja', setId: 'asia:M6a', print: 'asia' }),
        holding({ language: 'ja', setId: 'asia:M6a', print: 'asia' }),
      ],
      chunkOf,
    );
    expect(sets).toEqual([
      { setId: 'asia:M6a', language: 'ja', lots: 3 },
      { setId: 'intl:30th', language: 'de', lots: 2 },
      { setId: 'intl:30th', language: 'en', lots: 1 },
    ]);
  });

  it('leaves out sealed, closed lots and lots without a set', () => {
    const sold = holding({
      disposals: [{ id: newId(), type: 'sale', date: '2026-09-10', quantity: 1 }],
    });
    const sealed = holding({ item: { kind: 'sealed', id: 'sealed:30th:etb-de' } });
    const custom = holding({ setId: undefined });
    expect(collectedSets([sold, sealed, custom], chunkOf)).toEqual([]);
  });
});
