import { Fragment } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Kbd } from '@/components/ui/Kbd';
import { m } from '@/i18n';
import { isApple } from '@/lib/platform';

/** One row: its keys (alternatives, each one key or several shown together) and what it does. */
interface Shortcut {
  keys: string[][];
  /** The keys are pressed one after the other: "G dann O". */
  sequence?: boolean;
  label: () => string;
}

const search = () => (isApple ? m.toolbar_shortcut_mac() : m.toolbar_shortcut_windows());

const GROUPS: { title: () => string; items: Shortcut[] }[] = [
  {
    title: m.shortcuts_group_everywhere,
    items: [
      { keys: [[search()], ['/']], label: m.shortcuts_search },
      { keys: [['N']], label: m.shortcuts_add },
      { keys: [['H']], label: m.shortcuts_privacy },
      { keys: [['?']], label: m.shortcuts_help },
    ],
  },
  {
    title: m.shortcuts_group_go,
    items: [
      { keys: [['G', 'O']], sequence: true, label: m.nav_overview },
      { keys: [['G', 'S']], sequence: true, label: m.nav_collection },
      { keys: [['G', 'K']], sequence: true, label: m.nav_catalog },
      { keys: [['G', 'P']], sequence: true, label: m.nav_prices },
      { keys: [['G', 'F']], sequence: true, label: m.nav_portfolio },
      { keys: [['G', 'E']], sequence: true, label: m.nav_settings },
    ],
  },
  {
    title: m.shortcuts_group_grids,
    items: [
      { keys: [['←', '↑', '→', '↓']], label: m.shortcuts_move },
      { keys: [[m.shortcuts_key_enter()]], label: m.shortcuts_open },
      { keys: [['+']], label: m.shortcuts_quick_add },
      { keys: [['N']], label: m.shortcuts_add_details },
      { keys: [['P']], label: m.shortcuts_price },
      { keys: [[m.shortcuts_key_space()]], label: m.shortcuts_select },
      { keys: [['Q']], label: m.shortcuts_quick_entry },
      { keys: [['V', 'G']], sequence: true, label: m.shortcuts_view_grid },
      { keys: [['V', 'T']], sequence: true, label: m.shortcuts_view_table },
    ],
  },
  {
    title: m.shortcuts_group_card,
    items: [
      { keys: [['←'], ['→']], label: m.shortcuts_prev_next },
      { keys: [['P']], label: m.shortcuts_price_field },
      { keys: [['V']], label: m.shortcuts_guide },
    ],
  },
  {
    title: m.shortcuts_group_session,
    items: [
      { keys: [['C']], label: m.shortcuts_session_cardmarket },
      { keys: [[m.shortcuts_key_enter()]], label: m.shortcuts_session_save },
      { keys: [['U']], label: m.shortcuts_session_unchanged },
      { keys: [['S']], label: m.shortcuts_session_skip },
      { keys: [['←']], label: m.shortcuts_session_back },
      { keys: [[m.shortcuts_key_escape()]], label: m.shortcuts_session_pause },
    ],
  },
];

/** The keys of one row: alternatives joined by "oder", the keys of a sequence by "dann". */
function Keys({ keys, sequence = false }: { keys: string[][]; sequence?: boolean }) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      {keys.map((combo, index) => (
        <Fragment key={combo.join(' ')}>
          {index > 0 ? (
            <span className="type-small text-ink-subtle">{m.shortcuts_or()}</span>
          ) : null}
          {combo.map((key, position) => (
            <Fragment key={key}>
              {position > 0 && sequence ? (
                <span className="type-small text-ink-subtle">{m.shortcuts_then()}</span>
              ) : null}
              <Kbd>{key}</Kbd>
            </Fragment>
          ))}
        </Fragment>
      ))}
    </span>
  );
}

/**
 * The shortcut cheat sheet (`?`, UX_SPEC.md §7). Every shortcut is quiet while you type in a field,
 * and everything also works without a keyboard.
 */
export default function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.shortcuts_title()}
      description={m.shortcuts_description()}
      className="w-[min(100%-24px,760px)]"
    >
      <div className="mt-5 grid max-h-[65vh] gap-x-10 gap-y-6 overflow-y-auto md:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group.title()} className="flex flex-col gap-2">
            <h3 className="type-label m-0 text-ink-muted uppercase">{group.title()}</h3>
            <dl className="m-0 flex flex-col">
              {group.items.map((item) => (
                <div
                  key={`${item.keys.flat().join(' ')} ${item.label()}`}
                  className="flex items-center justify-between gap-4 border-b border-line py-2 last:border-0"
                >
                  <dt className="type-small text-ink">{item.label()}</dt>
                  <dd className="m-0 shrink-0">
                    <Keys keys={item.keys} sequence={item.sequence ?? false} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
