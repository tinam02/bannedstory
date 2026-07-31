'use client';
import { OutfitItem } from '@/types';
import DefaultImage from './Image';

/**
 * A closet icon
 */
const Item = ({
  item,
  iconUrl,
  onClick,
}: {
  item: OutfitItem;
  iconUrl: string;
  onClick?: () => void;
}) => (
  <div style={{ display: 'contents' }}>
    <DefaultImage
      src={iconUrl}
      alt={item.name}
      title={item.name}
      unoptimized
      onClick={onClick}
    />
  </div>
);

export default Item;
