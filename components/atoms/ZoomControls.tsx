'use client';
import useChar, {
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
} from '@/app/context/CharCtx';
import { style } from 'typestyle';
import { toolbarSurface } from '@/components/molecules/Toolbar/toolbar.css';

const ZoomControls = () => {
  const { zoom, setZoom } = useChar();

  const zoomOut = () =>
    setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const zoomIn = () =>
    setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));

  return (
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
  );
};

export default ZoomControls;

const zoomControls = style({
  ...toolbarSurface,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 6px',
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
  textShadow: '0 0 2px rgba(0, 0, 0, 0.9), 0 0 1px rgba(0, 0, 0, 0.9)',
});
