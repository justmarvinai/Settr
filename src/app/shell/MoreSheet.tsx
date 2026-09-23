import { CaretRightIcon, ChartLineUpIcon, GearSixIcon, type Icon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { Sheet } from '@/components/ui/Sheet';
import { m } from '@/i18n';
import { BackupPill } from './BackupPill';

const itemClass =
  'flex h-14 items-center gap-3 rounded-[16px] px-3 type-ui text-ink hover:bg-hover data-[status=active]:bg-accent-soft data-[status=active]:text-accent-text';

function MoreLink({
  to,
  icon: ItemIcon,
  label,
  onNavigate,
}: {
  to: '/portfolio' | '/settings';
  icon: Icon;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link to={to} onClick={onNavigate} className={itemClass}>
      <ItemIcon size={22} aria-hidden className="shrink-0" />
      <span className="flex-1">{label}</span>
      <CaretRightIcon size={18} aria-hidden className="text-ink-subtle" />
    </Link>
  );
}

/** Phone "Mehr" (UX_SPEC.md §3.3): the areas without a tab, plus the backup status. */
export default function MoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const close = () => onOpenChange(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={m.nav_more()} side="bottom">
      <nav aria-label={m.nav_more()} className="mt-4 flex flex-col gap-1">
        <MoreLink
          to="/portfolio"
          icon={ChartLineUpIcon}
          label={m.nav_portfolio()}
          onNavigate={close}
        />
        <MoreLink to="/settings" icon={GearSixIcon} label={m.nav_settings()} onNavigate={close} />
      </nav>
      <div className="mt-3 border-t border-line pt-3">
        <BackupPill expanded onNavigate={close} />
      </div>
    </Sheet>
  );
}
