'use client';
import DefaultImage from './Image';

/**
 * A closet icon
 */
const Item = ({
  item,
  iconUrl,
  onClick,
}: {
  item: any;
  iconUrl: string;
  onClick?: (imgSrc: string) => void;
}) => (
  <div style={{ display: 'contents' }}>
    <DefaultImage
      src={iconUrl}
      alt={item.name}
      title={item.name}
      unoptimized
      onClick={() => onClick?.(iconUrl)}
    />
  </div>
);

export default Item;
