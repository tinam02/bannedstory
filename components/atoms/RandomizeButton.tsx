'use client';
import useChar from '@/app/context/CharCtx';
import { randomizeSelectedItems } from '@/lib/random';
import { useState } from 'react';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';
import { SKIN_IDS } from '@/lib/skins';
import { skinEntries } from '@/lib/outfit';

const RandomizeButton = () => {
  const { setOutfit } = useChar();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const items = await randomizeSelectedItems();
      const skinId = SKIN_IDS[Math.floor(Math.random() * SKIN_IDS.length)];
      // One update so the character re-renders once, not twice.
      setOutfit(prev => ({
        ...prev,
        skin: String(skinId),
        selectedItems: { ...skinEntries(skinId), ...items },
      }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className={styles.btn}
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

