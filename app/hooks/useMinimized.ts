'use client';
import { useCallback, useEffect, useState } from 'react';

/**
 * Whether a draggable card is rolled up to its title bar
 *
 * Keyed the same way DragWrapper keys a position, so everything about where a
 * card sits and how big it is survives a reload together
 */
const useMinimized = (id: string) => {
  const [min, setMin] = useState(false);
  const [read, setRead] = useState(false);

  useEffect(() => {
    setMin(localStorage.getItem(`min-${id}`) === '1');
    setRead(true);
  }, [id]);

  // guarded, or the first pass would write the default over a saved true
  useEffect(() => {
    if (read) localStorage.setItem(`min-${id}`, min ? '1' : '0');
  }, [id, min, read]);

  return [min, useCallback(() => setMin(m => !m), [])] as const;
};

export default useMinimized;
