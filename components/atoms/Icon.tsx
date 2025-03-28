'use client';
import React, { useState } from 'react';

export const Icon = ({
  defaultImg,
  activeImg,
  disabledImg,
  onClick,
  imgStyle,
  className,
}: any) => {
  const [isActive, setIsActive] = useState(false);
  return (
    <button
      className={className}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onMouseLeave={() => setIsActive(false)}
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'contents',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={disabledImg || (isActive ? activeImg : defaultImg)}
        alt='Arrow button'
        style={imgStyle}
        draggable='false'
      />
    </button>
  );
};
