'use client';
import { useEffect, useState } from 'react';
import { fetchCharacter } from '@/lib/fetch';
import { DEFAULT_CHAR_BODY } from '@/lib/utils';
import { IChar } from '@/types';
import DefaultImage from './Image';
import useChar from '@/app/context/CharCtx';

const Char = ({ reqBody }: { reqBody: IChar }) => {
  const [imageSrc, setImageSrc] = useState('');
  const { equippedItems } = useChar();

  useEffect(() => {
    let body = DEFAULT_CHAR_BODY;
    if (localStorage.getItem('char')) {
      body = JSON.parse(localStorage.getItem('char') || '{}');
    }
    // if empty object, use default body
    if (Object.keys(reqBody).length !== 0) body = reqBody;
    if (equippedItems.length) {
      body.itemIds = equippedItems.map((item: any) => item.itemId);
    }
    fetchCharacter({
      reqBody: body,
      prev: imageSrc,
    }).then(res => setImageSrc(res));
  }, [imageSrc, reqBody, equippedItems]);

  if (!imageSrc) return <>...</>;
  return (
    <>
      <DefaultImage src={imageSrc} alt='Character' />
    </>
  );
};

export default Char;
