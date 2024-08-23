'use client';

import DebouncedInput from '@/components/atoms/DebouncedInput';
import BodyItems from '../Body';
import Items from '../Items';
import { useState } from 'react';
import { classes, style } from 'typestyle';
import { fontArial, fontRegupix } from '@/app/styles/fonts';

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

  return (
    <div id='card' className={classes(card, fontRegupix.className)}>
      hello
    </div>
  );
};

export default Closet;

const card = style({
  height: 400,
  width: 500,
  background: 'rgba(0,0,0,0.5)',
});
