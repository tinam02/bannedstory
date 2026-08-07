'use client';
import { useState } from 'react';
import CashCoin from './CashCoin';
import styles from './CashFilter.module.scss';

/**
 * Limits a closet tab to nx items
 */
const CashFilter = ({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) => {
  //bump spin coin
  const [flips, setFlips] = useState(0);

  return (
    <button
      type='button'
      className={styles.btn}
      data-on={on ? '' : undefined}
      aria-pressed={on}
      onClick={() => {
        setFlips(n => n + 1);
        onChange(!on);
      }}
      title={on ? 'Showing cash items only' : 'Showing all items'}
    >
      <CashCoin flipKey={flips} />
      CASH
    </button>
  );
};

export default CashFilter;
