'use client';

import useChar from '@/app/context/CharCtx';
import { fontRegupix } from '@/app/styles/fonts';
import DragWrapper from '@/components/atoms/DragWrapper';
import { Icon } from '@/components/atoms/Icon';
import DefaultImage from '@/components/atoms/Image';
import { classes } from 'typestyle';
import { closeIcon, wearingItem, wearingItemContainer } from './style';

const Wearing = ({}: {}) => {
  const { selectedItems, setSelectedItems } = useChar();

  function removeSlot(slot: string) {
    setSelectedItems(prev => {
      if (!prev) return prev;
      const { [slot]: _removed, ...rest } = prev;
      return rest;
    });
  }

  const entries = Object.entries(selectedItems ?? {});

  return (
    <DragWrapper id='wearing'>
      <div id='wearing' className={classes('card wearing', fontRegupix)}>
        <div
          className='dragHandle'
          style={{
            position: 'absolute',
            width: '100%',
            height: '30px',
            top: 1,
          }}
        />
        <p className={classes('card-title')}>WEARING</p>
        <div className='card-inner'>
          {entries.map(([slot, item]) => (
            <div key={slot} className={classes(wearingItemContainer)}>
              <div className={classes(wearingItem, 'clickable')}>
                <div style={{ display: 'contents' }}>
                  <DefaultImage
                    className='item-img'
                    src={item.imgSrc}
                    alt={item.name}
                    title={item.name}
                    unoptimized
                  />
                </div>
                <div className='name'>
                  <div>{item.name}</div>
                </div>
                <Icon
                  className={closeIcon}
                  defaultImg='/ui/buttons/close/BtClose3.normal.0.png'
                  activeImg='/ui/buttons/close/BtClose3.pressed.0.png'
                  onClick={() => removeSlot(slot)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DragWrapper>
  );
};

export default Wearing;
