import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AppShell } from '@/app/shell/AppShell';

export const Route = createRootRoute({ component: RootLayout });

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
