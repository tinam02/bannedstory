import NextImage from 'next/image';

const DefaultImage = ({
  src,
  alt,
  title,
}: {
  src: string;
  alt?: string;
  title?: string;
}) => {
  return (
    <NextImage
      src={src}
      alt={alt || ''}
      width='0'
      height='0'
      style={{ width: 'auto', height: 'auto' }}
      {...(title && { title })}
    />
  );
};

export default DefaultImage;
