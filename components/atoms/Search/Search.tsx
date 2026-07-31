'use client';
import { useEffect, useRef, useState } from 'react';
import { style, classes } from 'typestyle';
import { stNumberInput } from '../Pagination/pagination.css';

const DEBOUNCE_MS = 350;

const Search = ({
  setNameText,
  setPage,
}: {
  setNameText: (q: string) => void;
  setPage: (page: number) => void;
}) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // The query already reflected in the list, so we can skip redundant fetches
  // (mount, Enter-after-debounce, whitespace-only edits)
  const applied = useRef('');

  const apply = (next: string) => {
    const q = next.trim();
    if (q === applied.current) return;
    applied.current = q;
    setNameText(q);
    setPage(0);
  };

  useEffect(() => {
    const t = setTimeout(() => apply(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clear = () => {
    setValue('');
    apply('');
    inputRef.current?.focus();
  };

  return (
    <div className={wrap}>
      <input
        ref={inputRef}
        type='text'
        value={value}
        className={classes(stNumberInput, input)}
        placeholder='Search Items'
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          // Don't make people wait out the debounce if they know what they want.
          if (e.key === 'Enter') apply(value);
          if (e.key === 'Escape') clear();
        }}
      />
      {value && (
        <button
          type='button'
          className={clearBtn}
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

const wrap = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
});

const input = style({
  paddingRight: 16,
});

const clearBtn = style({
  position: 'absolute',
  right: 2,
  width: 14,
  height: 14,
  padding: 0,
  border: 0,
  background: 'transparent',
  color: '#666',
  fontSize: 13,
  lineHeight: '12px',
  cursor: 'pointer',
  $nest: {
    '&:hover': {
      color: '#000',
    },
  },
});
