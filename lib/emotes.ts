import { Outfit, SelectedItems } from '@/types';

/**
 * Face expressions, ordered with the everyday ones first.
 *
 * These are the frame keys a face item carries in wz, and the values the face
 * manifest is keyed by
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

/**
 * The character head-and-shoulders wearing `emotion`, for a picker thumbnail.
 *
 * Only the slots above the neck, so the swatch is a face rather than a whole
 * body shrunk to thumbnail size.
 *
 * Returns the outfit rather than a url, because AvatarCanvas draws these now.
 * See posePreviewOutfit for why
 */
export const emotePreviewOutfit = (outfit: Outfit, emotion: string): Outfit => {
  const selectedItems: SelectedItems = {};
  for (const slot of PREVIEW_SLOTS) {
    const item = outfit.selectedItems[slot];
    if (item) selectedItems[slot] = item;
  }
  return {
    ...outfit,
    emotion,
    selectedItems,
    animating: false,
    action: 'stand1',
    frame: 0,
    flipX: false,
    name: '',
  };
};
