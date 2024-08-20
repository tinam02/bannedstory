'use client';
import { fetchBodyIcon, IBodyTypes } from '@/lib/fetch';
import { useState } from 'react';
import { getItemId } from '../molecules/Items/Body';
import DefaultImage from './Image';

const imageCache = new Map<string, string>();

const BodyItem = ({
  item,
  onClick,
  q,
}: {
  item: any;
  onClick: () => void;
  q: IBodyTypes;
}) => {
  const itemId = getItemId(item, q);
  const cacheKey = `${itemId}-${q}`;

  const [imageSrc, setImageSrc] = useState<string>(
    () => imageCache.get(cacheKey) || ''
  );

  if (!imageSrc) {
    fetchBodyIcon({ itemId, q })
      .then((res: string) => {
        imageCache.set(cacheKey, res);
        setImageSrc(res);
      })
      .catch(error => {
        console.error('Failed to fetch image:', error);
      });
  }

  if (!imageSrc) return null;
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

export default BodyItem;
