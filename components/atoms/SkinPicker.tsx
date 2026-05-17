'use client';
import useChar from '@/app/context/CharCtx';
import { useState } from 'react';
import { style } from 'typestyle';

// Body IDs are 2000-series. The render endpoint returns a PNG for any id,
// even ones that don't exist in the WZ (it falls back to something), so this
// range is intentionally generous — pick visually, ignore ones that look the
// same as default. Known names in here include light (2000), pale (2002),
// tanned (2003), pink (2009), white (2010), mercedes (2011), amethyst (2013).
const SKIN_IDS = Array.from({ length: 21 }, (_, i) => 2000 + i); // 2000..2020

const swatchUrl = (id: number) => {
  const body = encodeURIComponent(
    JSON.stringify({ Region: 'GMS', Version: '235', ItemId: id })
  );
  const head = encodeURIComponent(
    JSON.stringify({ Region: 'GMS', Version: '235', ItemId: id + 10000 })
  );
  return `https://maplestory.io/api/character/${body},${head}/stand1/0`;
};

const SkinPicker = () => {
  const { skinId, setSkinId } = useChar();
  const [open, setOpen] = useState(false);
  return (
    <div className={picker}>
      <button
        className={triggerBtn}
        onClick={() => setOpen(o => !o)}
        aria-label='Skin tone'
        title={`Skin ${skinId}`}
      >
        <img src={swatchUrl(skinId)} alt='' className={triggerImg} />
        <span className={triggerLabel}>SKIN {skinId}</span>
      </button>
      {open && (
        <div className={grid}>
          {SKIN_IDS.map(id => (
            <button
              key={id}
              className={swatchBtn}
              data-active={id === skinId ? '' : undefined}
              onClick={() => {
                setSkinId(id);
                setOpen(false);
              }}
              title={String(id)}
            >
              <img src={swatchUrl(id)} alt='' className={swatchImg} />
              <span className={swatchLabel}>{id}</span>
            </button>
          ))}
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
      boxShadow:
        'inset 0 0 0 1px #ffe39a, 0 0 6px rgba(255, 227, 154, 0.55)',
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
  color: '#fff',
  textShadow: '0 0 2px rgba(0, 0, 0, 0.9)',
});
