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
    <div id='card' className={classes(card)}>
      <p className={classes('card-title', fontRegupix)}>INVENTORY</p>
      hello
    </div>
  );
};

export default Closet;

const card = style({
  height: 400,
  width: 500,
  background: 'rgba(0,0,0,0.65)',
  border: '1px solid rgba(255,255,255,0.75)',
  $nest: {
    '.card-title': {
      fontSize:12,
      textAlign: 'center',
      background: '-webkit-linear-gradient(#ffee44, #ffbb00)',
      backgroundClip: 'text',
      '-webkit-text-fill-color': 'transparent',
      filter: 'drop-shadow(0 0 1px rgba(0,0, 0, 1))',
      transform:'scale(1, 0.78)',
letterSpacing:-0.3
    },
  },
});
