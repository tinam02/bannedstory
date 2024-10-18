'use client';

import DebouncedInput from '@/components/atoms/DebouncedInput';
import BodyItems from '../Body';
import Items from '../Items';
import { useState } from 'react';
import { classes, style } from 'typestyle';
import { fontArial, fontRegupix } from '@/app/styles/fonts';
import { Tabs } from '@mantine/core';

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
    <div id='card' className={classes('card')}>
      <p className={classes('card-title', fontRegupix)}>INVENTORY</p>
      <div className='card-inner'>
        <Tabs
          defaultValue='Hat'
          variant='outline'
          visibleFrom='sm'
          classNames={{
            root: `tabs ${fontRegupix}`,
            list: 'tabs-list',
            tab: 'tab',
          }}
        >
          <Tabs.List>{items}</Tabs.List>
          <hr></hr>
          <Tabs.Panel value='Hat'>
            <Items q={'Hat'} />
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  );
};

export default Closet;

const tabs = ['Hat', 'Top', 'Bottom', 'Face', 'Hair'];
