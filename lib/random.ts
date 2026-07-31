import { SelectedItems } from '@/types';
import { fetchItems } from './fetch';

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
