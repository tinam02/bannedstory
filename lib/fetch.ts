import { IChar } from '@/types';

const REGION = 'GMS';
const VERSION = '235';
const API_BASE = `https://maplestory.io/api/${REGION}/${VERSION}`;
const RENDER_BASE = 'https://maplestory.io/api/character';
const PER_PAGE = 50;

// IChar.pose enum -> maplestory.io stance string. Anything not listed falls back to stand1.
const POSE_TO_STANCE: Partial<Record<NonNullable<IChar['pose']>, string>> = {
  standingOneHanded: 'stand1',
  standingTwoHanded: 'stand2',
  walkingOneHanded: 'walk1',
  walkingTwoHanded: 'walk2',
  alert: 'alert',
  flying: 'fly',
  jumping: 'jump',
  sitting: 'sit',
  lyingDown: 'prone',
};

export type IBodyTypes = 'face' | 'hair';

type ItemsListResponse = {
  result: any[];
  metadata: { page: number; prevPage: number | null; nextPage: number | null };
};

const adaptItem = (io: any) => ({
  itemId: io.id,
  name: io.name,
  desc: io.desc,
  overallCategory: io.typeInfo?.overallCategory,
  category: io.typeInfo?.category,
  subcategory: io.typeInfo?.subCategory,
  requiredJobs: io.requiredJobs,
  requiredLevel: io.requiredLevel,
  requiredGender: io.requiredGender,
  isCash: io.isCash,
});

export const itemIconUrl = (itemId: number) =>
  `${API_BASE}/item/${itemId}/iconRaw`;

// Faces / hairs have no /iconRaw on maplestory.io — only /icon works for them.
export const bodyIconUrl = (itemId: number) =>
  `${API_BASE}/item/${itemId}/icon`;

// Fire-and-forget: kick off a fetch to populate browser cache.
export const preloadImageUrl = (url: string) => {
  if (typeof window === 'undefined' || !url) return;
  const img = new window.Image();
  img.src = url;
};

const buildItemsUrl = ({
  page,
  nameText,
  overallCategory,
  subcategory,
}: {
  page: number;
  nameText?: string;
  overallCategory: string;
  subcategory?: string;
}) => {
  const params = new URLSearchParams();
  params.set('overallCategoryFilter', overallCategory);
  if (subcategory) params.set('subCategoryFilter', subcategory);
  if (nameText) params.set('searchFor', nameText);
  params.set('startPosition', String(page * PER_PAGE));
  // Request one extra so we can detect whether a next page exists.
  params.set('count', String(PER_PAGE + 1));
  return `${API_BASE}/item?${params}`;
};

export const fetchItems = async ({
  page = 0,
  nameText,
  overallCategory = 'Equip',
  subcategory,
}: {
  page?: number;
  nameText?: string;
  overallCategory?: string;
  subcategory?: string;
}): Promise<ItemsListResponse> => {
  try {
    const res = await fetch(
      buildItemsUrl({ page, nameText, overallCategory, subcategory }),
      { cache: 'force-cache' }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = (await res.json()) as any[];
    const hasNext = arr.length > PER_PAGE;
    return {
      result: arr.slice(0, PER_PAGE).map(adaptItem),
      metadata: {
        page,
        prevPage: page > 0 ? page - 1 : null,
        nextPage: hasNext ? page + 1 : null,
      },
    };
  } catch (err) {
    console.error('Error fetching items:', err);
    return { result: [], metadata: { page, prevPage: null, nextPage: null } };
  }
};

export const fetchBodyItems = async ({
  page = 0,
  nameText,
  q = 'face',
}: {
  page?: number;
  nameText?: string;
  q?: IBodyTypes;
}): Promise<ItemsListResponse> => {
  const subcategory = q === 'face' ? 'Face' : 'Hair';
  const slotKey = `${q}Id`;
  const result = await fetchItems({
    page,
    nameText,
    overallCategory: 'Equip',
    subcategory,
  });
  return {
    ...result,
    result: result.result.map(item => ({ ...item, [slotKey]: item.itemId })),
  };
};

export const fetchRawIcon = async ({
  itemId,
}: {
  itemId: number;
}): Promise<string | null> => {
  if (!itemId) return null;
  return itemIconUrl(itemId);
};

export const fetchBodyIcon = async ({
  itemId,
}: {
  itemId: number;
  q: IBodyTypes;
}): Promise<string | null> => {
  if (!itemId) return null;
  return bodyIconUrl(itemId);
};

export const characterRenderUrl = (body: IChar): string => {
  const base = { Region: REGION, Version: VERSION };
  // Body skin (2000) and head (12000) are required base layers.
  const items: Array<Record<string, unknown>> = [
    { ...base, ItemId: 2000 },
    { ...base, ItemId: 12000 },
  ];
  if (body.faceId) items.push({ ...base, ItemId: body.faceId });
  if (body.hairId) items.push({ ...base, ItemId: body.hairId });
  for (const id of body.itemIds ?? []) {
    if (id) items.push({ ...base, ItemId: id });
  }
  const path = items
    .map(i => encodeURIComponent(JSON.stringify(i)))
    .join(',');
  const stance = POSE_TO_STANCE[body.pose ?? 'standingOneHanded'] ?? 'stand1';
  const frame = body.poseFrame ?? 0;
  return `${RENDER_BASE}/${path}/${stance}/${frame}`;
};

