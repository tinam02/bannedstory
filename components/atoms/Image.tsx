import NextImage from 'next/image';

const DefaultImage = ({
  src,
  alt,
  title,
  onClick,
  className
}: {
  src: string;
  alt?: string;
  title?: string;
  onClick?: () => void;
  className?: string;
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
        cursor: onClick ? 'pointer' : 'default',
      }}
      {...(title && { title })}
      {...(onClick && { onClick })}
    />
  );
};

export default DefaultImage;
