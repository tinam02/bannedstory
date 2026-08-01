'use client';

import useChar from '@/app/context/CharCtx';
import { fontRegupix } from '@/app/styles/fonts';
import DragWrapper from '@/components/atoms/DragWrapper';
import { Icon } from '@/components/atoms/Icon';
import DefaultImage from '@/components/atoms/Image';
import ItemAdjust, { isAdjusted } from '@/components/atoms/ItemAdjust';
import { iconUrlFor } from '@/lib/fetch';
import { OutfitItem } from '@/types';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { MouseEvent } from 'react';
import styles from './Wearing.module.scss';

/** One equipped item: icon, name, adjust popover, remove. */
const WornItem = ({ slot, item }: { slot: string; item: OutfitItem }) => {
  const { unequip, adjustItem } = useChar();
  const [opened, { toggle, close }] = useDisclosure(false);
  const edited = isAdjusted(item);

  return (
    <Popover
      opened={opened}
      onChange={close}
      position='left'
      offset={8}
      classNames={{ dropdown: styles.adjustDropdown }}
    >
      <Popover.Target>
        <div
          className={styles.itemContainer}
          role='button'
          tabIndex={0}
          aria-label={`Adjust ${item.name}`}
          data-open={opened ? '' : undefined}
          onClick={toggle}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle();
            }
          }}
        >
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
            <div
              className={styles.name}
              data-hidden={item.visible === false ? '' : undefined}
            >
              <div>{item.name}</div>
            </div>

            {/* Indicator only */}
            {edited && <span className={styles.editedDot} />}

            <Icon
              className={styles.closeIcon}
              defaultImg='/ui/buttons/close/BtClose3.normal.0.png'
              activeImg='/ui/buttons/close/BtClose3.pressed.0.png'
              onClick={(e: MouseEvent) => {
                // Otherwise removing an item also opens its adjust panel
                e.stopPropagation();
                unequip(slot);
              }}
            />
          </div>
        </div>
      </Popover.Target>
      <Popover.Dropdown>
        <ItemAdjust item={item} onChange={patch => adjustItem(slot, patch)} />
      </Popover.Dropdown>
    </Popover>
  );
};

const Wearing = ({}: {}) => {
  const { outfit } = useChar();

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
              <WornItem key={slot} slot={slot} item={item} />
            ))}
          </div>
        </div>
      </div>
    </DragWrapper>
  );
};

export default Wearing;
