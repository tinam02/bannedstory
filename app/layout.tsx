import type { Metadata } from 'next';
import '@mantine/core/styles.css';
import './globals.scss';
import { CharProvider } from './context/CharCtx';
import { SceneProvider } from './context/SceneCtx';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';

const SITE = 'https://henehoe.app';

const DISCLAIMER =
  'MapleStory and all related assets are © NEXON Korea Corp. Henehoe is an ' +
  'unofficial, non-commercial fan project and is not affiliated with Nexon.';

const DESCRIPTION =
  'A free animated MapleStory character creator and dress up simulator. Try on hats, ' +
  'hair, faces, outfits, capes and weapons, pick a pose and an expression, ' +
  'and build a character with every item from the latest cash shop updates.';

export const metadata: Metadata = {
  // makes every relative url below absolute, which og tags require
  metadataBase: new URL(SITE),
  title: {
    default: 'Henehoe',
    template: '%s | Henehoe',
  },
  description: DESCRIPTION,
  applicationName: 'Henehoe',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'Henehoe',
    title: 'Henehoe, a MapleStory character creator',
    description: DESCRIPTION,
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Henehoe, a MapleStory character creator',
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  other: {
    disclaimer: DISCLAIMER,
    copyright: '© NEXON All rights reserved.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CharProvider>
      <SceneProvider>
        <html lang='en'>
          <head>
            <ColorSchemeScript />
          </head>
          <body>
            <MantineProvider>{children}</MantineProvider>
          </body>
        </html>
      </SceneProvider>
    </CharProvider>
  );
}
