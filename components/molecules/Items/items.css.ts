import { px } from 'csx';
import { style } from 'typestyle';

export const stItemList = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(44px, max-content))',
  justifyContent: 'center',
  gap: 4,
  textAlign: 'center',
  marginTop: 8,
  transition: 'opacity 120ms ease-out',
  $nest: {
    // Dim the previous results while a new query is loading
    '&[data-loading]': {
      opacity: 0.45,
    },
    '.closet-item': {
      width: px(44),
      height: px(44),
      borderTop: '1px solid rgba(170, 170, 170, 0.9)',
      borderLeft: '1px solid rgba(170, 170, 170, 0.7)',
      borderRight: '1px solid rgba(170, 170, 170, 0.2)',
      borderBottom: '1px solid rgba(170, 170, 170, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'inset 1px 6px 4px rgba(170, 170, 170, 0.5)',
    },
  },
});

// Spans the whole grid so the message centres regardless of column count.
export const stEmpty = style({
  gridColumn: '1 / -1',
  padding: '28px 8px',
  fontSize: 12,
  color: '#4a4a4a',
  textShadow: '0 1px 0 rgba(255, 255, 255, 0.6)',
  userSelect: 'none',
});

export const stPaginationContainer = style({
  position: 'absolute',
  bottom: 16,
  display: 'flex',
  justifyContent: 'center',
  flex: 1,
  width: '100%',
  paddingLeft: px(8),
  paddingRight: px(8),
  gap: 16,
});
