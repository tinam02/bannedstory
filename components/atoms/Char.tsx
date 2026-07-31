'use client';
import { characterRenderUrl } from '@/lib/fetch';
import DefaultImage from './Image';
import useChar from '@/app/context/CharCtx';
import { style } from 'typestyle';

const Char = () => {
  const { outfit, zoom, hydrated } = useChar();

  return (
    <div className={mcCont}>
      {/* Wait for the saved outfit so we don't render, and pay for, a
          default char that is about to be replaced. */}
      {hydrated && (
        <div className={charScale} style={{ transform: `scale(${zoom})` }}>
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
