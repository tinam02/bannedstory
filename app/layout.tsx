import type { Metadata } from 'next';
import '@mantine/core/styles.css';
import './globals.scss';
import { CharProvider } from './context/CharCtx';
import { SceneProvider } from './context/SceneCtx';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';

const DISCLAIMER =
  'MapleStory and all related assets are © NEXON Korea Corp. bannedstory is an ' +
  'unofficial, non-commercial fan project and is not affiliated with, endorsed ' +
  'by, or sponsored by Nexon.';

export const metadata: Metadata = {
  title: 'bannedstory',
  description:
    'A MapleStory character creator',
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
