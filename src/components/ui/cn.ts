import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          type: [
            'display-xl',
            'display',
            'display-m',
            'h1',
            'h2',
            'h3',
            'body',
            'ui',
            'small',
            'label',
          ],
        },
      ],
    },
  },
});

/** Joins class names and resolves Tailwind conflicts (later wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
