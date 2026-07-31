import { Outfit, OutfitItem, SelectedItems } from '@/types';
import { ADJUSTMENTS, AdjustmentKey, REGION, VERSION } from './fetch';
import { HEAD_ID_OFFSET, skinFullName } from './skins';

export const DEFAULT_SKIN_ID = 2000;

const DEFAULT_FACE: OutfitItem = {
  name: 'Defiant Face',
  desc: '',
  id: 20000,
  region: REGION,
  version: VERSION,
  typeInfo: {
    overallCategory: 'Equip',
    category: 'Character',
    subCategory: 'Face',
    lowItemId: 20000,
    highItemId: 29999,
  },
};

const DEFAULT_HAIR: OutfitItem = {
  name: 'Toben Hair',
  desc: '',
  id: 30000,
  region: REGION,
  version: VERSION,
  typeInfo: {
    overallCategory: 'Equip',
    category: 'Character',
    subCategory: 'Hair',
    lowItemId: 30000,
    highItemId: 49999,
  },
};

/**
 * Body/Head entries for a skin id. We track one id; the format wants both
 * layers spelled out, and Head is always Body + 10000.
 */
export const skinEntries = (skinId: number): SelectedItems => {
  const fullName = skinFullName(skinId);
  const base = { noIcon: true, region: REGION, version: VERSION };
  return {
    Body: {
      ...base,
      name: fullName ? `${fullName} (Body)` : 'Body',
      ...(fullName && { skinName: fullName }),
      id: skinId,
      typeInfo: {
        overallCategory: 'Character',
        category: 'Character',
        subCategory: 'Body',
        lowItemId: 2000,
        highItemId: 2999,
      },
    },
    Head: {
      ...base,
      name: fullName ? `${fullName} (Head)` : 'Head',
      id: skinId + HEAD_ID_OFFSET,
      typeInfo: {
        overallCategory: 'Character',
        category: 'Character',
        subCategory: 'Head',
        lowItemId: 12000,
        highItemId: 12999,
      },
    },
  };
};

/** The Body entry is authoritative — real exports carry a stale `skin`. */
export const skinIdOf = (outfit: Outfit) =>
  outfit.selectedItems.Body?.id ?? Number(outfit.skin) ?? DEFAULT_SKIN_ID;

export const withSkin = (outfit: Outfit, skinId: number): Outfit => ({
  ...outfit,
  skin: String(skinId),
  selectedItems: { ...outfit.selectedItems, ...skinEntries(skinId) },
});

export const createOutfit = (now: number): Outfit => ({
  id: now,
  type: 'character',
  action: 'stand1',
  emotion: 'default',
  skin: String(DEFAULT_SKIN_ID),
  zoom: 2,
  frame: 0,
  mercEars: false,
  illiumEars: false,
  highFloraEars: false,
  selectedItems: {
    ...skinEntries(DEFAULT_SKIN_ID),
    Face: DEFAULT_FACE,
    Hair: DEFAULT_HAIR,
  },
  visible: true,
  position: { x: 0, y: 0 },
  fhSnap: true,
  flipX: false,
  name: '',
  includeBackground: false,

  animating: false,
});

/** Adjustments arrive as both 0.35 and "0.35" in the wild. */
const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const parseItem = (slot: string, raw: any): OutfitItem | null => {
  const id = toNumber(raw?.id);
  if (id === undefined) return null;

  const item: OutfitItem = {
    name: raw.name ?? slot,
    desc: raw.desc ?? '',
    id,
    region: raw.region || REGION,
    version: raw.version ? String(raw.version) : VERSION,
    typeInfo: {
      overallCategory: raw.typeInfo?.overallCategory,
      category: raw.typeInfo?.category,
      // The key is the authority — some exports disagree with typeInfo.
      subCategory: slot,
      lowItemId: toNumber(raw.typeInfo?.lowItemId),
      highItemId: toNumber(raw.typeInfo?.highItemId),
    },
  };

  for (const key of Object.keys(ADJUSTMENTS) as AdjustmentKey[]) {
    const value = toNumber(raw[key]);
    if (value !== undefined) item[key] = value;
  }
  if (typeof raw.vslot === 'string') item.vslot = raw.vslot;
  if (raw.visible === false) item.visible = false;
  const equipFrame = toNumber(raw.equipFrame);
  if (equipFrame) item.equipFrame = equipFrame;
  if (raw.noIcon) item.noIcon = true;
  if (raw.skinName) item.skinName = raw.skinName;
  if (Array.isArray(raw.requiredJobs)) item.requiredJobs = raw.requiredJobs;
  if (typeof raw.isCash === 'boolean') item.isCash = raw.isCash;
  const requiredLevel = toNumber(raw.requiredLevel);
  if (requiredLevel !== undefined) item.requiredLevel = requiredLevel;
  const requiredGender = toNumber(raw.requiredGender);
  if (requiredGender !== undefined) item.requiredGender = requiredGender;

  return item;
};

/**
 * Reads an outfit exported by us or another simulator.
 *
 * Deliberately tolerant: anything unrecognized falls back to a default rather
 * than failing the whole import, and `warnings` reports what was dropped so
 * the UI can say so instead of silently losing a slot.
 */
export function parseOutfit(
  raw: unknown,
  now: number,
): { outfit: Outfit; warnings: string[] } {
  if (!raw || typeof raw !== 'object') {
    throw new Error('That file is not an outfit — expected a JSON object.');
  }
  const src = raw as Record<string, any>;
  if (!src.selectedItems || typeof src.selectedItems !== 'object') {
    throw new Error('That file has no `selectedItems`, so there is nothing to wear.');
  }

  const warnings: string[] = [];
  const selectedItems: SelectedItems = {};
  for (const [slot, rawItem] of Object.entries(src.selectedItems)) {
    const item = parseItem(slot, rawItem);
    if (item) selectedItems[slot] = item;
    else warnings.push(`Skipped “${slot}” — no usable item id.`);
  }

  // Body is authoritative, but tolerate exports missing it by falling back to
  // the top-level `skin`, then to the default.
  const skinId =
    toNumber(selectedItems.Body?.id) ??
    toNumber(src.skin) ??
    DEFAULT_SKIN_ID;
  if (!selectedItems.Body || !selectedItems.Head) {
    Object.assign(selectedItems, skinEntries(skinId));
    warnings.push('Rebuilt the missing body/head layers from the skin id.');
  }

  const base = createOutfit(now);
  const outfit: Outfit = {
    ...base,
    action: typeof src.action === 'string' ? src.action : base.action,
    emotion: typeof src.emotion === 'string' ? src.emotion : base.emotion,
    skin: String(skinId),
    zoom: toNumber(src.zoom) ?? base.zoom,
    frame: toNumber(src.frame) ?? base.frame,
    mercEars: !!src.mercEars,
    illiumEars: !!src.illiumEars,
    highFloraEars: !!src.highFloraEars,
    selectedItems,
    flipX: !!src.flipX,
    name: typeof src.name === 'string' ? src.name : '',
    includeBackground: !!src.includeBackground,
    animating: src.animating !== false,
  };

  const regions = new Set(
    Object.values(selectedItems).map(i => `${i.region} ${i.version}`),
  );
  if (regions.size > 1) {
    warnings.push(
      `Outfit mixes regions (${Array.from(regions).join(', ')}) — kept as-is.`,
    );
  }

  return { outfit, warnings };
}

export const outfitFilename = (now: number) => `bannedstory-${now}.json`;
