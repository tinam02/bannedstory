import localFont from 'next/font/local';

const fontRegupix = localFont({
  src: '../../public/font/Regupix.woff2',
  variable: '--font-regupix',
});
const fontArial = localFont({
  src: '../../public/font/ArialMT.woff2',
  variable: '--font-arial',
});

export { fontArial, fontRegupix };
