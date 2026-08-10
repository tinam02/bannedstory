/**
 * The catalogue's categories, which are the closet's tabs under a url.
 *
 * Plain js on purpose. scripts/build-item-pages.mjs imports this to decide
 * which folder a page comes from, and lib/items.ts imports the same file, so
 * the tab list and the url list cannot drift apart.
 *
 * `slot` matches lib/closet.ts. That is what makes the "wear this" link work:
 * the editor equips into the slot, not into the category
 */

/**
 * @typedef {object} Category
 * @property {string} key       the url segment
 * @property {string} slot      the equip slot, as lib/closet.ts names it
 * @property {string} folder    the index folder under /avatar/index
 * @property {string} title     plural, for the hub heading
 * @property {string} noun      singular, for an item page's copy
 * @property {{from:number,to:number}} [ids] id block, for the shared folder
 * @property {number} [colour]  place value of the colour digit, see below
 * @property {string} code      the islot wz gives this category's items
 */

/**
 * `code` is the slot wz writes in the item's own manifest.
 *
 * It is the tiebreak for the handful of items the extraction put in two
 * folders. "Frog Cronies" sits in both Coat and Cape, and "Teary Face" in both
 * Hair and Face, so the id alone cannot say which page it belongs on. The
 * manifest can: Frog Cronies carries islot Sr, which is a cape.
 *
 * Read off the extraction, not off a wiki. Grouping the digest by category
 * gives Cp for every hat, MaPn for every overall, and so on
 */

/**
 * `colour` is where the colour lives inside the id, as a place value.
 *
 * Hair keeps it in the last digit, so 30000 to 30007 is one style in eight
 * colours. Face keeps it in the hundreds, so 21039 and 21139 are one face.
 * Everything else has no colour digit and every id is its own item.
 *
 * A group's page is the lowest id present, not the arithmetic base, because
 * plenty of families are missing their first colour
 *
 * @type {Category[]}
 */
export const CATEGORIES = [
  { key: 'hat', code: 'Cp', slot: 'Hat', folder: 'Cap', title: 'Hats', noun: 'hat' },
  {
    key: 'hair',
    code: 'Hr',
    slot: 'Hair',
    folder: 'Hair',
    title: 'Hairstyles',
    noun: 'hairstyle',
    colour: 1,
  },
  {
    key: 'face',
    code: 'Fc',
    slot: 'Face',
    folder: 'Face',
    title: 'Faces',
    noun: 'face',
    colour: 100,
  },
  {
    key: 'eye-accessory',
    code: 'Ay',
    slot: 'Eye Decoration',
    folder: 'Accessory',
    title: 'Eye Accessories',
    noun: 'eye accessory',
    ids: { from: 1020000, to: 1030000 },
  },
  {
    key: 'face-accessory',
    code: 'Af',
    slot: 'Face Accessory',
    folder: 'Accessory',
    title: 'Face Accessories',
    noun: 'face accessory',
    ids: { from: 1010000, to: 1020000 },
  },
  {
    key: 'earrings',
    code: 'Ae',
    slot: 'Earrings',
    folder: 'Accessory',
    title: 'Earrings',
    noun: 'pair of earrings',
    ids: { from: 1030000, to: 1040000 },
  },
  { key: 'top', code: 'Ma', slot: 'Top', folder: 'Coat', title: 'Tops', noun: 'top' },
  {
    key: 'bottom',
    code: 'Pn',
    slot: 'Bottom',
    folder: 'Pants',
    title: 'Bottoms',
    noun: 'bottom',
  },
  {
    key: 'overall',
    code: 'MaPn',
    slot: 'Overall',
    folder: 'Longcoat',
    title: 'Overalls',
    noun: 'overall',
  },
  {
    key: 'shoes',
    code: 'So',
    slot: 'Shoes',
    folder: 'Shoes',
    title: 'Shoes',
    noun: 'pair of shoes',
  },
  {
    key: 'gloves',
    code: 'Gv',
    slot: 'Glove',
    folder: 'Glove',
    title: 'Gloves',
    noun: 'pair of gloves',
  },
  { key: 'cape', code: 'Sr', slot: 'Cape', folder: 'Cape', title: 'Capes', noun: 'cape' },
  {
    key: 'weapon',
    code: 'Wp',
    slot: 'Weapon',
    folder: 'Weapon',
    title: 'Weapons',
    noun: 'weapon',
  },
];

/** which category an index row belongs to, or null for one we do not show */
export const categoryOf = (folder, id) => {
  for (const c of CATEGORIES) {
    if (c.folder !== folder) continue;
    if (c.ids && (id < c.ids.from || id >= c.ids.to)) continue;
    return c;
  }
  return null;
};

/**
 * The id a group's page lives under, given any id in it.
 *
 * Only arithmetic. The caller still has to pick the lowest id that actually
 * exists, since this happily returns one nothing was extracted for
 */
export const groupBase = (category, id) =>
  category.colour
    ? id - (Math.floor(id / category.colour) % 10) * category.colour
    : id;

/**
 * A name as a url segment.
 *
 * Item names carry apostrophes, slashes, brackets and the odd bit of
 * punctuation the client uses for spacing, so anything not a letter or a digit
 * collapses to a single dash
 */
export const slugify = name =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');

/**
 * The full slug for an item, name and id.
 *
 * The id is on the end because names are not unique. 4,461 hats carry 3,923
 * distinct names, so a name-only slug would need collision handling and would
 * still change under an item if Nexon renamed a different one
 */
export const itemSlug = (name, id) => {
  const s = slugify(name || '');
  return s ? `${s}-${id}` : String(id);
};

export const byKey = key => CATEGORIES.find(c => c.key === key) ?? null;
