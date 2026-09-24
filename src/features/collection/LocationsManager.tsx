import { ArrowDownIcon, ArrowUpIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormRow } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { ActionMenu } from '@/components/ui/Menu';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Panel } from '@/components/ui/Panel';
import {
  createLocation,
  db,
  deleteLocation,
  deleteTag,
  renameTag,
  restoreLocation,
  restoreTagOrLocation,
  updateLocation,
  useHoldings,
  useLocations,
  useTags,
  type NewLocation,
} from '@/db';
import { BINDER_LAYOUTS, pocketsPerPage } from '@/domain/collection';
import { isOpen, type Location } from '@/domain/schemas';
import { m } from '@/i18n';
import { formatCount } from '@/i18n/format';
import { toastError, toastWithUndo } from './toasts';

const KINDS = ['binder', 'box', 'case', 'display', 'other'] as const;
type Kind = (typeof KINDS)[number];
const KIND_LABEL: Record<Kind, () => string> = {
  binder: m.location_kind_binder,
  box: m.location_kind_box,
  case: m.location_kind_case,
  display: m.location_kind_display,
  other: m.location_kind_other,
};

const layoutKey = (layout: { columns: number; rows: number }) => `${layout.columns}x${layout.rows}`;
const LAYOUT_LABEL: Record<string, () => string> = {
  '3x3': m.location_layout_3x3,
  '4x3': m.location_layout_4x3,
  '3x4': m.location_layout_3x4,
};

/** A count for the plural messages: the number picks the form, the text is formatted. */
const counted = (n: number) => ({ n, count: formatCount(n) });

/** "3 × 3 · 9 Plätze · 20 Seiten" */
function describe(location: Location): string {
  const parts = [KIND_LABEL[location.kind]()];
  if (location.kind === 'binder' && location.layout) {
    parts.push(
      m.location_grid({
        columns: location.layout.columns,
        rows: location.layout.rows,
        ...counted(pocketsPerPage(location.layout)),
      }),
    );
    if (location.pages) parts.push(m.location_pages_count(counted(location.pages)));
  }
  return parts.join(' · ');
}

interface Draft {
  name: string;
  kind: Kind;
  layout: string;
  columns: string;
  rows: string;
  pages: string;
}

const emptyDraft: Draft = {
  name: '',
  kind: 'binder',
  layout: '3x3',
  columns: '3',
  rows: '3',
  pages: '',
};

function draftOf(location: Location): Draft {
  const layout = location.layout ? layoutKey(location.layout) : '3x3';
  return {
    name: location.name,
    kind: location.kind,
    layout: LAYOUT_LABEL[layout] ? layout : 'custom',
    columns: String(location.layout?.columns ?? 3),
    rows: String(location.layout?.rows ?? 3),
    pages: location.pages ? String(location.pages) : '',
  };
}

const positive = (text: string) =>
  /^\d+$/.test(text.trim()) && Number(text) >= 1 && Number(text) <= 999;

function toInput(draft: Draft): NewLocation | undefined {
  if (!draft.name.trim()) return undefined;
  const input: NewLocation = { name: draft.name.trim(), kind: draft.kind };
  if (draft.kind === 'binder') {
    const [columns, rows] =
      draft.layout === 'custom'
        ? [Number(draft.columns), Number(draft.rows)]
        : draft.layout.split('x').map(Number);
    if (!columns || !rows || columns > 12 || rows > 12) return undefined;
    input.layout = { columns, rows };
    if (draft.pages.trim()) {
      if (!positive(draft.pages)) return undefined;
      input.pages = Number(draft.pages);
    }
  }
  return input;
}

function LocationForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  submitLabel: string;
  onSubmit: (input: NewLocation) => Promise<void>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const input = toInput(draft);
  const nameError = tried && !draft.name.trim() ? m.error_name_required() : undefined;
  const gridError =
    tried &&
    draft.kind === 'binder' &&
    draft.layout === 'custom' &&
    !(
      positive(draft.columns) &&
      positive(draft.rows) &&
      Number(draft.columns) <= 12 &&
      Number(draft.rows) <= 12
    )
      ? m.error_grid()
      : undefined;
  const pagesError =
    tried && draft.kind === 'binder' && draft.pages.trim() && !positive(draft.pages)
      ? m.error_whole_number()
      : undefined;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (input) void onSubmit(input).then(() => onCancel === undefined && setDraft(emptyDraft));
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <FormRow
          label={m.location_name()}
          htmlFor={`${id}-name`}
          error={nameError}
          describedBy={`${id}-name-error`}
        >
          <Input
            id={`${id}-name`}
            value={draft.name}
            placeholder={m.location_name_placeholder()}
            onChange={(event) => set({ name: event.target.value })}
            aria-invalid={nameError ? true : undefined}
          />
        </FormRow>
        <FormRow label={m.location_kind()} htmlFor={`${id}-kind`}>
          <NativeSelect
            id={`${id}-kind`}
            value={draft.kind}
            onChange={(event) => {
              const kind = KINDS.find((k) => k === event.target.value);
              if (kind) set({ kind });
            }}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]()}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
        {draft.kind === 'binder' ? (
          <>
            <FormRow label={m.location_layout()} htmlFor={`${id}-layout`}>
              <NativeSelect
                id={`${id}-layout`}
                value={draft.layout}
                onChange={(event) => set({ layout: event.target.value })}
              >
                {BINDER_LAYOUTS.map((layout) => (
                  <option key={layoutKey(layout)} value={layoutKey(layout)}>
                    {LAYOUT_LABEL[layoutKey(layout)]?.() ?? layoutKey(layout)}
                  </option>
                ))}
                <option value="custom">{m.location_layout_custom()}</option>
              </NativeSelect>
            </FormRow>
            <FormRow
              label={m.location_pages()}
              htmlFor={`${id}-pages`}
              hint={m.location_pages_hint()}
              error={pagesError}
              describedBy={`${id}-pages-note`}
            >
              <Input
                id={`${id}-pages`}
                inputMode="numeric"
                value={draft.pages}
                onChange={(event) => set({ pages: event.target.value })}
                aria-describedby={`${id}-pages-note`}
                aria-invalid={pagesError ? true : undefined}
                className="font-mono"
              />
            </FormRow>
            {draft.layout === 'custom' ? (
              <>
                <FormRow
                  label={m.location_columns()}
                  htmlFor={`${id}-columns`}
                  error={gridError}
                  describedBy={`${id}-grid-error`}
                >
                  <Input
                    id={`${id}-columns`}
                    inputMode="numeric"
                    value={draft.columns}
                    onChange={(event) => set({ columns: event.target.value })}
                    className="font-mono"
                  />
                </FormRow>
                <FormRow label={m.location_rows()} htmlFor={`${id}-rows`}>
                  <Input
                    id={`${id}-rows`}
                    inputMode="numeric"
                    value={draft.rows}
                    onChange={(event) => set({ rows: event.target.value })}
                    className="font-mono"
                  />
                </FormRow>
              </>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button variant="outline" onClick={onCancel}>
            {m.location_cancel()}
          </Button>
        ) : null}
        <Button variant="primary" type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

async function removeLocation(location: Location): Promise<void> {
  try {
    const deleted = await deleteLocation(db, location.id);
    if (deleted) {
      toastWithUndo(m.toast_location_deleted({ name: location.name }), () =>
        restoreTagOrLocation(db, deleted),
      );
    }
  } catch (error) {
    toastError(error);
  }
}

/**
 * Einstellungen › Lagerorte (COL-09, Q5.7, UX_SPEC.md §4.13): binders with their page layout and
 * page count, boxes and other places, in your order; plus renaming and deleting tags.
 */
export function LocationsManager() {
  const locations = useLocations();
  const holdings = useHoldings();
  const tags = useTags();
  const [editing, setEditing] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const lotsAt = new Map<string, number>();
  const lotsTagged = new Map<string, number>();
  for (const h of holdings ?? []) {
    if (!isOpen(h)) continue;
    if (h.location) lotsAt.set(h.location.id, (lotsAt.get(h.location.id) ?? 0) + 1);
    for (const t of h.tags) lotsTagged.set(t, (lotsTagged.get(t) ?? 0) + 1);
  }

  const move = async (index: number, by: -1 | 1) => {
    if (!locations) return;
    const a = locations[index];
    const b = locations[index + by];
    if (!a || !b) return;
    try {
      // Normalise the order first, so equal sort values can't get stuck.
      await Promise.all(
        locations.flatMap((l, i) => (l.sort === i ? [] : [updateLocation(db, l.id, { sort: i })])),
      );
      await updateLocation(db, a.id, { sort: index + by });
      await updateLocation(db, b.id, { sort: index });
    } catch (error) {
      toastError(error);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel aria-labelledby="locations-title" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 id="locations-title" className="type-h2 m-0">
            {m.locations_title()}
          </h2>
          <p className="type-body m-0 text-ink-muted">{m.locations_intro()}</p>
        </div>
        {locations === undefined ? null : locations.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {locations.map((location, index) => (
              <li
                key={location.id}
                className="flex flex-col gap-3 border-t border-line py-3 first:border-t-0 first:pt-0"
              >
                {editing === location.id ? (
                  <LocationForm
                    initial={draftOf(location)}
                    submitLabel={m.location_save()}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (input) => {
                      try {
                        const { before } = await updateLocation(db, location.id, {
                          ...input,
                          layout: input.layout,
                          pages: input.pages,
                        });
                        setEditing(null);
                        toastWithUndo(m.toast_saved({ what: input.name }), () =>
                          restoreLocation(db, before),
                        );
                      } catch (error) {
                        toastError(error);
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="type-ui text-ink">{location.name}</span>
                      <span className="type-small text-ink-muted">
                        {[
                          describe(location),
                          m.location_lots(counted(lotsAt.get(location.id) ?? 0)),
                        ].join(' · ')}
                      </span>
                    </div>
                    <ActionMenu
                      label={m.location_actions({ name: location.name })}
                      actions={[
                        {
                          label: m.location_edit(),
                          icon: <PencilSimpleIcon size={18} />,
                          onSelect: () => setEditing(location.id),
                        },
                        {
                          label: m.location_up(),
                          icon: <ArrowUpIcon size={18} />,
                          disabled: index === 0,
                          onSelect: () => void move(index, -1),
                        },
                        {
                          label: m.location_down(),
                          icon: <ArrowDownIcon size={18} />,
                          disabled: index === locations.length - 1,
                          onSelect: () => void move(index, 1),
                        },
                        {
                          label: m.location_delete(),
                          icon: <TrashIcon size={18} />,
                          danger: true,
                          onSelect: () => void removeLocation(location),
                        },
                      ]}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body m-0 text-ink-muted">{m.locations_empty()}</p>
        )}
        <div className="flex flex-col gap-3 rounded-[18px] bg-hover p-4">
          <h3 className="type-h3 m-0">{m.locations_new()}</h3>
          <LocationForm
            initial={emptyDraft}
            submitLabel={m.location_add()}
            onSubmit={async (input) => {
              try {
                await createLocation(db, input);
              } catch (error) {
                toastError(error);
              }
            }}
          />
        </div>
      </Panel>

      <Panel aria-labelledby="tags-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 id="tags-title" className="type-h2 m-0">
            {m.tags_title()}
          </h2>
          <p className="type-body m-0 text-ink-muted">{m.tags_intro()}</p>
        </div>
        {tags === undefined ? null : tags.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0"
              >
                {renaming?.id === tag.id ? (
                  <form
                    noValidate
                    className="flex flex-1 gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!renaming.name.trim()) return;
                      renameTag(db, tag.id, renaming.name).then(
                        () => setRenaming(null),
                        toastError,
                      );
                    }}
                  >
                    <label htmlFor={`tag-${tag.id}`} className="sr-only">
                      {m.tag_rename()}
                    </label>
                    <Input
                      id={`tag-${tag.id}`}
                      value={renaming.name}
                      onChange={(event) => setRenaming({ id: tag.id, name: event.target.value })}
                    />
                    <Button variant="outline" onClick={() => setRenaming(null)}>
                      {m.location_cancel()}
                    </Button>
                    <Button variant="primary" type="submit">
                      {m.location_save()}
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="type-label rounded-pill bg-accent-soft px-2.5 py-1 text-accent-text">
                      {tag.name}
                    </span>
                    <span className="type-small flex-1 text-ink-muted">
                      {m.location_lots(counted(lotsTagged.get(tag.id) ?? 0))}
                    </span>
                    <ActionMenu
                      label={m.tag_actions({ name: tag.name })}
                      actions={[
                        {
                          label: m.tag_rename(),
                          icon: <PencilSimpleIcon size={18} />,
                          onSelect: () => setRenaming({ id: tag.id, name: tag.name }),
                        },
                        {
                          label: m.location_delete(),
                          icon: <TrashIcon size={18} />,
                          danger: true,
                          onSelect: () => {
                            deleteTag(db, tag.id).then(
                              (deleted) =>
                                deleted &&
                                toastWithUndo(m.toast_tag_deleted({ name: tag.name }), () =>
                                  restoreTagOrLocation(db, deleted),
                                ),
                              toastError,
                            );
                          },
                        },
                      ]}
                    />
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body m-0 text-ink-muted">{m.tags_empty()}</p>
        )}
      </Panel>
    </div>
  );
}
