import { DeviceMobileIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { IconButton } from '@/components/ui/Button';
import { m } from '@/i18n';
import { isIOS, useInstall } from './install';

const KEY = 'settr:ios-hint';
const QUIET_DAYS = 14;

function dismissedRecently(): boolean {
  try {
    const at = localStorage.getItem(KEY);
    return at !== null && Date.now() - Date.parse(at) < QUIET_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * On an iPhone in a Safari tab (ARCHITECTURE.md §8.2): Safari deletes a site's data after 7 days
 * without a visit, while the home-screen app keeps it. A calm note on Übersicht; closing it hides
 * it for 14 days.
 */
export function IosInstallHint() {
  const { installed } = useInstall();
  const [hidden, setHidden] = useState(dismissedRecently);
  if (installed || hidden || !isIOS()) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      // Without storage it only stays hidden for this visit.
    }
    setHidden(true);
  };
  return (
    <section aria-labelledby="ios-hint-title" className="tile flex items-start gap-3 p-4">
      <DeviceMobileIcon size={24} className="mt-2.5 shrink-0 text-accent-text" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-2.5">
        <h2 id="ios-hint-title" className="type-ui m-0 text-ink">
          {m.ios_hint_title()}
        </h2>
        <p className="type-small m-0 text-ink-muted">{m.install_ios()}</p>
      </div>
      <IconButton label={m.ios_hint_dismiss()} onClick={dismiss}>
        <XIcon size={18} weight="bold" aria-hidden />
      </IconButton>
    </section>
  );
}
