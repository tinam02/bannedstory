import localFont from 'next/font/local';

const fontRegupixInit = localFont({
  src: '../../public/font/Regupix.woff2',
  variable: '--font-regupix',
});
const fontArialInit = localFont({
  src: '../../public/font/ArialMT.woff2',
  variable: '--font-arial',
});

const fontRegupix = fontRegupixInit.className;
const fontArial = fontArialInit.className;

export { fontArial, fontRegupix };
