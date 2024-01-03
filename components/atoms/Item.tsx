'use client';
import { useEffect, useState } from 'react';
import DefaultImage from './Image';
import { fetchRawIcon } from '@/lib/fetch';

const Item = ({ item, onClick }: { item: any; onClick: () => void }) => {
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    const { itemId } = item;
    fetchRawIcon({ itemId }).then((res: any) => setImageSrc(res));
  }, [item]);

  if (!imageSrc) return <>...</>;
  return (
    <div>
      <DefaultImage
        src={imageSrc}
        alt={item.name}
        title={item.name}
        onClick={onClick}
      />
    </div>
  );
};

export default Item;
