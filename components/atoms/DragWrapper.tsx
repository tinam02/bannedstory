'use client';
import React, { useEffect, useRef, useState } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';

const DragWrapper = ({ children, id }: Props) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  // Load position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem(`drag-${id}`);
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    } else {
      setPosition({ x: 0, y: 0 }); // Default position after first load
    }
  }, [id]);

  // Save position on drag stop
  const handleStop = (_: DraggableEvent, data: DraggableData) => {
    const newPosition = { x: data.x, y: data.y };
    setPosition(newPosition);
    localStorage.setItem(`drag-${id}`, JSON.stringify(newPosition));
  };

  // Prevent rendering Draggable until position is loaded
  if (position === null) return null;

  return (
    <Draggable nodeRef={nodeRef} handle=".dragHandle" position={position} onStop={handleStop}>
      {React.cloneElement(children, { ref: nodeRef })}
    </Draggable>
  );
};

type Props = { children: React.ReactElement; id: string };

export default DragWrapper;
