'use client';
import { useEffect, useState } from 'react';
import DefaultImage from './Image';
import { fetchBodyIcon, fetchRawIcon, IBodyTypes } from '@/lib/fetch';

const BodyItem = ({
  item,
  onClick,
  q,
}: {
  item: any;
  onClick: () => void;
  q: IBodyTypes;
}) => {
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    const { itemId } = item;
    fetchBodyIcon({ itemId, q }).then((res: any) => setImageSrc(res));
  }, [item, q]);

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
