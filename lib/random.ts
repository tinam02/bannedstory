import { SelectedItems } from '@/types';
import {
  bodyIconUrl,
  fetchBodyItems,
  fetchItems,
  IBodyTypes,
  itemIconUrl,
} from './fetch';

// Upper bound for random page selection. Categories vary, so we try a random
// page in this range and fall back to page 0 if the random one came back empty.
const PAGE_RANDOM_MAX = 20;

const pickRandom = <T>(arr: T[]): T | null =>
  arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;

const randomPage = () => Math.floor(Math.random() * PAGE_RANDOM_MAX);

const randomGearItem = async (subcategory: string) => {
  let res = await fetchItems({ page: randomPage(), subcategory });
  if (!res.result.length) res = await fetchItems({ page: 0, subcategory });
  return pickRandom(res.result);
};

const randomBodyItem = async (q: IBodyTypes) => {
  let res = await fetchBodyItems({ page: randomPage(), q });
  if (!res.result.length) res = await fetchBodyItems({ page: 0, q });
  return pickRandom(res.result);
};

export async function randomizeSelectedItems(): Promise<SelectedItems> {
  // Real MapleStory rule: Top+Bottom OR Overall, never both.
  const useOverall = Math.random() < 0.5;
  const gearSubcategories = useOverall
    ? ['Hat', 'Overall', 'Shoes']
    : ['Hat', 'Top', 'Bottom', 'Shoes'];

  const gearPromises = gearSubcategories.map(async sub => {
    const item = await randomGearItem(sub);
    if (!item) return null;
    return [
      item.subcategory,
      { ...item, imgSrc: itemIconUrl(item.itemId) },
    ] as const;
  });

  const facePromise = (async () => {
    const item = await randomBodyItem('face');
    if (!item) return null;
    const itemId = item.faceId ?? item.itemId;
    return [
      'Face',
      { ...item, itemId, subcategory: 'Face', imgSrc: bodyIconUrl(itemId) },
    ] as const;
  })();

  const hairPromise = (async () => {
    const item = await randomBodyItem('hair');
    if (!item) return null;
    const itemId = item.hairId ?? item.itemId;
    return [
      'Hair',
      { ...item, itemId, subcategory: 'Hair', imgSrc: bodyIconUrl(itemId) },
    ] as const;
  })();

  const results = await Promise.all([...gearPromises, facePromise, hairPromise]);
  const next: SelectedItems = {};
  for (const r of results) {
    if (r) next[r[0]] = r[1];
  }
  return next;
}
