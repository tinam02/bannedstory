import { SelectedItems } from '@/types';
import { bodyIconUrl, fetchItems, itemIconUrl } from './fetch';

// Upper bound for random page selection. Categories vary, so we try a random
// page in this range and fall back to page 0 if the random one came back empty.
const PAGE_RANDOM_MAX = 20;

const pickRandom = <T>(arr: T[]): T | null =>
  arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;

const randomPage = () => Math.floor(Math.random() * PAGE_RANDOM_MAX);

const randomItem = async (subcategory: string) => {
  let res = await fetchItems({ page: randomPage(), subcategory });
  if (!res.result.length) res = await fetchItems({ page: 0, subcategory });
  return pickRandom(res.result);
};

export async function randomizeSelectedItems(): Promise<SelectedItems> {
  // Real MapleStory rule: Top+Bottom OR Overall, never both.
  const useOverall = Math.random() < 0.5;
  const gearSubcategories = useOverall
    ? ['Hat', 'Overall', 'Shoes']
    : ['Hat', 'Top', 'Bottom', 'Shoes'];

  const gearPromises = gearSubcategories.map(async sub => {
    const item = await randomItem(sub);
    if (!item) return null;
    return [
      item.subcategory,
      { ...item, imgSrc: itemIconUrl(item.itemId) },
    ] as const;
  });

  // Faces and hairs are ordinary items apart from their icon endpoint.
  const bodyPromises = ['Face', 'Hair'].map(async sub => {
    const item = await randomItem(sub);
    if (!item) return null;
    return [
      sub,
      { ...item, subcategory: sub, imgSrc: bodyIconUrl(item.itemId) },
    ] as const;
  });

  const results = await Promise.all([...gearPromises, ...bodyPromises]);
  const next: SelectedItems = {};
  for (const r of results) {
    if (r) next[r[0]] = r[1];
  }
  return next;
}
