import { IChar, SelectedItems } from '@/types';

export const DEFAULT_CHAR_BODY: IChar = {
  itemIds: [],
  faceId: 20000,
  hairId: 30000,
  skinId: 2000,
  skin: 'light',
  ears: 'humanEars',
  pose: 'standingOneHanded',
  faceEmote: 'default',
  faceFrame: 0,
  poseFrame: 0,
  effectFrame: 0,
};

export const loadSavedBody = (): IChar => {
  if (typeof window === 'undefined') return DEFAULT_CHAR_BODY;
  try {
    const stored = localStorage.getItem('char');
    return stored
      ? { ...DEFAULT_CHAR_BODY, ...JSON.parse(stored) }
      : DEFAULT_CHAR_BODY;
  } catch {
    return DEFAULT_CHAR_BODY;
  }
};

// Face/Hair render through dedicated IChar slots; everything else goes into itemIds.
const BODY_SLOTS = new Set(['Face', 'Hair']);

export function selectedItemsToBody(
  selectedItems: SelectedItems | null | undefined,
  base: IChar
): IChar {
  const items = selectedItems ?? {};
  const face = items['Face'];
  const hair = items['Hair'];
  const itemIds = Object.entries(items)
    .filter(([slot]) => !BODY_SLOTS.has(slot))
    .map(([, item]) => item.itemId)
    .filter((id: any): id is number => typeof id === 'number');
  return {
    ...base,
    itemIds,
    // Removing the equipped Face/Hair reverts to the defaults, not whatever prev held.
    faceId: face?.itemId ?? DEFAULT_CHAR_BODY.faceId,
    hairId: hair?.itemId ?? DEFAULT_CHAR_BODY.hairId,
  };
}
