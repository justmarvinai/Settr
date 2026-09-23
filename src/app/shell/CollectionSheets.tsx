import { Suspense } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { m } from '@/i18n';
import { useSheets, type SheetRequest } from '@/lib/sheets';
import { useMediaQuery } from '@/lib/useMediaQuery';
import {
  AddHoldingBody,
  CustomItemBody,
  DisposeBody,
  EditHoldingBody,
  OpenBody,
  QuickAddBody,
  SheetLoading,
  ValueBody,
} from '@/features/entry';

function titleOf(request: SheetRequest): string {
  if (request.type === 'add') {
    return request.item.kind === 'card' ? m.holding_add_card() : m.holding_add_sealed();
  }
  if (request.type === 'edit') return m.holding_edit_title();
  if (request.type === 'dispose') return m.dispose_title();
  if (request.type === 'open') return m.open_title();
  if (request.type === 'value') return m.value_title();
  if (request.type === 'quick') return m.quick_title();
  return m.custom_title();
}

function Body({ request }: { request: SheetRequest }) {
  if (request.type === 'add') {
    return <AddHoldingBody item={request.item} setId={request.setId} language={request.language} />;
  }
  if (request.type === 'edit') return <EditHoldingBody holdingId={request.holdingId} />;
  if (request.type === 'dispose') return <DisposeBody holdingId={request.holdingId} />;
  if (request.type === 'open') return <OpenBody holdingId={request.holdingId} />;
  if (request.type === 'value') return <ValueBody holdingId={request.holdingId} />;
  if (request.type === 'quick')
    return <QuickAddBody setId={request.setId} language={request.language} />;
  return <CustomItemBody kind={request.kind} name={request.name} />;
}

/**
 * The collection's sheets (UX_SPEC.md §4.7, §4.8), rendered by the app shell on first use. A side
 * sheet on desktop and a bottom sheet on phones; each request starts with a fresh form.
 */
export default function CollectionSheets() {
  const { request, open, seq, hide } = useSheets();
  const desktop = useMediaQuery('(min-width: 768px)');
  if (!request) return null;
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) hide();
      }}
      title={titleOf(request)}
      side={desktop ? 'right' : 'bottom'}
      flush={request.type === 'add' || request.type === 'edit'}
      initialFocus={() => document.querySelector<HTMLElement>('[data-initial-focus]') ?? true}
    >
      <Suspense fallback={<SheetLoading />}>
        <Body key={seq} request={request} />
      </Suspense>
    </Sheet>
  );
}
