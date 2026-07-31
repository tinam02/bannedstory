'use client';
import { useRef } from 'react';
import { style, classes } from 'typestyle';
import { stNumberInput } from '../Pagination/pagination.css';

export const SEARCH_DEBOUNCE_MS = 350;

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
    <div className={wrap}>
      <input
        ref={inputRef}
        type='text'
        value={value}
        className={classes(stNumberInput, input)}
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
