'use client';
import useChar from '@/app/context/CharCtx';
import { SKIN_IDS, skinLabel, skinSwatchUrl } from '@/lib/skins';
import { useState } from 'react';
import { style } from 'typestyle';

const SkinPicker = () => {
  const { skinId, setSkinId } = useChar();
  const [open, setOpen] = useState(false);
  const currentLabel = skinLabel(skinId);
  return (
    <div className={picker}>
      <button
        className={triggerBtn}
        onClick={() => setOpen(o => !o)}
        aria-label='Skin tone'
        title={`${currentLabel} (${skinId})`}
      >
        <img src={skinSwatchUrl(skinId)} alt='' className={triggerImg} />
        <span className={triggerLabel}>{currentLabel.toUpperCase()}</span>
      </button>
      {open && (
        <div className={grid}>
          {SKIN_IDS.map(id => {
            const label = skinLabel(id);
            return (
              <button
                key={id}
                className={swatchBtn}
                data-active={id === skinId ? '' : undefined}
                onClick={() => {
                  setSkinId(id);
                  setOpen(false);
                }}
                title={`${label} (${id})`}
              >
                <img src={skinSwatchUrl(id)} alt='' className={swatchImg} />
                <span className={swatchLabel}>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SkinPicker;

const picker = style({
  position: 'fixed',
  top: 50,
  right: 12,
  zIndex: 10,
  userSelect: 'none',
});

const triggerBtn = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '3px 8px 3px 4px',
  border: 0,
  borderRadius: 8,
  background: 'rgba(0, 0, 0, 0.55)',
  boxShadow:
    'inset 0 0 0 1px #eee, inset 0 0 0 2px rgba(8, 8, 8, 0.76), inset 0 0 2px 3px rgba(252, 252, 252, 0.36)',
  color: '#ffe39a',
  fontSize: 11,
  fontFamily: 'inherit',
  fontWeight: 'bold',
  cursor: 'pointer',
  textShadow: '0 0 2px rgba(0, 0, 0, 0.9), 0 0 1px rgba(0, 0, 0, 0.9)',
});

const triggerImg = style({
  width: 22,
  height: 22,
  objectFit: 'contain',
  imageRendering: 'pixelated',
});

const triggerLabel = style({
  // text styling inherited from triggerBtn
});

const grid = style({
  marginTop: 6,
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 44px)',
  gap: 4,
  padding: 6,
  maxHeight: 320,
  overflowY: 'auto',
  borderRadius: 8,
  background: 'rgba(0, 0, 0, 0.7)',
  boxShadow:
    'inset 0 0 0 1px #eee, inset 0 0 0 2px rgba(8, 8, 8, 0.76), inset 0 0 2px 3px rgba(252, 252, 252, 0.36)',
});

const swatchBtn = style({
  position: 'relative',
  width: 44,
  height: 56,
  padding: 0,
  border: 0,
  borderRadius: 4,
  background: 'rgba(255, 255, 255, 0.06)',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.25)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  paddingTop: 2,
  $nest: {
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.18)',
    },
    '&[data-active]': {
      boxShadow: 'inset 0 0 0 1px #ffe39a, 0 0 6px rgba(255, 227, 154, 0.55)',
      background: 'rgba(255, 227, 154, 0.18)',
    },
  },
});

const swatchImg = style({
  width: 32,
  height: 32,
  objectFit: 'contain',
  imageRendering: 'pixelated',
});

const swatchLabel = style({
  marginTop: 1,
  fontSize: 9,
  lineHeight: 1,
  textAlign: 'center',
  color: '#fff',
  textShadow: '0 0 2px rgba(0, 0, 0, 0.9)',
});
