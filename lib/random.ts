import { OutfitItem, SelectedItems } from '@/types';
import { indexFolderFor } from './closet';
import { loadItemIndex, asOutfitItem } from '@/app/hooks/useItemIndex';

/**
 * A random outfit
 */

const pickRandom = <T,>(arr: T[]): T | null =>
  arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;

const randomItem = async (slot: string): Promise<OutfitItem | null> => {
  const folder = indexFolderFor(slot);
  if (!folder) return null;
  const index = await loadItemIndex(folder);
  if (!index?.items.length) return null;
  const e = pickRandom(index.items);
  return e ? asOutfitItem(e, slot) : null;
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
