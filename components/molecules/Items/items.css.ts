import { px } from 'csx';
import { style } from 'typestyle';

export const stItemList = style({
  display: 'flex',
  flexWrap: 'wrap',
  maxWidth: px(600), 
  gap: px(8),
});
