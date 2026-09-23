import { CheckCircleIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { m } from '@/i18n';
import { promptInstall, useInstall } from '@/features/pwa';

/** "Als App installieren" (APP-04, DAT-05): one click in Brave, instructions everywhere else. */
export function InstallSection() {
  const { promptEvent, installed } = useInstall();

  if (installed) {
    return (
      <p className="type-body m-0 flex items-center gap-2 text-ink">
        <CheckCircleIcon size={22} weight="fill" className="shrink-0 text-gain" aria-hidden />
        {m.settings_data_install_done()}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="type-body m-0 text-ink-muted">{m.settings_data_install_body()}</p>
      {promptEvent ? (
        <Button variant="primary" className="w-fit" onClick={() => void promptInstall()}>
          <DownloadSimpleIcon size={18} weight="bold" aria-hidden />
          {m.settings_data_install_action()}
        </Button>
      ) : (
        <p className="type-small m-0 text-ink-muted">{m.settings_data_install_manual()}</p>
      )}
    </div>
  );
}
