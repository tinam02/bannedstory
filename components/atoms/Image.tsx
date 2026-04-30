import NextImage from 'next/image';

const DefaultImage = ({
  src,
  alt,
  title,
  onClick,
  className,
  unoptimized,
}: {
  src: string;
  alt?: string;
  title?: string;
  onClick?: () => void;
  className?: string;
  unoptimized?: boolean;
}) => {
  return (
    <NextImage
      className={className}
      src={src}
      alt={alt || ''}
      width='0'
      height='0'
      style={{
        width: 'auto',
        height: 'auto',
      }}
      priority
      unoptimized={unoptimized}
      {...(title && { title })}
      {...(onClick && { onClick })}
      draggable='false'
    />
  );
};

export default DefaultImage;
