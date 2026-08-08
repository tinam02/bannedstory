'use client';
import styles from './MinimizeButton.module.scss';

const MinimizeButton = ({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) => (
  <button
    type='button'
    className={styles.btn}
    onClick={onToggle}
    title={on ? `Expand ${label}` : `Minimize ${label}`}
    aria-label={on ? `Expand ${label}` : `Minimize ${label}`}
    aria-expanded={!on}
  >
    <div className={styles.glyph}>{on ? '+' : '-'}</div>
  </button>
);

export default MinimizeButton;
