'use client';
import { useEffect, useState } from 'react';
import { fetchCharacter } from '@/lib/fetch';
import { DEFAULT_CHAR_BODY } from '@/lib/utils';
import { IChar } from '@/types';
import DefaultImage from './Image';

const Char = ({ reqBody }: { reqBody: IChar }) => {
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    let body = DEFAULT_CHAR_BODY;
    if (reqBody) body = reqBody;

    fetchCharacter({
      reqBody: body,
      prev: imageSrc,
    }).then(res => setImageSrc(res));
  }, [reqBody]);

  return (
    <>
      <DefaultImage src={imageSrc} alt='Character' />
    </>
  );
};

export default Char;
