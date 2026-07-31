'use client';

import useChar from '@/app/context/CharCtx';
import { fontRegupix } from '@/app/styles/fonts';
import DragWrapper from '@/components/atoms/DragWrapper';
import { Icon } from '@/components/atoms/Icon';
import DefaultImage from '@/components/atoms/Image';
import { iconUrlFor } from '@/lib/fetch';
import styles from './Wearing.module.scss';

const Wearing = ({}: {}) => {
  const { outfit, unequip } = useChar();

  // Body/head are the skin, not removable equipment — the skin picker owns them.
  const entries = Object.entries(outfit.selectedItems).filter(
    ([slot]) => slot !== 'Body' && slot !== 'Head',
  );

  return (
    <DragWrapper id='wearing'>
      <div className={`${styles.card} ${fontRegupix}`}>
        <div
          className='dragHandle'
          style={{
            position: 'absolute',
            width: '100%',
            height: '30px',
            top: 1,
          }}
        />
        <p className={styles.title}>WEARING</p>
        <div className={styles.inner}>
          <div className={styles.list}>
            {entries.map(([slot, item]) => (
              <div key={slot} className={styles.itemContainer}>
                <div className={styles.item}>
                  <div style={{ display: 'contents' }}>
                    <DefaultImage
                      className={styles.itemImg}
                      src={iconUrlFor(item)}
                      alt={item.name}
                      title={item.name}
                      unoptimized
                    />
                  </div>
                  <div className={styles.name}>
                    <div>{item.name}</div>
                  </div>
                  <Icon
                    className={styles.closeIcon}
                    defaultImg='/ui/buttons/close/BtClose3.normal.0.png'
                    activeImg='/ui/buttons/close/BtClose3.pressed.0.png'
                    onClick={() => unequip(slot)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DragWrapper>
  );
};

export default Wearing;
