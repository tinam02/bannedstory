'use client';
import useChar from '@/app/context/CharCtx';
import { randomizeSelectedItems } from '@/lib/random';
import { useEffect, useRef, useState } from 'react';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';
import { SKIN_IDS } from '@/lib/skins';
import { skinEntries } from '@/lib/outfit';
import { SelectedItems } from '@/types';

const UNDO_MS = 8000;

/**
 * What randomize replaced, so one misclick doesnt fk everything up
 */
type Undo = { id: number; skin: string; selectedItems: SelectedItems };

const RandomizeButton = () => {
  const { outfit, setOutfit, activeId } = useChar();
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);

  const current = useRef(outfit);
  useEffect(() => {
    current.current = outfit;
  }, [outfit]);

  // a snapshot belongs to the character it came from, and setOutfit writes to
  // whoever is selected, so switching cast member drops the offer
  useEffect(() => setUndo(null), [activeId]);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const items = await randomizeSelectedItems();
      const skinId = SKIN_IDS[Math.floor(Math.random() * SKIN_IDS.length)];
      const before = current.current;
      // One update so the character re-renders once, not twice.
      setOutfit(prev => ({
        ...prev,
        skin: String(skinId),
        selectedItems: { ...skinEntries(skinId), ...items },
      }));
      setUndo({
        id: before.id,
        skin: before.skin,
        selectedItems: before.selectedItems,
      });
    } finally {
      setBusy(false);
    }
  };

  const onUndo = () => {
    if (!undo) return;
    setOutfit(prev => ({
      ...prev,
      skin: undo.skin,
      selectedItems: undo.selectedItems,
    }));
    setUndo(null);
  };

  return (
    <>
      <button
        className={styles.btn}
        onClick={onClick}
        disabled={busy}
        aria-label='Randomize outfit, face, hair and skin'
      >
        {busy ? '...' : 'Randomize'}
      </button>
      {undo && (
        <div
          className={styles.toast}
          role='status'
          onClick={() => setUndo(null)}
          title='Dismiss'
        >
          Randomized
          <button
            type='button'
            className={styles.toastBtn}
            onClick={e => {
              e.stopPropagation();
              onUndo();
            }}
          >
            Undo
          </button>
        </div>
      )}
    </>
  );
};

export default RandomizeButton;
