'use client';
import { useEffect, useState } from 'react';
import { fetchCharacter } from '@/lib/fetch';
import { DEFAULT_CHAR_BODY } from '@/lib/utils';
import { IChar } from '@/types';
import DefaultImage from './Image';
import useChar from '@/app/context/CharCtx';
import { style } from 'typestyle';

const Char = ({ reqBody }: { reqBody: IChar }) => {
  const [imageSrc, setImageSrc] = useState('');
  const { equippedItems } = useChar();

  useEffect(() => {
    let body = DEFAULT_CHAR_BODY;
    if (localStorage.getItem('char')) {
      body = JSON.parse(localStorage.getItem('char') || '{}');
    }
    // if empty object, use default body
    if (Object.keys(reqBody).length !== 0) {
      body = reqBody;
    }

    if (equippedItems.length) {
      console.log('CHAR', equippedItems, body);
      body.itemIds = equippedItems.map((item: any) => item.itemId);
    }
    fetchCharacter({
      reqBody: body,
      prev: imageSrc,
    }).then(res => setImageSrc(res));
  }, [imageSrc, reqBody, equippedItems]);

  if (!imageSrc) return <>...</>;
  return (
    <div className={mcCont}>
      <DefaultImage src={imageSrc} alt='Character' />
    </div>
  );
};

export default Char;

const mcCont = style({
  minHeight: '300px',
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
});
