'use client';
import useScene, {
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
} from '@/app/context/SceneCtx';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';

// zoom scales the whole scene, map included, so it comes from SceneCtx rather than from char
const ZoomControls = () => {
  const { zoom, setZoom } = useScene();

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
