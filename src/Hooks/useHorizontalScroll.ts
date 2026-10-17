import React, { useRef, useCallback } from 'react';

export function useHorizontalScrollProps() {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    startX.current = e.pageX - e.currentTarget.offsetLeft;
    scrollLeft.current = e.currentTarget.scrollLeft;
  }, []);

  const onMouseLeave = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - e.currentTarget.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    e.currentTarget.scrollLeft = scrollLeft.current - walk;
  }, []);

  return () => ({
    onMouseDown,
    onMouseLeave,
    onMouseUp,
    onMouseMove,
  });
}
