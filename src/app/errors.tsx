import { Link, type ErrorComponentProps } from '@tanstack/react-router';
import { useEffect } from 'react';
import { manifestQuery } from '@/catalog';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { toastManager } from '@/components/ui/Toasts';
import { m } from '@/i18n';
import { copyErrorReport, logError } from '@/lib/error-log';
import { queryClient } from './queryClient';

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

/** "Fehlerbericht kopieren": the diagnostic report (no collection data) on the clipboard. */
export async function copyReport(): Promise<void> {
  const catalog = queryClient.getQueryData(manifestQuery.queryKey);
  const copied = await copyErrorReport({
    app: import.meta.env.VITE_APP_VERSION,
    catalog: catalog?.catalogVersion,
  });
  toastManager.add(
    copied
      ? { title: m.report_copied(), description: m.report_copied_body() }
      : { title: m.report_copy_failed(), description: m.report_copy_failed_body() },
  );
}

/**
 * Route-level error boundary (UX_SPEC.md §6). There's no telemetry (privacy): the error goes to the
 * console and the local error log, and "Fehlerbericht kopieren" hands it to the user.
 */
export function ErrorPage({ error }: ErrorComponentProps) {
  useEffect(() => {
    console.error(error);
    logError(error, 'boundary');
  }, [error]);
  return (
    <Panel className="flex max-w-2xl flex-col gap-4" aria-labelledby="error-title">
      <h2 id="error-title" className="type-h2 m-0">
        {m.error_generic_title()}
      </h2>
      <p className="type-body m-0 text-ink-muted">{m.error_generic_body()}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => window.location.reload()}>
          {m.error_generic_action()}
        </Button>
        <Button onClick={() => void copyReport()}>{m.report_copy()}</Button>
      </div>
    </Panel>
  );
}
