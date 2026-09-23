import { Dialog } from '@/components/ui/Dialog';
import { m } from '@/i18n';

/** Search / command palette (APP-05). M1 placeholder; the catalog search arrives in M2. */
export default function SearchDialog({
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
      title={m.search_title()}
      description={m.search_coming()}
    />
  );
}
