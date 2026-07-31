'use client';
import { useRef } from 'react';
import styles from './Search.module.scss';

export const SEARCH_DEBOUNCE_MS = 350;

/**
 * Presentational only — the owner holds the query and decides when it takes
 * effect. `onSubmit` means "apply this now, skip the debounce"
 */
const Search = ({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (q: string) => void;
  onSubmit: (q: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onChange('');
    onSubmit('');
    inputRef.current?.focus();
  };

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        type='text'
        value={value}
        className={styles.input}
        placeholder='Search Items'
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          // Don't make people wait out the debounce if they know what they want.
          if (e.key === 'Enter') onSubmit(value);
          if (e.key === 'Escape') clear();
        }}
      />
      {value && (
        <button
          type='button'
          className={styles.clearBtn}
          onClick={clear}
          aria-label='Clear search'
          title='Clear search'
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Search;
