'use client';

import { fontRegupix } from '@/app/styles/fonts';
import DragWrapper from '@/components/atoms/DragWrapper';
import { Tabs } from '@mantine/core';
import { classes } from 'typestyle';
import ItemList from '../ItemList';

const Closet = ({}: {}) => {
  const items = tabs.map(tab => (
    <Tabs.Tab value={tab} key={tab}>
      {tab.toUpperCase()}
    </Tabs.Tab>
  ));

  return (
    <DragWrapper id='closet'>
      <div id='card' className={classes('card closet')}>
        <div
          className='dragHandle'
          style={{
            position: 'absolute',
            width: '100%',
            height: '30px',
            top: 1,
          }}
        />
        <p className={classes('card-title', fontRegupix)}>INVENTORY</p>
        <div className='card-inner'>
          <Tabs
            defaultValue='Hat'
            variant='outline'
            classNames={{
              root: `tabs ${fontRegupix}`,
              list: 'tabs-list',
              tab: 'tab',
            }}
          >
            <Tabs.List grow>{items}</Tabs.List>
            <hr></hr>
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
// maplestory.io filter and the equipped-slot key.
const tabs = ['Hat', 'Top', 'Bottom', 'Overall', 'Shoes', 'Face', 'Hair'];
