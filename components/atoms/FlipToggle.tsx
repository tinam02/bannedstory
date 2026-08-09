'use client';
import useChar from '@/app/context/CharCtx';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';

/**
 * Turns the character round to face the other way.
 */
const FlipToggle = () => {
  const { outfit, setOutfit } = useChar();
  const flipped = outfit.flipX;

  return (
    <button
      className={styles.btn}
      onClick={() => setOutfit(prev => ({ ...prev, flipX: !prev.flipX }))}
      data-active={flipped ? '' : undefined}
      aria-pressed={flipped}
      aria-label='Face the other way'
      title={flipped ? 'Facing right' : 'Facing left'}
    >
      Flip
    </button>
  );
};

export default FlipToggle;
