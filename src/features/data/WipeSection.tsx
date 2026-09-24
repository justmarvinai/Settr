import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormRow } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { db, snapshotDb, wipeAll } from '@/db';
import { m } from '@/i18n';
import { exportBackup, toastFailure } from './export';

/** Settr's own keys in localStorage (pre-paint display, privacy mode, tile density). */
function forgetDevicePrefs(): void {
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('settr')) localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable; the database is what matters.
  }
}

function WipeForm({ onCancel }: { onCancel: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const confirmed = typed.trim().toLocaleUpperCase('de') === m.wipe_confirm_word();

  const wipe = async () => {
    setBusy(true);
    try {
      await wipeAll(db, snapshotDb);
      forgetDevicePrefs();
      // A fresh start: every screen, cache and in-memory state begins from nothing.
      window.location.replace('/');
    } catch (error) {
      setBusy(false);
      toastFailure(error);
    }
  };

  return (
    <form
      noValidate
      className="mt-5 flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (confirmed) void wipe();
      }}
    >
      <Button variant="outline" className="w-fit" onClick={() => void exportBackup(queryClient)}>
        {m.settings_data_backup_action()}
      </Button>
      <FormRow label={m.wipe_confirm_label()} htmlFor={`${id}-confirm`}>
        <Input
          id={`${id}-confirm`}
          value={typed}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="characters"
          onChange={(event) => setTyped(event.target.value)}
        />
      </FormRow>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {m.bulk_cancel()}
        </Button>
        <Button variant="quiet" type="submit" disabled={!confirmed || busy} className="text-loss">
          {m.wipe_submit()}
        </Button>
      </div>
    </form>
  );
}

/** Alle Daten löschen (DAT-09): behind a typed confirmation, with a backup one click away. */
export function WipeSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <p className="type-body m-0 text-ink-muted">{m.settings_data_wipe_body()}</p>
      <Button variant="quiet" className="w-fit text-loss" onClick={() => setOpen(true)}>
        {m.settings_data_wipe_action()}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={m.wipe_title()} description={m.wipe_body()}>
        {open ? <WipeForm onCancel={() => setOpen(false)} /> : null}
      </Dialog>
    </div>
  );
}
