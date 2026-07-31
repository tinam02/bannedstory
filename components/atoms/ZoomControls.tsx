'use client';
import useChar, {
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
} from '@/app/context/CharCtx';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';

const ZoomControls = () => {
  const { zoom, setZoom } = useChar();

  const zoomOut = () =>
    setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const zoomIn = () =>
    setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));

  return (
    <div className={styles.zoom}>
      <button
        className={styles.zoomBtn}
        onClick={zoomOut}
        disabled={zoom <= ZOOM_MIN}
        aria-label='Zoom out'
      >
        −
      </button>
      <span className={styles.zoomLabel}>{zoom}x</span>
      <button
        className={styles.zoomBtn}
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
