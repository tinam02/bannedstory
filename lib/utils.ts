import { IChar } from '@/types';

export const DEFAULT_CHAR_BODY: IChar = {
  itemIds: [],
  faceId: 20000,
  hairId: 30000,
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
