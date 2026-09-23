import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Where an element starts in the document and how wide it is, kept current as the page above it or
 * the window changes. Window virtualizers need the top as their scroll margin (TanStack Virtual).
 */
export function useElementBox(ref: RefObject<HTMLElement | null>): { top: number; width: number } {
  const [box, setBox] = useState(() => ({ top: 0, width: 0 }));
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const top = Math.round(rect.top + window.scrollY);
      const width = Math.round(rect.width);
      setBox((prev) => (prev.top === top && prev.width === width ? prev : { top, width }));
    };
    // Content above the element changing height resizes the body; the window resizing does too.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return box;
}
