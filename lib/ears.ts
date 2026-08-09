/**
Ears
 * The outfit stores three booleans rather than one field, because that is the
 * shape the interchange format has and other simulators read it. Only ever one
 * of them is true here: a character has one pair of ears, and the renderer
 * would quite happily stack all three.
 */

import { Outfit, OutfitItem } from '@/types';

export type EarKind = 'human' | 'merc' | 'illium' | 'highFlora';

export const EAR_KINDS: { kind: EarKind; label: string }[] = [
  { kind: 'human', label: 'Human' },
  { kind: 'merc', label: 'Mercedes' },
  { kind: 'illium', label: 'Illium' },
  { kind: 'highFlora', label: 'High Flora' },
];

/** what an outfit is wearing. first flag set wins, human when none is */
export const earOf = (outfit: Outfit): EarKind => {
  if (outfit.mercEars) return 'merc';
  if (outfit.illiumEars) return 'illium';
  if (outfit.highFloraEars) return 'highFlora';
  return 'human';
};

export const earLabel = (kind: EarKind) =>
  EAR_KINDS.find(e => e.kind === kind)?.label ?? 'Human';

/** sets one pair and clears the other two */
export const withEars = (outfit: Outfit, kind: EarKind): Outfit => ({
  ...outfit,
  mercEars: kind === 'merc',
  illiumEars: kind === 'illium',
  highFloraEars: kind === 'highFlora',
});

/**
 * A bare head wearing one pair, for swatch
 */
export const earSwatchOutfit = (outfit: Outfit, kind: EarKind): Outfit =>
  withEars(
    {
      ...outfit,
      selectedItems: {
        Body: outfit.selectedItems.Body as OutfitItem,
        Head: outfit.selectedItems.Head as OutfitItem,
      },
      emotion: 'default',
      action: 'stand1',
      frame: 0,
      animating: false,
      flipX: false,
    },
    kind,
  );
