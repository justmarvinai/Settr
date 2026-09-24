import { ArrowRightIcon, CurrencyEurIcon, PlusIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import type { CardLanguage, ItemRef } from '@/domain/catalog-types';
import { m } from '@/i18n';
import { closeSheet, openSheet } from '@/lib/sheets';

const rowClass =
  'flex h-14 w-full items-center gap-3 rounded-[16px] px-3 text-left type-ui text-ink transition-colors duration-(--dur-fast) hover:bg-hover';

/**
 * A tile's long-press menu on phones (UX_SPEC.md §4.3): the full add sheet, a price for the
 * tile's language, and the item's page. The chosen sheet takes this one's place.
 */
export function ItemActionsBody({
  item,
  setId,
  language,
}: {
  item: ItemRef;
  setId?: string | undefined;
  language: CardLanguage;
}) {
  return (
    <div className="mt-4 flex flex-col gap-1">
      <button
        type="button"
        data-initial-focus
        className={rowClass}
        onClick={() => openSheet({ type: 'add', item, setId, language })}
      >
        <PlusIcon size={22} weight="bold" aria-hidden className="shrink-0 text-accent-text" />
        {m.tile_menu_add()}
      </button>
      <button
        type="button"
        className={rowClass}
        onClick={() => openSheet({ type: 'price', item, setId, language })}
      >
        <CurrencyEurIcon
          size={22}
          weight="bold"
          aria-hidden
          className="shrink-0 text-accent-text"
        />
        {m.action_price()}
      </button>
      {item.kind === 'card' && setId ? (
        <Link
          to="/catalog/sets/$setId/cards/$cardId"
          params={{ setId, cardId: item.id }}
          search={{ lang: language }}
          onClick={closeSheet}
          className={rowClass}
        >
          <ArrowRightIcon
            size={22}
            weight="bold"
            aria-hidden
            className="shrink-0 text-accent-text"
          />
          {m.tile_menu_details()}
        </Link>
      ) : null}
      {item.kind === 'sealed' ? (
        <Link
          to="/catalog/sealed/$productId"
          params={{ productId: item.id }}
          search={{ lang: language }}
          onClick={closeSheet}
          className={rowClass}
        >
          <ArrowRightIcon
            size={22}
            weight="bold"
            aria-hidden
            className="shrink-0 text-accent-text"
          />
          {m.tile_menu_details()}
        </Link>
      ) : null}
    </div>
  );
}
