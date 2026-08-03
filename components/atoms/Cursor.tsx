'use client';

import React, { useState, useEffect } from 'react';

const Cursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cursorImage, setCursorImage] = useState('/cursor/point/point.png');

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handlePointerDown = () => {
      setCursorImage('/cursor/point/point_low.png');
    };

    const handlePointerUp = () => {
      setCursorImage('/cursor/point/point.png');
    };

    // pointer events, not mouse events
    //
    // stage has to call preventDefault() on pointerdown, otherwise the browser starts its own image-drag
    // Side effect: this kills compatibility mouse events for the whole gesture
    // mousemove goes silent while dragging, cursor freezes at press position
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    // Or a gesture taken over elsewhere leaves the pressed sprite showing
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cursorImage}
      alt='cursor'
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  );
};

export default Cursor;
