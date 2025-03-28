'use client';
import { useEffect, useState } from 'react';
import DefaultImage from './Image';
import { fetchRawIcon } from '@/lib/fetch';

const Item = ({
  item,
  onClick,
  hasImg,
}: {
  item: any;
  onClick?: (imgSrc: string) => void;
  hasImg?: string;
}) => {
  const [imageSrc, setImageSrc] = useState(hasImg || '');

  useEffect(() => {
    if (hasImg) return;
    const { itemId } = item;
    fetchRawIcon({ itemId }).then((res: any) => setImageSrc(res));
  }, [item, hasImg]);

  if (!imageSrc) return null;
  return (
    <div style={{ display: 'contents' }}>
      <DefaultImage
        src={imageSrc}
        alt={item.name}
        title={item.name}
        onClick={() => {
          onClick && onClick(imageSrc);
        }}
      />
    </div>
  );
};

export default Item;
