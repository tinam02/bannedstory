'use client';
import { useEffect, useState } from 'react';
import DefaultImage from './Image';
import { fetchRawIcon } from '@/lib/fetch';

const Item = ({ item }: { item: any }) => {
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    const { itemId } = item;
    fetchRawIcon({ itemId }).then((res: any) => setImageSrc(res));
  }, []);

  return (
    <>
      <DefaultImage src={imageSrc} alt={item.name} title={item.name} />
    </>
  );
};

export default Item;
