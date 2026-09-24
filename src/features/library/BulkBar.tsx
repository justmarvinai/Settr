import {
  ArrowsLeftRightIcon,
  CurrencyEurIcon,
  FileCsvIcon,
  TagIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Checkbox, FormRow } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import {
  db,
  deleteHoldings,
  ensureTag,
  listHoldingsAt,
  restoreHoldings,
  setUiPref,
  updateHoldings,
  useHoldingsInLocation,
} from '@/db';
import { freeSlots, NO_LOCATION, occupiedSlots } from '@/domain/collection';
import { remaining, type Holding, type Location, type Tag } from '@/domain/schemas';
import { seriesKeyOf } from '@/domain/series';
import { m } from '@/i18n';
import { formatCount } from '@/i18n/format';
import { toastError, toastWithUndo, type LibraryRow } from '@/features/collection';
import { downloadCollectionCsv, useCsvDialect } from '@/features/data';

const counted = (n: number) => ({ n, count: formatCount(n) });

function TagsForm({
  lots,
  tags,
  onDone,
}: {
  lots: readonly Holding[];
  tags: readonly Tag[];
  onDone: () => void;
}) {
  const id = useId();
  // Tag id → true (every lot gets it) or false (no lot keeps it); untouched tags stay as they are.
  const [changes, setChanges] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const having = (tagId: string) => lots.filter((h) => h.tags.includes(tagId)).length;

  const set = (tagId: string, value: boolean) =>
    setChanges((prev) => new Map(prev).set(tagId, value));

  const create = async () => {
    if (!name.trim()) return;
    try {
      const tag = await ensureTag(db, name);
      set(tag.id, true);
      setName('');
    } catch (error) {
      toastError(error);
    }
  };

  const apply = async () => {
    if (!changes.size) {
      onDone();
      return;
    }
    setBusy(true);
    const add = [...changes].filter(([, on]) => on).map(([tagId]) => tagId);
    const drop = new Set([...changes].filter(([, on]) => !on).map(([tagId]) => tagId));
    try {
      const before = await updateHoldings(
        db,
        lots.map((h) => h.id),
        (h) => ({ tags: [...new Set([...h.tags.filter((t) => !drop.has(t)), ...add])] }),
      );
      toastWithUndo(m.toast_bulk_tags(counted(before.length)), () => restoreHoldings(db, before));
      onDone();
    } catch (error) {
      toastError(error);
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      className="mt-2 flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void apply();
      }}
    >
      <p className="type-small m-0 text-ink-muted">{m.bulk_tags_intro()}</p>
      {tags.length ? (
        <ul className="m-0 flex max-h-[40vh] list-none flex-col gap-1 overflow-y-auto p-0">
          {tags.map((tag) => {
            const count = having(tag.id);
            const change = changes.get(tag.id);
            const some = change === undefined && count > 0 && count < lots.length;
            return (
              <li key={tag.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[12px] px-2 hover:bg-hover">
                  <Checkbox
                    checked={change ?? count === lots.length}
                    indeterminate={some}
                    onCheckedChange={(checked) => set(tag.id, checked)}
                  />
                  <span className="type-ui min-w-0 flex-1 truncate text-ink">{tag.name}</span>
                  {some ? (
                    <span className="type-small shrink-0 text-ink-muted">
                      {m.bulk_tags_some({
                        count: formatCount(count),
                        total: formatCount(lots.length),
                      })}
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="type-body m-0 text-ink-muted">{m.bulk_tags_none()}</p>
      )}
      <div className="flex items-end gap-2">
        <FormRow label={m.holding_tag_new()} htmlFor={`${id}-new`} className="flex-1">
          <Input
            id={`${id}-new`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              // Enter here creates the tag instead of submitting the form.
              if (event.key !== 'Enter') return;
              event.preventDefault();
              void create();
            }}
          />
        </FormRow>
        <Button variant="quiet" size="lg" onClick={() => void create()} disabled={!name.trim()}>
          {m.holding_tag_add()}
        </Button>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>
          {m.bulk_cancel()}
        </Button>
        <Button variant="primary" type="submit" disabled={busy}>
          {m.bulk_apply()}
        </Button>
      </div>
    </form>
  );
}

function MoveForm({
  lots,
  locations,
  onDone,
}: {
  lots: readonly Holding[];
  locations: readonly Location[];
  onDone: () => void;
}) {
  const id = useId();
  const [target, setTarget] = useState(locations[0]?.id ?? NO_LOCATION);
  const [busy, setBusy] = useState(false);
  const location = locations.find((l) => l.id === target);
  const layout = location?.kind === 'binder' ? location.layout : undefined;
  const present = useHoldingsInLocation(layout ? target : '');
  // Lots already in the target keep their pocket; the others fill the next free ones in order.
  const moving = lots.filter((h) => h.location?.id !== target);
  const movingIds = new Set(moving.map((h) => h.id));
  const room =
    layout && present
      ? freeSlots(
          occupiedSlots(
            present.filter((h) => !movingIds.has(h.id)),
            target,
          ),
          layout,
          location?.pages,
          moving.length,
        ).length
      : undefined;

  const apply = async () => {
    setBusy(true);
    try {
      if (target === NO_LOCATION || !location) {
        const before = await updateHoldings(
          db,
          lots.map((h) => h.id),
          () => ({ location: undefined }),
        );
        toastWithUndo(m.toast_bulk_unplaced(counted(before.length)), () =>
          restoreHoldings(db, before),
        );
      } else {
        const pockets = layout
          ? freeSlots(
              occupiedSlots(
                (await listHoldingsAt(db, location.id)).filter((h) => !movingIds.has(h.id)),
                location.id,
              ),
              layout,
              location.pages,
              moving.length,
            )
          : [];
        const pocketOf = new Map(moving.map((h, index) => [h.id, pockets[index]]));
        const before = await updateHoldings(
          db,
          moving.map((h) => h.id),
          (h) => {
            const pocket = pocketOf.get(h.id);
            return {
              location: pocket
                ? { id: location.id, page: pocket.page, slot: pocket.slot }
                : { id: location.id },
            };
          },
        );
        toastWithUndo(m.toast_bulk_moved({ ...counted(lots.length), name: location.name }), () =>
          restoreHoldings(db, before),
        );
      }
      onDone();
    } catch (error) {
      toastError(error);
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      className="mt-4 flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void apply();
      }}
    >
      <FormRow
        label={m.holding_location()}
        htmlFor={`${id}-target`}
        describedBy={`${id}-hint`}
        hint={
          layout
            ? room !== undefined && room < moving.length
              ? m.bulk_move_short(counted(room))
              : m.bulk_move_binder_hint()
            : undefined
        }
      >
        <NativeSelect
          id={`${id}-target`}
          value={target}
          aria-describedby={layout ? `${id}-hint` : undefined}
          onChange={(event) => setTarget(event.target.value)}
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
          <option value={NO_LOCATION}>{m.holding_location_none()}</option>
        </NativeSelect>
      </FormRow>
      {locations.length ? null : (
        <p className="type-small m-0 flex flex-wrap gap-x-1 text-ink-muted">
          {m.bulk_move_no_locations()}
          <Link to="/settings/locations" className="font-bold text-accent-text hover:underline">
            {m.locations_title()}
          </Link>
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>
          {m.bulk_cancel()}
        </Button>
        <Button variant="primary" type="submit" disabled={busy}>
          {m.bulk_move_submit()}
        </Button>
      </div>
    </form>
  );
}

/**
 * Multi-select actions (UX_SPEC.md §4.6): a price session, tags, move to a location (binders fill
 * their next free pockets), CSV (DAT-03) and delete. Changes are one transaction with Rückgängig.
 */
export function BulkBar({
  rows,
  lots,
  total,
  locations,
  tags,
  onSelectAll,
  onClear,
}: {
  /** Selected lots in list order, as rows (names and values for CSV). */
  rows: readonly LibraryRow[];
  /** The same lots. */
  lots: readonly Holding[];
  /** Lots shown, for "Alle auswählen". */
  total: number;
  locations: readonly Location[];
  tags: readonly Tag[];
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const [dialog, setDialog] = useState<'tags' | 'move' | null>(null);
  const [dialect] = useCsvDialect();
  const navigate = useNavigate();
  const count = lots.length;
  const close = () => setDialog(null);

  /** A price session over the series of the chosen lots (UX_SPEC.md §4.6, PRC-04). */
  const priceSession = async () => {
    try {
      const keys = [...new Set(lots.filter((h) => remaining(h) > 0).map(seriesKeyOf))];
      await setUiPref(db, 'session.selection', keys);
      await navigate({ to: '/prices/session', search: { start: 'selection' } });
    } catch (error) {
      toastError(error);
    }
  };

  const remove = async () => {
    try {
      const deleted = await deleteHoldings(
        db,
        lots.map((h) => h.id),
      );
      onClear();
      toastWithUndo(m.toast_bulk_deleted(counted(deleted.length)), () =>
        restoreHoldings(db, deleted),
      );
    } catch (error) {
      toastError(error);
    }
  };

  return (
    <section
      aria-label={m.bulk_label()}
      data-bulk-bar=""
      className="glass-thick fixed inset-x-3.5 bottom-[calc(max(16px,env(safe-area-inset-bottom))+80px)] z-40 flex items-center gap-1 rounded-pill p-1.5 md:inset-x-auto md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:gap-2 md:p-2"
    >
      <span aria-live="polite" className="type-ui min-w-0 shrink truncate px-3 tabular-nums">
        {m.bulk_selected({ count: formatCount(count) })}
      </span>
      {count < total ? (
        <Button variant="ghost" size="sm" onClick={onSelectAll} className="max-md:hidden">
          {m.bulk_select_all({ count: formatCount(total) })}
        </Button>
      ) : null}
      <span className="ml-auto flex items-center gap-1 md:ml-0">
        <Button
          variant="quiet"
          size="sm"
          disabled={!lots.some((h) => remaining(h) > 0)}
          onClick={() => void priceSession()}
          aria-label={m.bulk_prices()}
        >
          <CurrencyEurIcon size={16} weight="bold" aria-hidden />
          <span className="max-sm:hidden">{m.bulk_prices()}</span>
        </Button>
        <Button
          variant="quiet"
          size="sm"
          disabled={!count}
          onClick={() => setDialog('tags')}
          aria-label={m.bulk_tags()}
        >
          <TagIcon size={16} weight="bold" aria-hidden />
          <span className="max-sm:hidden">{m.bulk_tags()}</span>
        </Button>
        <Button
          variant="quiet"
          size="sm"
          disabled={!count}
          onClick={() => setDialog('move')}
          aria-label={m.bulk_move()}
        >
          <ArrowsLeftRightIcon size={16} weight="bold" aria-hidden />
          <span className="max-sm:hidden">{m.bulk_move()}</span>
        </Button>
        <Button
          variant="quiet"
          size="sm"
          disabled={!count}
          onClick={() =>
            downloadCollectionCsv(rows, new Map(tags.map((t) => [t.id, t.name])), dialect)
          }
          aria-label={m.bulk_csv()}
        >
          <FileCsvIcon size={16} weight="bold" aria-hidden />
          <span className="max-sm:hidden">{m.bulk_csv()}</span>
        </Button>
        <Button
          variant="quiet"
          size="sm"
          disabled={!count}
          onClick={() => void remove()}
          aria-label={m.bulk_delete()}
          className="text-loss"
        >
          <TrashIcon size={16} weight="bold" aria-hidden />
          <span className="max-sm:hidden">{m.bulk_delete()}</span>
        </Button>
        <IconButton label={m.bulk_clear()} onClick={onClear} className="size-9 bg-transparent">
          <XIcon size={18} weight="bold" aria-hidden />
        </IconButton>
      </span>
      <Dialog
        open={dialog === 'tags'}
        onOpenChange={(open) => !open && close()}
        title={m.bulk_tags_title(counted(count))}
      >
        <TagsForm lots={lots} tags={tags} onDone={close} />
      </Dialog>
      <Dialog
        open={dialog === 'move'}
        onOpenChange={(open) => !open && close()}
        title={m.bulk_move_title(counted(count))}
      >
        <MoveForm lots={lots} locations={locations} onDone={close} />
      </Dialog>
    </section>
  );
}
