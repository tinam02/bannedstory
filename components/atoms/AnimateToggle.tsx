'use client';
import useChar from '@/app/context/CharCtx';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';

/**
 * Swaps the render between a still frame (PNG) and the looping stance (GIF)
 */
const AnimateToggle = () => {
  const { animating, toggleAnimating } = useChar();

  return (
    <button
      className={styles.btn}
      onClick={toggleAnimating}
      data-active={animating ? '' : undefined}
      aria-pressed={animating}
      aria-label='Animate character'
      title={animating ? 'Stop animating' : 'Animate character'}
    >
      ANIMATE
    </button>
  );
};

export default AnimateToggle;
