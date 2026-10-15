import { useEffect, RefObject } from 'react';

// 💡 Añadimos <T extends HTMLElement> para que se adapte a HTMLDivElement, HTMLUListElement, etc.
export function useHorizontalWheel<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled: boolean = true
) {
  useEffect(() => {
    const container = ref.current;
    if (!container || !enabled) return;

    const handleWheel = (e: WheelEvent) => {
      if (container.scrollWidth <= container.clientWidth) return;

      e.preventDefault();
      container.scrollLeft += e.deltaY;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [ref, enabled]);
}