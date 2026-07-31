import { IChar, SelectedItems } from '@/types';
import { POSE_TO_STANCE, REGION, VERSION } from './fetch';
import { HEAD_ID_OFFSET, skinFullName } from './skins';

/**
 * Outfit JSON interchange format.
 *
 * This is deliberately NOT our internal shape — it mirrors the format other
 * MapleStory avatar simulators export, so outfits move between tools. Notes on
 * the format, learned from real exports:
 *
 * - `selectedItems` is keyed by maplestory.io subCategory ("Hat", "Face", ...),
 *   which is the same vocabulary our own SelectedItems uses.
 * - Body and Head are entries in `selectedItems`, not just the top-level
 *   `skin` field. Head id is always Body id + 10000. The top-level `skin`
 *   string can be stale in real exports (seen: skin "2012" alongside Body
 *   2018), so on import the Body entry is authoritative.
 * - `region`/`version` are PER ITEM, and genuinely mix within one outfit
 *   (GMS 268 + JMS 422 + KMST 1170 seen in a single file). Item ids are not
 *   portable across regions, so these must be preserved, not normalized.
 * - Colour adjustments (hue/saturation/brightness/contrast/alpha) are
 *   inconsistently typed — sometimes 0.35, sometimes "0.35". Pass through
 *   verbatim on export; coerce with Number() on import.
 */
export interface OutfitItem {
  name: string;
  desc?: string;
  id: number;
  region: string;
  version: string;
  typeInfo: {
    overallCategory?: string;
    category?: string;
    subCategory?: string;
    lowItemId?: number;
    highItemId?: number;
  };
  noIcon?: boolean;
  skinName?: string;
  isCash?: boolean;
  requiredJobs?: string[];
  requiredLevel?: number;
  requiredGender?: number;
  // Adjustment fields — numeric in spirit, string in some exports.
  hue?: number | string;
  saturation?: number | string;
  brightness?: number | string;
  contrast?: number | string;
  alpha?: number | string;
  vslot?: string;
  visible?: boolean;
  frame?: number;
  equipFrame?: number;
}

export interface Outfit {
  id: number;
  type: 'character';
  action: string;
  emotion: string;
  skin: string;
  zoom: number;
  frame: number;
  mercEars: boolean;
  illiumEars: boolean;
  highFloraEars: boolean;
  selectedItems: Record<string, OutfitItem>;
  visible: boolean;
  position: { x: number; y: number };
  fhSnap: boolean;
  flipX: boolean;
  name: string;
  includeBackground: boolean;
  animating: boolean;
}

// Per-item fields we carry through untouched so an imported outfit can be
// re-exported without losing anything we don't model ourselves yet.
const PASSTHROUGH_KEYS = [
  'hue',
  'saturation',
  'brightness',
  'contrast',
  'alpha',
  'vslot',
  'visible',
  'frame',
  'equipFrame',
] as const;

const pickPassthrough = (item: any) => {
  const out: Record<string, unknown> = {};
  for (const key of PASSTHROUGH_KEYS) {
    if (item?.[key] !== undefined) out[key] = item[key];
  }
  return out;
};

// Our EarsOptions -> the three boolean ear flags the format uses.
const earFlags = (ears: IChar['ears']) => ({
  mercEars: ears === 'bigEars',
  illiumEars: ears === 'lefEars',
  highFloraEars: ears === 'highlefEars',
});

// One equipped item, our internal shape -> interchange shape.
const toOutfitItem = (slot: string, item: any): OutfitItem => ({
  name: item.name ?? slot,
  desc: item.desc ?? '',
  id: item.itemId ?? item.id,
  region: item.region ?? REGION,
  version: item.version ?? VERSION,
  typeInfo: {
    overallCategory: item.overallCategory,
    category: item.category,
    subCategory: item.subcategory ?? slot,
    lowItemId: item.lowItemId,
    highItemId: item.highItemId,
  },
  ...(item.isCash !== undefined && { isCash: item.isCash }),
  ...(item.requiredJobs !== undefined && { requiredJobs: item.requiredJobs }),
  ...(item.requiredLevel !== undefined && {
    requiredLevel: item.requiredLevel,
  }),
  ...(item.requiredGender !== undefined && {
    requiredGender: item.requiredGender,
  }),
  ...pickPassthrough(item),
});

// Body/Head are synthesized from skinId — we track a single id, the format
// wants both layers as full entries.
const skinEntries = (skinId: number): Record<string, OutfitItem> => {
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

export function buildOutfit({
  selectedItems,
  skinId,
  zoom,
  body,
  now,
}: {
  selectedItems: SelectedItems | null;
  skinId: number;
  zoom: number;
  body: IChar;
  now: number;
}): Outfit {
  const equipped: Record<string, OutfitItem> = {};
  for (const [slot, item] of Object.entries(selectedItems ?? {})) {
    // Body/Head come from skinId; never let a stale equipped entry shadow them.
    if (!item || slot === 'Body' || slot === 'Head') continue;
    equipped[slot] = toOutfitItem(slot, item);
  }

  return {
    id: now,
    type: 'character',
    action: POSE_TO_STANCE[body.pose ?? 'standingOneHanded'] ?? 'stand1',
    emotion: body.faceEmote ?? 'default',
    skin: String(skinId),
    zoom,
    frame: body.poseFrame ?? 0,
    ...earFlags(body.ears),
    selectedItems: { ...skinEntries(skinId), ...equipped },
    // Fields we don't model yet — emitted at the defaults other tools expect.
    visible: true,
    position: { x: 0, y: 0 },
    fhSnap: true,
    flipX: false,
    name: '',
    includeBackground: false,
    animating: true,
  };
}

export const outfitFilename = (now: number) => `bannedstory-${now}.json`;
