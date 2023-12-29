import NextImage from 'next/image';

const DefaultImage = ({ src, alt }: { src: string; alt?: string }) => {
  return (
    <NextImage
      src={src}
      alt={alt || ''}
      width='0'
      height='0'
      style={{ width: 'auto', height: 'auto' }}
    />
  );
};

export default DefaultImage;
