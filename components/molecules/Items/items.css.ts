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
      width: '44px',
      height: '44px',
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
