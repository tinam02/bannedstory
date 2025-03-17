'use client';

import useChar from '@/app/context/CharCtx';
import { fontRegupix } from '@/app/styles/fonts';
import { Tabs } from '@mantine/core';
import { useState } from 'react';
import { classes } from 'typestyle';

const Wearing = ({}: {}) => {
  const [nameText, setNameText] = useState('');
  const { equippedItems, equippedBodyItems } = useChar();

  return (
    <div id='wearing' className={classes('card')}>
      <p className={classes('card-title', fontRegupix)}>INVENTORY</p>
      <div className='card-inner'></div>
    </div>
  );
};

export default Wearing;

const tabs = ['Hat', 'Top', 'Bottom', 'Overall', 'Shoes', 'Face', 'Hair'];
