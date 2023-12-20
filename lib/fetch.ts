export const API_URL = 'https://maplestory.io/api/GMS/23/';
export async function loadItems() {
  try {
    const res = await fetch(API_URL + 'item/1010000');
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(err);
    return [];
  }
}
