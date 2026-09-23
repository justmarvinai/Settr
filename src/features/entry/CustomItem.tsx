import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { FormRow, Textarea } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { createCustomItem, db, useSettings, type NewCustomItem } from '@/db';
import { PRODUCT_TYPES } from '@/domain/catalog';
import { ACTIVE_CARD_LANGUAGES, type ActiveCardLanguage } from '@/domain/catalog-types';
import { CUSTOM_PREFIX, toastError } from '@/features/collection';
import { languageLabel, m, productTypeLabel } from '@/i18n';
import { openSheet } from '@/lib/sheets';

/**
 * A card or product the catalog lacks (CAT-08): promos, misprints, rare Chinese products. Once
 * created it opens its add sheet, and it shows up in the ＋ search from then on.
 */
export function CustomItemBody({
  kind: initialKind,
  name: initialName,
}: {
  kind: 'card' | 'sealed';
  name?: string | undefined;
}) {
  const id = useId();
  const settings = useSettings();
  const [kind, setKind] = useState(initialKind);
  const [name, setName] = useState(initialName ?? '');
  const [languages, setLanguages] = useState<ActiveCardLanguage[]>(() => {
    const preferred = ACTIVE_CARD_LANGUAGES.find((l) => l === settings.defaultCardLanguage);
    return [preferred ?? 'de'];
  });
  const [setTitle, setSetTitle] = useState('');
  const [number, setNumber] = useState('');
  const [productType, setProductType] = useState<string>('other');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const nameError = name.trim() ? undefined : m.error_name_required();

  const save = async () => {
    setTried(true);
    if (nameError || !languages.length) return;
    const primary = languages[0] ?? 'de';
    const input: NewCustomItem = {
      kind,
      name: { [primary]: name.trim() },
      languages,
    };
    if (setTitle.trim()) input.setName = setTitle.trim();
    if (kind === 'card' && number.trim()) input.localId = number.trim();
    if (kind === 'sealed') input.productType = productType;
    if (note.trim()) input.note = note.trim();
    try {
      const item = await createCustomItem(db, input);
      openSheet({
        type: 'add',
        item: { kind, id: `${CUSTOM_PREFIX}${item.id}` },
        language: primary,
      });
    } catch (error) {
      toastError(error);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="mt-2 flex flex-col gap-5 pb-2"
    >
      <p className="type-body m-0 text-ink-muted">{m.custom_intro()}</p>
      <FormRow label={m.custom_kind()}>
        <SegmentedControl<'card' | 'sealed'>
          label={m.custom_kind()}
          value={kind}
          onValueChange={setKind}
          options={[
            { value: 'card', label: m.custom_kind_card() },
            { value: 'sealed', label: m.custom_kind_sealed() },
          ]}
        />
      </FormRow>
      <FormRow
        label={m.custom_name()}
        htmlFor={`${id}-name`}
        error={tried ? nameError : undefined}
        describedBy={`${id}-name-error`}
      >
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={tried && nameError ? true : undefined}
          data-initial-focus=""
        />
      </FormRow>
      <FormRow label={m.custom_languages()}>
        <ChipGroup<ActiveCardLanguage>
          label={m.custom_languages()}
          value={languages}
          onValueChange={(next) => {
            if (next.length) setLanguages(next);
          }}
          options={ACTIVE_CARD_LANGUAGES.map((l) => ({ value: l, label: languageLabel(l) }))}
        />
      </FormRow>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <FormRow label={m.custom_set()} htmlFor={`${id}-set`}>
          <Input
            id={`${id}-set`}
            value={setTitle}
            placeholder={m.custom_set_placeholder()}
            onChange={(event) => setSetTitle(event.target.value)}
          />
        </FormRow>
        {kind === 'card' ? (
          <FormRow label={m.custom_number()} htmlFor={`${id}-number`}>
            <Input
              id={`${id}-number`}
              value={number}
              className="font-mono"
              onChange={(event) => setNumber(event.target.value)}
            />
          </FormRow>
        ) : (
          <FormRow label={m.custom_type()} htmlFor={`${id}-type`}>
            <NativeSelect
              id={`${id}-type`}
              value={productType}
              onChange={(event) => setProductType(event.target.value)}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {productTypeLabel(t)}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
        )}
      </div>
      <FormRow label={m.holding_note()} htmlFor={`${id}-note`}>
        <Textarea
          id={`${id}-note`}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </FormRow>
      <div className="flex justify-end">
        <Button variant="primary" size="lg" type="submit">
          {m.custom_submit()}
        </Button>
      </div>
    </form>
  );
}
