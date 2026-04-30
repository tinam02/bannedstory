import { px } from 'csx';
import { style } from 'typestyle';

export const stItemList = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(44px, max-content))',
  justifyContent: 'center',
  gap: 4,
  textAlign: 'center',
  marginTop: 8,
  $nest: {
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
