'use client';
import { useEffect, useState } from 'react';
import { characterRenderUrl } from '@/lib/fetch';
import { DEFAULT_CHAR_BODY, loadSavedBody } from '@/lib/utils';
import { IChar } from '@/types';
import DefaultImage from './Image';
import useChar from '@/app/context/CharCtx';
import { style } from 'typestyle';

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

const Char = () => {
  const { equippedItems, equippedBodyItems } = useChar();
  const [body, setBody] = useState<IChar>(DEFAULT_CHAR_BODY);
  const [hydrated, setHydrated] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setBody(loadSavedBody());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setBody(prev => {
      const next: IChar = {
        ...prev,
        itemIds: equippedItems?.map((i: any) => i.itemId) ?? [],
        faceId:
          equippedBodyItems?.find((i: any) => i.faceId)?.faceId ?? prev.faceId,
        hairId:
          equippedBodyItems?.find((i: any) => i.hairId)?.hairId ?? prev.hairId,
      };
      localStorage.setItem('char', JSON.stringify(next));
      return next;
    });
  }, [equippedItems, equippedBodyItems, hydrated]);

  const zoomOut = () =>
    setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const zoomIn = () =>
    setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));

  return (
    <div className={mcCont}>
      <div className={zoomControls}>
        <button
          className={zoomBtn}
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN}
          aria-label='Zoom out'
        >
          −
        </button>
        <span className={zoomLabel}>{zoom}x</span>
        <button
          className={zoomBtn}
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX}
          aria-label='Zoom in'
        >
          +
        </button>
      </div>
      <div className={charScale} style={{ transform: `scale(${zoom})` }}>
        <DefaultImage
          src={characterRenderUrl(body)}
          alt='Character'
          unoptimized
        />
      </div>
    </div>
  );
};

export default Char;

const mcCont = style({
  minHeight: '300px',
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
});

const charScale = style({
  display: 'flex',
  alignItems: 'flex-end',
  transformOrigin: 'bottom center',
  transition: 'transform 120ms ease-out',
  imageRendering: 'pixelated',
});

const zoomControls = style({
  position: 'absolute',
  top: 8,
  right: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 6px',
  borderRadius: 8,
  background: 'rgba(0, 0, 0, 0.55)',
  boxShadow:
    'inset 0 0 0 1px #eee, inset 0 0 0 2px rgba(8, 8, 8, 0.76), inset 0 0 2px 3px rgba(252, 252, 252, 0.36)',
  zIndex: 2,
  userSelect: 'none',
});

const zoomBtn = style({
  position: 'relative',
  width: 22,
  height: 22,
  padding: 0,
  border: 0,
  borderRadius: 4,
  background: 'rgba(255, 255, 255, 0.08)',
  boxShadow:
    'inset 0 0 0 1px rgba(255, 255, 255, 0.55), inset 0 0 0 2px rgba(0, 0, 0, 0.7)',
  color: '#fff',
  fontSize: 14,
  lineHeight: '18px',
  fontWeight: 'bold',
  fontFamily: 'inherit',
  textShadow: '0 1px 1px rgba(0, 0, 0, 0.8)',
  overflow: 'hidden',
  $nest: {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 1,
      left: 1,
      right: 1,
      height: 7,
      borderRadius: 3,
      background:
        'linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0))',
      pointerEvents: 'none',
    },
    '&:hover:not(:disabled)': {
      background: 'rgba(255, 255, 255, 0.18)',
    },
    '&:active:not(:disabled)': {
      background: 'rgba(0, 0, 0, 0.4)',
      boxShadow:
        'inset 0 0 0 1px rgba(0, 0, 0, 0.7), inset 0 0 0 2px rgba(255, 255, 255, 0.4)',
    },
    '&:disabled': {
      opacity: 0.35,
    },
  },
});

const zoomLabel = style({
  fontSize: 11,
  minWidth: 26,
  textAlign: 'center',
  color: '#ffe39a',
  fontWeight: 'bold',
  textShadow:
    '0 0 2px rgba(0, 0, 0, 0.9), 0 0 1px rgba(0, 0, 0, 0.9)',
});
