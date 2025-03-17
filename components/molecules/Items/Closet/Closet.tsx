'use client';

import { fontRegupix } from '@/app/styles/fonts';
import { Tabs } from '@mantine/core';
import { useState } from 'react';
import { classes } from 'typestyle';
import Items from '../Items';

const Closet = ({}: {}) => {
  const [nameText, setNameText] = useState('');
  // return (
  //   <section id='closet'>
  //     <DebouncedInput
  //       onDebouncedChange={(x: string) => {
  //         setNameText(x);
  //         return x;
  //       }}
  //     />

  //     <Items q={'Hat'} />
  //     <Items q={'Top'} />
  //     <Items q={'Bottom'} />
  //     <BodyItems q={'face'}  />
  //     <BodyItems q={'hair'} nameText={nameText} />
  //   </section>
  // );

  const items = tabs.map(tab => (
    <Tabs.Tab value={tab} key={tab}>
      {tab.toUpperCase()}
    </Tabs.Tab>
  ));

  return (
    <div id='card' className={classes('card closet')}>
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
          <Tabs.Panel value='Hat'>
            <Items q={'Hat'} />
          </Tabs.Panel>
          <Tabs.Panel value='Top'>
            <Items q={'Top'} />
          </Tabs.Panel>
          {/* 
          <Tabs.Panel value='Bottom'>
            <Items q={'Bottom'} />
          </Tabs.Panel>
          <Tabs.Panel value='Overall'>
            <Items q={'Overall'} />
          </Tabs.Panel>
          <Tabs.Panel value='Shoes'>
            <Items q={'Shoes'} />
          </Tabs.Panel>
          <Tabs.Panel value='Face'>
            <BodyItems q={'face'} />
          </Tabs.Panel>
          <Tabs.Panel value='Hair'>
            <BodyItems q={'hair'} />
          </Tabs.Panel> */}
        </Tabs>
      </div>
    </div>
  );
};

export default Closet;

const tabs = ['Hat', 'Top', 'Bottom', 'Overall', 'Shoes', 'Face', 'Hair'];
