import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The design system replaces Tailwind's font sizes (tailwind.config.ts). Without these names,
// twMerge reads `text-body` as a text colour and drops it when a colour such as `text-foreground` follows.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'body', 'emphasis', 'section', 'title', 'metric', 'display'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
