import { Link, type ErrorComponentProps } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { m } from '@/i18n';

export function NotFoundPage() {
  return (
    <Panel className="flex max-w-2xl flex-col gap-4">
      <h2 className="type-h2 m-0">{m.error_not_found_title()}</h2>
      <p className="type-body m-0 text-ink-muted">{m.error_not_found_body()}</p>
      <Link to="/" className={buttonVariants({ variant: 'primary', className: 'w-fit' })}>
        {m.error_not_found_action()}
      </Link>
    </Panel>
  );
}

/** Route-level error boundary. There's no telemetry (privacy), so the error only goes to the console. */
export function ErrorPage({ error }: ErrorComponentProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Panel className="flex max-w-2xl flex-col gap-4" aria-labelledby="error-title">
      <h2 id="error-title" className="type-h2 m-0">
        {m.error_generic_title()}
      </h2>
      <p className="type-body m-0 text-ink-muted">{m.error_generic_body()}</p>
      <Button variant="primary" className="w-fit" onClick={() => window.location.reload()}>
        {m.error_generic_action()}
      </Button>
    </Panel>
  );
}
