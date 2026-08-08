import { Outfit } from '@/types';

/**
 * Every stance the render API knows, straight off a hat's `frameBooks`.
 *
 * A hat is worn in all of them, so its list is the full set. Weapons carry a
 * subset, a one handed sword has 15 of these, which is why an attack pose can
 * look wrong with the wrong weapon equipped or none at all
 */

export type Pose = { stance: string; label: string };

/**
 * The O/T/P in an attack stance is the weapon class it was drawn for, one
 * handed, two handed and polearm. The trailing F is a fourth class whose name
 * I never confirmed, so those keep the raw suffix rather than a made up label
 */
export const POSE_GROUPS: { name: string; poses: Pose[] }[] = [
  {
    name: 'Standing',
    poses: [
      { stance: 'stand1', label: 'Stand' },
      { stance: 'stand2', label: 'Stand 2H' },
      { stance: 'alert', label: 'Alert' },
      { stance: 'heal', label: 'Heal' },
    ],
  },
  {
    name: 'Moving',
    poses: [
      { stance: 'walk1', label: 'Walk' },
      { stance: 'walk2', label: 'Walk 2H' },
      { stance: 'jump', label: 'Jump' },
      { stance: 'fly', label: 'Fly' },
      { stance: 'ladder', label: 'Ladder' },
      { stance: 'rope', label: 'Rope' },
      { stance: 'sit', label: 'Sit' },
      { stance: 'prone', label: 'Lie down' },
      { stance: 'proneStab', label: 'Lie down, stab' },
    ],
  },
  {
    name: 'Ranged',
    poses: [
      { stance: 'shoot1', label: 'Bow' },
      { stance: 'shoot2', label: 'Crossbow' },
      { stance: 'shootF', label: 'Shoot F' },
    ],
  },
  {
    name: 'Swing',
    poses: [
      { stance: 'swingO1', label: 'Swing 1H a' },
      { stance: 'swingO2', label: 'Swing 1H b' },
      { stance: 'swingO3', label: 'Swing 1H c' },
      { stance: 'swingOF', label: 'Swing OF' },
      { stance: 'swingT1', label: 'Swing 2H a' },
      { stance: 'swingT2', label: 'Swing 2H b' },
      { stance: 'swingT3', label: 'Swing 2H c' },
      { stance: 'swingTF', label: 'Swing TF' },
      { stance: 'swingP1', label: 'Swing pole a' },
      { stance: 'swingP2', label: 'Swing pole b' },
      { stance: 'swingPF', label: 'Swing PF' },
    ],
  },
  {
    name: 'Stab',
    poses: [
      { stance: 'stabO1', label: 'Stab 1H a' },
      { stance: 'stabO2', label: 'Stab 1H b' },
      { stance: 'stabOF', label: 'Stab OF' },
      { stance: 'stabT1', label: 'Stab 2H a' },
      { stance: 'stabT2', label: 'Stab 2H b' },
      { stance: 'stabTF', label: 'Stab TF' },
    ],
  },
];

export const POSES: Pose[] = POSE_GROUPS.flatMap(g => g.poses);

/** the stance the outfit is standing in, or the raw string if it's unknown */
export const poseLabel = (stance: string) =>
  POSES.find(p => p.stance === stance)?.label ?? stance;

/**
 * The character in one pose, for a picker thumbnail.
 *
 * Keeps the whole outfit, unlike the emote previews. Clothing is most of what
 * makes a pose readable, and a weapon decides whether the attack ones look
 * like anything at all
 */
export const posePreviewOutfit = (outfit: Outfit, stance: string): Outfit => ({
  ...outfit,
  action: stance,
  // a still frame, so the grid isn't 35 animations running at once
  animating: false,
  frame: 0,
});
