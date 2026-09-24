import {
  CopySimpleIcon,
  CurrencyEurIcon,
  PackageIcon,
  PencilSimpleIcon,
  ScalesIcon,
  ShoppingBagIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import type { MenuAction } from '@/components/ui/Menu';
import { db, deleteHolding, duplicateHolding, restoreHolding } from '@/db';
import { remaining, type Holding } from '@/domain/schemas';
import { m } from '@/i18n';
import { openDispose, openEdit, openLotPrice, openOpening, openValue } from './actions';
import { toastError, toastWithUndo } from './toasts';

/**
 * The ⋯ menu of a lot (UX_SPEC.md §4.4): Bearbeiten, Duplizieren, Preis eintragen…, Eigener
 * Wert…, Verkaufen…, Öffnen… (sealed) and Löschen, every change undoable. `label` names the lot
 * in toasts.
 */
export function lotMenuActions(holding: Holding, label: string): MenuAction[] {
  const actions: MenuAction[] = [
    {
      label: m.action_edit(),
      icon: <PencilSimpleIcon size={18} />,
      onSelect: () => openEdit(holding.id),
    },
    {
      label: m.action_duplicate(),
      icon: <CopySimpleIcon size={18} />,
      onSelect: () => {
        duplicateHolding(db, holding.id).then(
          (copy) =>
            toastWithUndo(m.toast_duplicated({ what: label }), () => deleteHolding(db, copy.id)),
          toastError,
        );
      },
    },
  ];
  if (remaining(holding) > 0) {
    actions.push({
      label: m.action_price(),
      icon: <CurrencyEurIcon size={18} />,
      onSelect: () => openLotPrice(holding),
    });
    actions.push({
      label: m.action_value(),
      icon: <ScalesIcon size={18} />,
      onSelect: () => openValue(holding.id),
    });
    actions.push({
      label: m.action_dispose(),
      icon: <ShoppingBagIcon size={18} />,
      onSelect: () => openDispose(holding.id),
    });
    if (holding.item.kind === 'sealed') {
      actions.push({
        label: m.action_open(),
        icon: <PackageIcon size={18} />,
        onSelect: () => openOpening(holding.id),
      });
    }
  }
  actions.push({
    label: m.action_delete(),
    icon: <TrashIcon size={18} />,
    danger: true,
    onSelect: () => {
      deleteHolding(db, holding.id).then(
        (deleted) =>
          deleted &&
          toastWithUndo(m.toast_deleted({ what: label }), () => restoreHolding(db, deleted)),
        toastError,
      );
    },
  });
  return actions;
}
