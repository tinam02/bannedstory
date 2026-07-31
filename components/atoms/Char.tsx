'use client';
import { characterRenderUrl } from '@/lib/fetch';
import DefaultImage from './Image';
import useChar from '@/app/context/CharCtx';
import styles from './Char.module.scss';

const Char = () => {
  const { outfit, zoom, hydrated } = useChar();

  return (
    <div className={styles.stage}>
      {/* Wait for the saved outfit so we don't render, and pay for, a
          default char that is about to be replaced. */}
      {hydrated && (
        <div className={styles.scale} style={{ transform: `scale(${zoom})` }}>
          <DefaultImage
            src={characterRenderUrl(outfit)}
            alt='Character'
            unoptimized
          />
        </div>
      )}
    </div>
  );
};

export default Char;
