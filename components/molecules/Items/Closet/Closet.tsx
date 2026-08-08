'use client';

import { fontRegupix } from '@/app/styles/fonts';
import DragWrapper from '@/components/atoms/DragWrapper';
import { Tabs } from '@mantine/core';
import { useState } from 'react';
import ItemList from '../ItemList';
import { TAB_STRIP as tabs, tabLabel } from '@/lib/closet';
import MinimizeButton from '@/components/atoms/MinimizeButton/MinimizeButton';
import useMinimized from '@/app/hooks/useMinimized';
import styles from './Closet.module.scss';

const Closet = ({}: {}) => {
  const [cashOnly, setCashOnly] = useState(false);
  const [min, toggleMin] = useMinimized('closet');

  const items = tabs.map(tab => (
    <Tabs.Tab value={tab.slot} key={tab.slot}>
      {tabLabel(tab)}
    </Tabs.Tab>
  ));

  return (
    <DragWrapper id='closet'>
      <div className={styles.card} data-min={min ? '' : undefined}>
        <div
          className='dragHandle'
          style={{
            position: 'absolute',
            width: '100%',
            height: '30px',
            top: 1,
          }}
        />
        <MinimizeButton on={min} onToggle={toggleMin} label='inventory' />
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
                <ItemList
                  tab={tab}
                  cashOnly={cashOnly}
                  onCashOnlyChange={setCashOnly}
                />
              </Tabs.Panel>
            ))}
          </Tabs>
        </div>
      </div>
    </DragWrapper>
  );
};

export default Closet;
