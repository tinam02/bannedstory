'use client';
import { useEffect, useState } from 'react';

// reads the manifests that scripts/wz/dump-chat-balloons.lua writes
//
// a chat balloon is a 9-slice out of UI.wz. n is the same width as c and w is
// the same height as c, so c is the tile unit and the box grows to fit whatever
// gets typed, which is what the game does with chat
//
// a name tag is the same idea with only w/c/e, so it stretches sideways and
// keeps its own height

export type UiSetName = 'balloons' | 'nametags';

/** one piece's rect inside the style's strip png, plus its wz origin offset */
export type SpritePiece = {
  x: number;
  y: number;
  w: number;
  h: number;
  // ox/oy is the origin offset, which is what says where the piece sits
  // relative to the content box. nw is -6,-6 so it hangs off the top left
  // corner, c is 0,0 so it fills the box
  ox: number;
  oy: number;
};

export type PieceName =
  | 'nw'
  | 'n'
  | 'ne'
  | 'w'
  | 'c'
  | 'e'
  | 'sw'
  | 's'
  | 'se'
  | 'arrow'
  | 'head';

export type SpriteFrame = Partial<Record<PieceName, SpritePiece>>;

export type SpriteStyle = {
  file: string;
  /** strip size, not caption size. a caption has no size until it has text */
  w: number;
  h: number;
  /** the text colour the style was drawn for, signed int32 argb */
  clr: number | null;
  /** one entry per animation frame. all but 8 of the balloons have exactly one */
  frames: SpriteFrame[];
};

export type SpriteSet = {
  set: string;
  styles: Record<string, SpriteStyle>;
};

/** signed int32 argb out of wz, to something css takes */
export const spriteColor = (clr: number | null) => {
  if (clr === null) return '#000';
  const u = clr >>> 0;
  const a = (u >>> 24) / 255;
  return `rgba(${(u >>> 16) & 255},${(u >>> 8) & 255},${u & 255},${a})`;
};

export const spriteUrl = (set: UiSetName, file: string) => `/ui/${set}/${file}`;

/**
 * Loads a style's strip png.
 *
 * Held as an element rather than drawn straight from a url because canvas needs
 * something already decoded, and both the live caption and every preview tile
 * redraw far more often than they change image.
 */
export const useStripImage = (url: string | null) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    setImg(null);
    if (!url) return;
    let stale = false;
    const el = new Image();
    el.onload = () => {
      if (!stale) setImg(el);
    };
    el.src = url;
    return () => {
      stale = true;
    };
  }, [url]);

  return img;
};

/** null means nothing wants this set yet, so don't go and fetch it */
const useUiSprites = (set: UiSetName | null) => {
  const [data, setData] = useState<SpriteSet | null>(null);

  useEffect(() => {
    if (!set) {
      setData(null);
      return;
    }
    let stale = false;
    fetch(`/ui/${set}/${set}.json`)
      .then(r => (r.ok ? r.json() : null))
      .then((body: SpriteSet | null) => {
        if (!stale) setData(body);
      })
      .catch(() => {
        // no manifest just means no captions, the rest of the stage is fine
      });
    return () => {
      stale = true;
    };
  }, [set]);

  return data;
};

export default useUiSprites;
