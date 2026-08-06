import { OutfitItem, SelectedItems } from '@/types';
import { indexFolderFor } from './closet';
import { loadItemIndex, asOutfitItem } from '@/app/hooks/useItemIndex';
import { fetchItems } from './fetch';

/**
 * A random outfit
 *
 */

const pickRandom = <T,>(arr: T[]): T | null =>
  arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;

// only used for a slot with no index, which is none of them at the moment
const PAGE_RANDOM_MAX = 20;

const randomFromApi = async (slot: string) => {
  const page = Math.floor(Math.random() * PAGE_RANDOM_MAX);
  let res = await fetchItems({ page, subcategory: slot });
  if (!res.result.length) res = await fetchItems({ page: 0, subcategory: slot });
  return pickRandom(res.result);
};

const randomItem = async (slot: string): Promise<OutfitItem | null> => {
  const folder = indexFolderFor(slot);
  if (folder) {
    const index = await loadItemIndex(folder);
    if (index?.items.length) {
      const e = pickRandom(index.items);
      return e ? asOutfitItem(e, slot) : null;
    }
  }
  return randomFromApi(slot);
};

export async function randomizeSelectedItems(): Promise<SelectedItems> {
  // Real MapleStory rule: Top+Bottom OR Overall, never both.
  const useOverall = Math.random() < 0.5;
  const slots = useOverall
    ? ['Hat', 'Overall', 'Shoes', 'Face', 'Hair']
    : ['Hat', 'Top', 'Bottom', 'Shoes', 'Face', 'Hair'];

  const results = await Promise.all(
    slots.map(async slot => {
      const item = await randomItem(slot);
      return item ? ([slot, item] as const) : null;
    }),
  );

  const next: SelectedItems = {};
  for (const r of results) {
    if (r) next[r[0]] = r[1];
  }
  return next;
}
