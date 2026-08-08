import localFont from 'next/font/local';

const fontRegupixInit = localFont({
  src: '../../public/font/Regupix.woff2',
  variable: '--font-regupix',
});

const fontRegupix = fontRegupixInit.className;

export { fontRegupix };
