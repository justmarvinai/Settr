import { createFileRoute, redirect } from '@tanstack/react-router';

/** Sammlung opens on Karten. */
export const Route = createFileRoute('/collection/')({
  beforeLoad: () => {
    throw redirect({ to: '/collection/cards', replace: true });
  },
});
