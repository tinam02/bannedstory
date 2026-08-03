'use client';

import React, { useState, useEffect } from 'react';

const Cursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cursorImage, setCursorImage] = useState('/cursor/point/point.png');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => {
      setCursorImage('/cursor/point/point_low.png');
    };

    const handleMouseUp = () => {
      setCursorImage('/cursor/point/point.png');
    };

    
    // Attach event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
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
