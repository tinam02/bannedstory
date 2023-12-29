export interface IChar {
  itemIds?: number[];
  faceId?: number;
  hairId?: number;
  skin?: SkinOptions;
  ears?: EarsOptions;
  pose?: PoseOptions;
  faceEmote?: FaceEmoteOptions;
  faceFrame?: number;
  poseFrame?: number;
  effectFrame?: number;
}

type PoseOptions =
  | 'standingOneHanded'
  | 'standingTwoHanded'
  | 'walkingOneHanded'
  | 'walkingTwoHanded'
  | 'alert'
  | 'flying'
  | 'jumping'
  | 'lyingDown'
  | 'lyingDownStabbing'
  | 'firingBow'
  | 'firingCrossbow'
  | 'firingBigBow'
  | 'sitting'
  | 'stabbingOneHanded'
  | 'thrustingOneHanded'
  | 'lungingOneHanded'
  | 'stabbingTwoHanded'
  | 'thrustingTwoHanded'
  | 'lungingTwoHanded'
  | 'throwingBackhanded'
  | 'throwingDownward'
  | 'throwingForehanded'
  | 'spinningThrow'
  | 'smashing'
  | 'bashing'
  | 'jumpingSmash'
  | 'slashingBehind'
  | 'slashingFront'
  | 'slashingUpward'
  | 'spinningSlash';

type SkinOptions =
  | 'light'
  | 'ashen'
  | 'palePink'
  | 'tanned'
  | 'pale'
  | 'green'
  | 'ghostly'
  | 'dark'
  | 'clay'
  | 'white'
  | 'mercedes'
  | 'softPetal'
  | 'blushingPetal';

type FaceEmoteOptions =
  | 'default'
  | 'smile'
  | 'cry'
  | 'bewildered'
  | 'angry'
  | 'hit'
  | 'troubled'
  | 'stunned'
  | 'vomit'
  | 'oops'
  | 'cheers'
  | 'chu'
  | 'wink'
  | 'pain'
  | 'glitter'
  | 'despair'
  | 'love'
  | 'shine'
  | 'blaze'
  | 'hum'
  | 'bowing'
  | 'hot'
  | 'dam'
  | 'qBlue';

type EarsOptions = 'humanEars' | 'bigEars' | 'lefEars' | 'highlefEars';
