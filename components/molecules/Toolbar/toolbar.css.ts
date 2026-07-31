import { style } from 'typestyle';

// for every tool control
export const toolbarSurface = {
  border: 0,
  borderRadius: 8,
  background: 'rgba(0, 0, 0, 0.55)',
  boxShadow:
    'inset 0 0 0 1px #eee, inset 0 0 0 2px rgba(8, 8, 8, 0.76), inset 0 0 2px 3px rgba(252, 252, 252, 0.36)',
  color: '#ffe39a',
  fontSize: 11,
  fontFamily: 'inherit',
  fontWeight: 'bold' as const,
  textShadow: '0 0 2px rgba(0, 0, 0, 0.9), 0 0 1px rgba(0, 0, 0, 0.9)',
  userSelect: 'none' as const,
};

export const toolbarBtn = style({
  ...toolbarSurface,
  display: 'flex',
  alignItems: 'center',
  height: 22,
  padding: '3px 10px',
  cursor: 'pointer',
  $nest: {
    '&:hover:not(:disabled)': {
      background: 'rgba(255, 255, 255, 0.12)',
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'wait',
    },
    '&[data-active]': {
      background: 'rgba(255, 227, 154, 0.2)',
      boxShadow:
        'inset 0 0 0 1px #ffe39a, inset 0 0 0 2px rgba(8, 8, 8, 0.76), 0 0 6px rgba(255, 227, 154, 0.45)',
    },
  },
});

export const toolbar = style({
  position: 'fixed',
  top: 12,
  right: 12,
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 6,
});

export const toolbarRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
});
