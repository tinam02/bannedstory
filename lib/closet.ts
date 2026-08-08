/**
 * The closet's tabs, and which slice of the extraction each one shows.
 *
 * Every tab reads `index`, built by scripts/wz/extract-index.lua out of the
 * client's own files, so names, icons and cash flags are all local and all
 * current. Hair and Face are the odd pair: wz stores no icon for them, so
 * theirs are composited from the sprites by scripts/build-sprite-icons.mjs
 */

export type ClosetTab = {
  /** the key an equipped item lands under */
  slot: string;
  /** when the slot name is too wide for the tab strip */
  label?: string;
  /** the folder under /avatar/index this tab reads */
  index?: string;
  /**
   * id range, for tabs sharing one index folder.
   *
   * wz keeps face accessories, eye decorations and earrings together in
   * Accessory, so the id block is the only thing telling them apart. `to` is
   * exclusive
   */
  ids?: { from: number; to: number };
  all?: true;
};

export const CLOSET_TABS: ClosetTab[] = [
  { slot: 'Hat', index: 'Cap' },
  // Hair and Face have no icon in wz, so theirs are generated from the sprites
  // by scripts/build-sprite-icons.mjs rather than extracted
  { slot: 'Hair', index: 'Hair' },
  { slot: 'Face', index: 'Face' },
  {
    slot: 'Eye Decoration',
    label: 'EYE ACC',
    index: 'Accessory',
    ids: { from: 1020000, to: 1030000 },
  },
  {
    slot: 'Face Accessory',
    label: 'FACE ACC',
    index: 'Accessory',
    ids: { from: 1010000, to: 1020000 },
  },
  {
    slot: 'Earrings',
    index: 'Accessory',
    ids: { from: 1030000, to: 1040000 },
  },
  { slot: 'Top', index: 'Coat' },
  { slot: 'Bottom', index: 'Pants' },
  { slot: 'Overall', index: 'Longcoat' },
  { slot: 'Shoes', index: 'Shoes' },
  { slot: 'Glove', index: 'Glove' },
  { slot: 'Cape', index: 'Cape' },
  // no Shield tab. the sprites were never extracted and nobody wanted them, so
  // rather than ship a tab where every item 404s it is simply not offered.
  // extract-avatar.lua still knows the folder if that ever changes
  // one tab and one slot for every kind of weapon, because a character holds
  // one. wz keeps them all in Character/Weapon regardless of type
  { slot: 'Weapon', index: 'Weapon' },
];

export const ALL_TAB: ClosetTab = { slot: '*all', label: 'ALL', all: true };

/** what the closet actually draws, as opposed to the real slots above */
export const TAB_STRIP: ClosetTab[] = [ALL_TAB, ...CLOSET_TABS];

export const tabLabel = (tab: ClosetTab) => tab.label ?? tab.slot.toUpperCase();

/**
 * The index folder an equipped slot reads from, or null if it has none.
 *
 * Used away from the closet, by anything holding an item rather than browsing
 * for one: the wearing list, the adjust popover and the randomiser
 */
export const indexFolderFor = (slot: string) =>
  CLOSET_TABS.find(t => t.slot === slot)?.index ?? null;
