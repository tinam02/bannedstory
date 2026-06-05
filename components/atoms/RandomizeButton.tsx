'use client';
import useChar from '@/app/context/CharCtx';
import { randomizeSelectedItems } from '@/lib/random';
import { useState } from 'react';
import { style } from 'typestyle';
import { SKIN_IDS } from './SkinPicker';

const RandomizeButton = () => {
  const { setSelectedItems, setSkinId } = useChar();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const items = await randomizeSelectedItems();
      setSelectedItems(items);
      setSkinId(SKIN_IDS[Math.floor(Math.random() * SKIN_IDS.length)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className={btn}
      onClick={onClick}
      disabled={busy}
      aria-label='Randomize outfit, face, hair and skin'
      title='Randomize everything'
    >
      {busy ? '...' : 'RANDOMIZE'}
    </button>
  );
};

export default RandomizeButton;

const btn = style({
  position: 'fixed',
  top: 12,
  right: 130,
  zIndex: 10,
  padding: '3px 10px',
  height: 22,
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
  userSelect: 'none',
  $nest: {
    '&:hover:not(:disabled)': {
      background: 'rgba(255, 255, 255, 0.12)',
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'wait',
    },
  },
});
