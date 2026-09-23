import { CheckCircleIcon, WarningIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { m } from '@/i18n';
import { formatBytes } from '@/i18n/format';
import { getStorageStatus, requestPersistence, type StorageStatus } from './storage';

export function StorageSection() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let active = true;
    void getStorageStatus().then((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const persist = async () => {
    const granted = await requestPersistence();
    setDenied(!granted);
    setStatus(await getStorageStatus());
  };

  if (!status) return null;
  if (!status.supported)
    return <p className="type-body m-0 text-ink-muted">{m.settings_data_unsupported()}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        {status.persisted ? (
          <CheckCircleIcon size={24} weight="fill" className="shrink-0 text-gain" aria-hidden />
        ) : (
          <WarningIcon size={24} weight="fill" className="shrink-0 text-warn" aria-hidden />
        )}
        <div className="flex flex-col gap-1">
          <span className="type-ui" data-testid="storage-status">
            {status.persisted ? m.settings_data_persisted() : m.settings_data_not_persisted()}
          </span>
          <span className="type-small text-ink-muted">
            {status.persisted
              ? m.settings_data_persisted_hint()
              : m.settings_data_not_persisted_hint()}
          </span>
          {status.usage !== null ? (
            <span className="type-small text-ink-subtle">
              {m.settings_data_usage({ used: formatBytes(status.usage) })}
            </span>
          ) : null}
        </div>
      </div>
      {!status.persisted ? (
        <div className="flex flex-col gap-2">
          <Button variant="primary" className="w-fit" onClick={() => void persist()}>
            {m.settings_data_persist_action()}
          </Button>
          {/* <output> is a polite live region: the result is announced without moving focus. */}
          <output className="type-small block text-ink-muted">
            {denied ? m.settings_data_persist_denied() : null}
          </output>
        </div>
      ) : null}
    </div>
  );
}
