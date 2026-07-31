import { style } from 'typestyle';

export const stPagination = style({
  display: 'flex',
  maxWidth: 600,
  gap: 8,
  justifyContent: 'center',
  alignItems: 'center',
});

export const stNumberInput = style({
  textAlign: 'center',
  borderRadius: 4,
  borderTop: '1px solid rgba(170, 170, 170, 0.9)',
  borderLeft: '1px solid rgba(170, 170, 170, 0.7)',
  borderRight: '1px solid rgba(170, 170, 170, 0.2)',
  borderBottom: '1px solid rgba(170, 170, 170, 0.2)',
  outline: 'none',
  '-moz-appearance': 'textfield',
  appearance: 'textfield',
  $nest: {
    '&::-webkit-outer-spin-button': {
      '-webkit-appearance': 'none',
      margin: 0,
    },
  },
});

export const stArrow = style({
  transition: 'all 0.1s ease-in-out',
  color: 'lightgray',
  $nest: {
    '&:hover': {
      color: '#fff',
      cursor: 'pointer',
      filter: 'drop-shadow(0 0 0.07rem #fff)',
    },
  },
});
