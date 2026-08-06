'use client';

import useChar from '@/app/context/CharCtx';
import { fontRegupix } from '@/app/styles/fonts';
import DragWrapper from '@/components/atoms/DragWrapper';
import { Icon } from '@/components/atoms/Icon';
import DefaultImage from '@/components/atoms/Image';
import ItemAdjust, { isAdjusted } from '@/components/atoms/ItemAdjust';
import { iconUrlFor } from '@/lib/fetch';
import { useItemIcon } from '@/app/hooks/useItemIndex';
import SpriteIcon from '@/components/atoms/SpriteIcon/SpriteIcon';
import { OutfitItem } from '@/types';
import { warmDominantHue } from '@/app/hooks/useDominantHue';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { MouseEvent, useEffect } from 'react';
import styles from './Wearing.module.scss';

/** One equipped item: icon, name, adjust popover, remove. */
const WornItem = ({ slot, item }: { slot: string; item: OutfitItem }) => {
  const { unequip, adjustItem } = useChar();
  const [opened, { toggle, close }] = useDisclosure(false);
  const edited = isAdjusted(item);
  // our own index first. maplestory.io is only reached for a slot we have no
  // index for, and there are none of those left
  const icon = useItemIcon(slot, item.id);
  const iconUrl = icon ? icon.sheet : iconUrlFor(item);

  // Sample the hue while the row is just sitting there
  useEffect(() => {
    void warmDominantHue(iconUrl, icon);
  }, [iconUrl, icon]);

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
              {icon ? (
                <SpriteIcon
                  sheet={icon.sheet}
                  x={icon.x}
                  y={icon.y}
                  w={icon.w}
                  h={icon.h}
                  title={item.name}
                />
              ) : (
                <DefaultImage
                  className={styles.itemImg}
                  src={iconUrl}
                  alt={item.name}
                  title={item.name}
                  unoptimized
                />
              )}
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
        <ItemAdjust
          item={item}
          icon={icon}
          onChange={patch => adjustItem(slot, patch)}
        />
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
