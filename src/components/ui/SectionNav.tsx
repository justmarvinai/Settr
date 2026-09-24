import { Link, useRouterState, type LinkProps } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { cn } from './cn';

export interface SectionNavItem {
  to: NonNullable<LinkProps['to']>;
  label: string;
  exact?: boolean;
}

/**
 * Navigation between sibling pages (e.g. Sammlung › Karten | Sealed), drawn as pills with the ink
 * pill for the active page (direction D). `vertical` stacks the pills on desktop. On phones the
 * pills scroll sideways, and the active one scrolls into view (e.g. *Über & Rechtliches*, last).
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
  const navRef = useRef<HTMLElement>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    const nav = navRef.current;
    const active =
      nav?.querySelector<HTMLElement>(`a[href="${CSS.escape(pathname)}"]`) ??
      nav?.querySelector<HTMLElement>('[data-status=active]');
    if (!nav || !active) return;
    const bounds = nav.getBoundingClientRect();
    const pill = active.getBoundingClientRect();
    if (pill.left >= bounds.left && pill.right <= bounds.right) return;
    // Centered, without moving the page (scrollIntoView could scroll it too)
    nav.scrollLeft += pill.left + pill.width / 2 - (bounds.left + bounds.width / 2);
  }, [pathname]);

  return (
    <nav
      ref={navRef}
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
