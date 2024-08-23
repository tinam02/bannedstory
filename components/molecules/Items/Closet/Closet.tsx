'use client';

import DebouncedInput from '@/components/atoms/DebouncedInput';
import BodyItems from '../Body';
import Items from '../Items';
import { useState } from 'react';

const Closet = ({}: {}) => {
  const [nameText, setNameText] = useState('');
  return (
    <section id='closet'>
      <DebouncedInput
        onDebouncedChange={(x: string) => {
          setNameText(x);
          return x;
        }}
      />

      <Items q={'Hat'} />
      <Items q={'Top'} />
      <Items q={'Bottom'} />
      <BodyItems q={'face'}  />
      <BodyItems q={'hair'} nameText={nameText} />
    </section>
  );
};

export default Closet;
