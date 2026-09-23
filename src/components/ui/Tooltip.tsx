import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import type { ReactElement } from 'react';

/** Tooltip for icon-only controls (the control keeps its own aria-label). */
export function Tooltip({ content, children }: { content: string; children: ReactElement }) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={8}>
          <BaseTooltip.Popup className="ui-tooltip">{content}</BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export const TooltipProvider = BaseTooltip.Provider;
