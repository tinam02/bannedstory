'use client';

import { fontRegupix } from '@/app/styles/fonts';
import DragWrapper from '@/components/atoms/DragWrapper';
import { Tabs } from '@mantine/core';
import ItemList from '../ItemList';
import styles from './Closet.module.scss';

const Closet = ({}: {}) => {
  const items = tabs.map(tab => (
    <Tabs.Tab value={tab.slot} key={tab.slot}>
      {tabLabel(tab)}
    </Tabs.Tab>
  ));

  return (
    <DragWrapper id='closet'>
      <div className={styles.card}>
        <div
          className='dragHandle'
          style={{
            position: 'absolute',
            width: '100%',
            height: '30px',
            top: 1,
          }}
        />
        <p className={`${styles.title} ${fontRegupix}`}>INVENTORY</p>
        <div className={styles.inner}>
          <Tabs
            defaultValue='Hat'
            variant='outline'
            classNames={{
              root: `${styles.tabs} ${fontRegupix}`,
              list: styles.tabsList,
              tab: styles.tab,
              panel: styles.panel,
            }}
          >
            <Tabs.List grow>{items}</Tabs.List>
            <hr className={styles.divider} />
            {tabs.map(tab => (
              <Tabs.Panel value={tab.slot} key={tab.slot}>
                <ItemList slot={tab.slot} categories={tab.categories} />
              </Tabs.Panel>
            ))}
          </Tabs>
        </div>
      </div>
    </DragWrapper>
  );
};

export default Closet;

/**
 * Adding a closet tab is one entry here.
 *
 * `slot` is the equipped-slot key and, on its own, the maplestory.io
 * subCategoryFilter, so it has to match the API's spelling exactly (see
 * /api/GMS/265/item/category).
 *
 * `categories` is for a slot the API spreads across several categories. Only
 * weapons need it: the API files them under One-Handed, Two-Handed and
 * Secondary Weapon with the actual type as the subcategory, so filtering by
 * subcategory would mean sixteen tabs and, worse, sixteen separate slots you
 * could equip at once. One tab, one slot, one weapon.
 *
 * Ordered head-down, the way MapleStory's own equip window groups things.
 */
type ClosetTab = { slot: string; label?: string; categories?: string[] };

const tabs: ClosetTab[] = [
  { slot: 'Hat' },
  { slot: 'Hair' },
  { slot: 'Face' },
  { slot: 'Eye Decoration', label: 'EYE ACC' },
  { slot: 'Face Accessory', label: 'FACE ACC' },
  { slot: 'Earrings' },
  { slot: 'Top' },
  { slot: 'Bottom' },
  { slot: 'Overall' },
  { slot: 'Shoes' },
  { slot: 'Glove' },
  { slot: 'Cape' },
  { slot: 'Shield' },
  {
    slot: 'Weapon',
    categories: ['One-Handed Weapon', 'Two-Handed Weapon', 'Secondary Weapon'],
  },
];

const tabLabel = (tab: ClosetTab) => tab.label ?? tab.slot.toUpperCase();
