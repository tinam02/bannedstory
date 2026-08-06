/**
 * The closet's tabs, and where each one gets its items.
 *
 * Two sources, and the aim is to be off the second one entirely.
 *
 * `index` is our own, built by scripts/wz/extract-index.lua out of the client's
 * own files. It has names, icons and cash flags, and it is current.
 *
 * Everything else falls back to maplestory.io, which is frozen at GMS 265 and
 * missing whole releases: Heartthrob Eye Candy (Longcoat 1054790) renders
 * perfectly from our sprites and cannot be found through their search, because
 * their item list has never heard of it.
 *
 * A tab whose index file is missing quietly falls back to maplestory.io rather
 * than breaking, so wiring one up before its file exists is safe
 */

export type ClosetTab = {
  /** the key an equipped item lands under, and the maplestory.io subcategory */
  slot: string;
  /** when the slot name is too wide for the tab strip */
  label?: string;
  /** maplestory.io categoryFilter values, for a slot it spreads over several */
  categories?: string[];
  /** the folder under /avatar/index this tab reads, when we have one */
  index?: string;
  /**
   * id range, for tabs sharing one index folder.
   *
   * wz keeps face accessories, eye decorations and earrings together in
   * Accessory, so the id block is the only thing telling them apart. `to` is
   * exclusive, and the numbers are the ones maplestory.io's own category tree
   * reports as lowItemId/highItemId
   */
  ids?: { from: number; to: number };
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
  {
    slot: 'Weapon',
    index: 'Weapon',
    categories: ['One-Handed Weapon', 'Two-Handed Weapon', 'Secondary Weapon'],
  },
];

export const tabLabel = (tab: ClosetTab) => tab.label ?? tab.slot.toUpperCase();

/**
 * The index folder an equipped slot reads from, or null if it has none.
 *
 * Used away from the closet, by anything holding an item rather than browsing
 * for one: the wearing list and the adjust popover both need an icon, and
 * before this they went to maplestory.io for it
 */
export const indexFolderFor = (slot: string) =>
  CLOSET_TABS.find(t => t.slot === slot)?.index ?? null;
