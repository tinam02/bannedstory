import { style } from 'typestyle';

// Fills the tab panel so the grid scrolls and the pagination bar sits on the
// closet floor rather than directly under the last row of items.
export const stPanelInner = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
});

export const stItemList = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(44px, max-content))',
  justifyContent: 'center',
  // Rows stack from the top and scroll; the panel gives this its height.
  alignContent: 'flex-start',
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(0, 0, 0, 0.35) transparent',
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
      width: 44,
      height: 44,
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

// Sits below the scrolling grid rather than floating over it.
export const stPaginationContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexShrink: 0,
  width: '100%',
  padding: '8px',
  gap: 16,
});
