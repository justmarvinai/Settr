import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useEffect } from 'react';
import { CatalogLoadError } from '@/catalog';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { m } from '@/i18n';

/** A catalog file didn't load (offline without cache, or a broken deploy): say so and retry. */
export function CatalogErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = error instanceof CatalogLoadError && error.status === undefined;
  return (
    <Panel className="flex max-w-2xl flex-col gap-4" aria-labelledby="catalog-error-title">
      <h2 id="catalog-error-title" className="type-h2 m-0">
        {m.catalog_error_title()}
      </h2>
      <p className="type-body m-0 text-ink-muted">
        {offline ? m.catalog_error_offline() : m.catalog_error_body()}
      </p>
      <Button
        variant="primary"
        className="w-fit"
        onClick={() => {
          reset();
          void router.invalidate();
        }}
      >
        {m.catalog_error_action()}
      </Button>
    </Panel>
  );
}
