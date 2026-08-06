'use client';
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
}) => (
  <button
    type='button'
    className={styles.btn}
    data-on={on ? '' : undefined}
    aria-pressed={on}
    onClick={() => onChange(!on)}
    title={on ? 'Showing cash items only' : 'Showing all items'}
  >
    <span className={styles.mark}>$</span>
    CASH
  </button>
);

export default CashFilter;
