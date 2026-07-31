import { Outfit, SelectedItems } from '@/types';
import { characterRenderUrl } from './fetch';

/**
 * Face expressions, ordered with the everyday ones first.
 *
 * These are the `frameBooks` keys maplestory.io exposes on a face item, and they are the values the render URL takes as `animationName`
 */
export const EMOTES = [
  'default',
  'blink',
  'smile',
  'wink',
  'cry',
  'angry',
  'despair',
  'love',
  'shine',
  'glitter',
  'cheers',
  'chu',
  'hot',
  'hum',
  'oops',
  'pain',
  'bewildered',
  'stunned',
  'troubled',
  'vomit',
  'hit',
  'bowing',
  'blaze',
  'dam',
  'qBlue',
];

/** prettier */
export const emoteLabel = (emote: string) =>
  emote.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();

// Only the layers above the neck. Clothing can't change an
// expression, and leaving it out keeps preview URLs, and their cache
// entries, stable while the outfit changes underneath
const PREVIEW_SLOTS = ['Body', 'Head', 'Face', 'Face Accessory', 'Hair'];

/** A head-and-shoulders render of the current character wearing `emotion`. */
export const emotePreviewUrl = (outfit: Outfit, emotion: string) => {
  const selectedItems: SelectedItems = {};
  for (const slot of PREVIEW_SLOTS) {
    const item = outfit.selectedItems[slot];
    if (item) selectedItems[slot] = item;
  }
  return characterRenderUrl({
    ...outfit,
    emotion,
    selectedItems,
    animating: false,
    action: 'stand1',
    frame: 0,
    flipX: false,
    name: '',
  });
};
