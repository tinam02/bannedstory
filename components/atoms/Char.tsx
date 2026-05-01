'use client';
import { useEffect, useState } from 'react';
import { characterRenderUrl } from '@/lib/fetch';
import { DEFAULT_CHAR_BODY, loadSavedBody } from '@/lib/utils';
import { IChar } from '@/types';
import DefaultImage from './Image';
import useChar from '@/app/context/CharCtx';
import { style } from 'typestyle';

const Char = () => {
  const { equippedItems, equippedBodyItems } = useChar();
  const [body, setBody] = useState<IChar>(DEFAULT_CHAR_BODY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBody(loadSavedBody());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setBody(prev => {
      const next: IChar = {
        ...prev,
        itemIds: equippedItems?.map((i: any) => i.itemId) ?? [],
        faceId:
          equippedBodyItems?.find((i: any) => i.faceId)?.faceId ?? prev.faceId,
        hairId:
          equippedBodyItems?.find((i: any) => i.hairId)?.hairId ?? prev.hairId,
      };
      localStorage.setItem('char', JSON.stringify(next));
      return next;
    });
  }, [equippedItems, equippedBodyItems, hydrated]);

  return (
    <div className={mcCont}>
      <DefaultImage
        src={characterRenderUrl(body)}
        alt='Character'
        unoptimized
      />
    </div>
  );
};

export default Char;

const mcCont = style({
  minHeight: '300px',
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
});
