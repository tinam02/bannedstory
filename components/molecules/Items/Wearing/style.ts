import { px } from "csx";
import { style } from "typestyle";

export const wearingItemContainer = style({
    marginTop: 8,
    marginLeft: 8,
    marginRight: 8,
    height: px(44),
    borderTop: '1px solid rgba(184, 202, 226, 0.9)',
    borderLeft: '1px solid rgba(161, 179, 204, 0.7)',
    borderRight: '1px solid rgba(139, 154, 185, 0.2)',
    borderBottom: '1px solid rgba(70, 110, 143, 0.2)',
    display: 'flex',
    alignItems: 'center',
    boxShadow:
      'inset 1px 6px 8px rgba(224, 240, 253, 0.5),inset -1px -5px 8px rgba(142, 175, 212, 0.6)',
    borderRadius: 10,
    backgroundColor: 'rgba(101, 174, 216, 0.61)',
  });
  
  export const wearingItem = style({
    display: 'flex',
    marginLeft: 8,
    position: 'relative',
    flex: 1,
    $nest: {
      '.item-img': { marginRight: 8, alignSelf: 'center' },
      '.name': {
        $nest: {
          div: {
            maxWidth: '95%',
            display: '-webkit-box',
            //@ts-ignore
            '-webkit-box-orient': 'vertical',
            '-webkit-line-clamp': 2,
            overflow: 'hidden',
          },
        },
        alignSelf: 'center',
        lineHeight: 0.85,
        flex: 1,
      },
    },
  });
  
  export const closeIcon = style({
    $nest: { img: { alignSelf: 'center', marginRight: 8 } },
  });
  