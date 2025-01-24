import { px } from 'csx';
import { style } from 'typestyle';

export const stPagination = style({
  display: 'flex',
  maxWidth: px(600),
  gap: px(8),
  justifyContent: 'center',
  alignItems: 'center',
});

export const stNumberInput = style({
  maxWidth: px(50),
  textAlign: 'center',
  borderRadius: px(4),
  border: 'inset 2px #fff',
  outline: 'none',
  //remove arrows
  '-moz-appearance': 'textfield',
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
