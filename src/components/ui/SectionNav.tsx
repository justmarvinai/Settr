import { Link, type LinkProps } from '@tanstack/react-router';
import { cn } from './cn';

export interface SectionNavItem {
  to: NonNullable<LinkProps['to']>;
  label: string;
  exact?: boolean;
}

/**
 * Navigation between sibling pages (e.g. Sammlung › Karten | Sealed), drawn as pills with the ink
 * pill for the active page (direction D). `vertical` stacks the pills on desktop.
 */
export function SectionNav({
  label,
  items,
  vertical = false,
}: {
  label: string;
  items: readonly SectionNavItem[];
  vertical?: boolean;
}) {
  return (
    <nav
      aria-label={label}
      className={cn('-mx-3 overflow-x-auto px-3', vertical && 'lg:mx-0 lg:px-0')}
    >
      <ul className={cn('m-0 flex list-none gap-1.5 p-0', vertical && 'lg:flex-col')}>
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className={cn(
                'flex h-11 items-center rounded-pill px-4 type-ui whitespace-nowrap text-ink-muted transition-colors duration-(--dur-fast) hover:bg-hover hover:text-ink data-[status=active]:bg-ink data-[status=active]:text-canvas',
                vertical && 'lg:rounded-[14px]',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
