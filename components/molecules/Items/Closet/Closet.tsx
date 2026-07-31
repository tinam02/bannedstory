'use client';

import { fontRegupix } from '@/app/styles/fonts';
import DragWrapper from '@/components/atoms/DragWrapper';
import { Tabs } from '@mantine/core';
import ItemList from '../ItemList';
import styles from './Closet.module.scss';

const Closet = ({}: {}) => {
  const items = tabs.map(tab => (
    <Tabs.Tab value={tab} key={tab}>
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
              <Tabs.Panel value={tab} key={tab}>
                <ItemList subcategory={tab} />
              </Tabs.Panel>
            ))}
          </Tabs>
        </div>
      </div>
    </DragWrapper>
  );
};

export default Closet;

// Adding a closet tab is one entry here — the subcategory doubles as the
// maplestory.io filter and the equipped-slot key, so the string must match the
// API's spelling exactly (see /api/GMS/265/item/category). Ordered head-down,
// the way MapleStory's own equip window groups things.
const tabs = [
  'Hat',
  'Hair',
  'Face',
  'Eye Decoration',
  'Face Accessory',
  'Earrings',
  'Top',
  'Bottom',
  'Overall',
  'Shoes',
  'Glove',
];

// where the API's name is too wide for the tab strip
const TAB_LABELS: Record<string, string> = {
  'Eye Decoration': 'EYE ACC',
  'Face Accessory': 'FACE ACC',
};

const tabLabel = (sub: string) => TAB_LABELS[sub] ?? sub.toUpperCase();
