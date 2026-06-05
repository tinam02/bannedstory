'use client';
import useChar from '@/app/context/CharCtx';
import { REGION, VERSION } from '@/lib/fetch';
import { useState } from 'react';
import { style } from 'typestyle';

// Highest known body id with a real skin. Bump as MapleStory adds new ones.
// maplestory.io exposes no name endpoint, so this is verified manually by
// scrolling the picker and comparing swatches.
export const MAX_SKIN_ID = 2048;
const MIN_SKIN_ID = 2000;

// Ids in the 2000-series that don't render a real skin in this version
// (broken / placeholder). Visually verified — add to this list as you find more.
const SKIP_SKIN_IDS = new Set<number>([
  2006, 2007, 2008, 2014, 2017, 2024, 2031, 2041, 2042, 2044,
]);

export const SKIN_IDS = Array.from(
  { length: MAX_SKIN_ID - MIN_SKIN_ID + 1 },
  (_, i) => MIN_SKIN_ID + i,
).filter(id => !SKIP_SKIN_IDS.has(id));

// Fill these in as you visually identify each. Unmapped ids fall back to
// their numeric id in the picker. Known names mentioned so far: light,
// amethyst, hessonite, jade marble, apatite, it was summer.
const SKIN_NAMES: Record<number, string> = {
  2000: 'Light',
  2001: 'Tan',
  2002: 'Dark',
  2003: 'Pale',
  2004: 'Blue Gray',
  2005: 'Green',
  // 2006: '',
  2009: 'Ghostly',
  2010: 'Fair',
  2011: 'Clay',
  2012: 'Mercedes',
  2013: 'Pale Gray',

  2015: 'Soft',
  2016: 'Blushing',
  2018: 'Peach',
  2019: 'Blushing Peach',
  2020: 'Cow',
  2021: 'Pink Cow',
  2022: 'Brown Cow',
  2023: 'Tan Cow',
  2025: 'Gold',
  2026: 'Silver',
  2027: 'Bronze',
  2028: 'Spinel',
  2029: 'Amethyst',
  2030: 'Athletic',
  2032: 'Apatite',
  2033: 'Apricot',
  2034: 'It was Summer',
  2035: 'Pink Bean',
  2036: 'Yeti',
  2037: 'Slime',
  2038: 'Mushroom',
  2039: 'Rock Spirit',
  2040: 'Pepe',
  2043: '',
  2045: 'Panda',
  2046: 'Cat',
  2047: 'Custom',
  2048: 'Hessonite',
};

const swatchUrl = (id: number) => {
  const body = encodeURIComponent(
    JSON.stringify({ Region: REGION, Version: VERSION, ItemId: id }),
  );
  const head = encodeURIComponent(
    JSON.stringify({ Region: REGION, Version: VERSION, ItemId: id + 10000 }),
  );
  return `https://maplestory.io/api/character/${body},${head}/stand1/0`;
};

const skinLabel = (id: number) => SKIN_NAMES[id] || String(id);

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
        <img src={swatchUrl(skinId)} alt='' className={triggerImg} />
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
                <img src={swatchUrl(id)} alt='' className={swatchImg} />
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
