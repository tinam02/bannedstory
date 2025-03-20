'use client';

import useChar from '@/app/context/CharCtx';
import { fontRegupix } from '@/app/styles/fonts';
import DragWrapper from '@/components/atoms/DragWrapper';
import { useState } from 'react';
import { classes } from 'typestyle';

const Wearing = ({}: {}) => {
  const [nameText, setNameText] = useState('');
  const { equippedItems, equippedBodyItems } = useChar();

  return (
    <DragWrapper id='wearing'>
      <div id='wearing' className={classes('card')}>
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
        <div className='card-inner'></div>
      </div>
    </DragWrapper>
  );
};

export default Wearing;

const tabs = ['Hat', 'Top', 'Bottom', 'Overall', 'Shoes', 'Face', 'Hair'];
