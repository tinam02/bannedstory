'use client';
import useChar from '@/app/context/CharCtx';
import { toolbarBtn } from '@/components/molecules/Toolbar/toolbar.css';

/**
 * Swaps the render between a still frame (PNG) and the looping stance (GIF)
 */
const AnimateToggle = () => {
  const { animating, toggleAnimating } = useChar();

  return (
    <button
      className={toolbarBtn}
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
