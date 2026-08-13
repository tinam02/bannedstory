'use client';
import useScene from '@/app/context/SceneCtx';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';

/**
 * Undoes every drag on the page at once.
 *
 * The cast, the map's pan and both cards. Everything here can be dragged
 * somewhere you can't reach it again, a character off the edge of a big map
 * most of all, and there was no way back short of clearing storage
 */
const RecenterButton = () => {
  const { recenter } = useScene();

  return (
    <button
      className={styles.btn}
      onClick={recenter}
      aria-label='Recenter characters and panels'
      title='Put the characters, the map and the panels back where they started'
    >
      Recenter
    </button>
  );
};

export default RecenterButton;
