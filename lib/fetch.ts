import { IChar } from '@/types';

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

export const NW_API_URL = 'https://api.maplestory.net/';
export const fetchCharacter = async ({
  reqBody,
  method = 'POST',
  prev,
}: {
  reqBody: IChar;
  method?: string;
  prev?: string;
}) => {
  try {
    const response = await fetch(`${NW_API_URL}character/render`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    const blob = await response.blob();

    // convert binary data to a b64 string
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    //save reqbody in localstorage if different from prev
    // if (prev !== JSON.stringify(reqBody))
    localStorage.setItem('char', JSON.stringify(reqBody));

    return dataUrl as string;
  } catch (error) {
    console.error('Error fetching char:', error);
    if (prev) return prev;
    return 'Error fetching char!';
  }
};

export const fetchItems = async ({
  page,
  nameText,
  overallCategory = 'Equip',
}: {
  page?: number;
  nameText?: string;
  overallCategory?: string;
}) => {
  try {
    const pageNumber = page || 1;
    const pageQuery = page ? `&page=${pageNumber}` : '';
    const nameQuery = nameText ? `&name=${nameText}` : '';
    const response = await fetch(
      `${NW_API_URL}items/?${pageQuery}&overallCategory=${overallCategory}${nameQuery}&maxEntries=2`
    );
    const { result, metadata } = await response.json();

    return { result, metadata };
  } catch (error: any) {
    console.error('Error fetching items:', error);
    return error;
  }
};

export const fetchRawIcon = async ({ itemId }: { itemId: number }) => {
  if (!itemId) return null;
  try {
    const response = await fetch(`${NW_API_URL}item/${itemId}/iconRaw`);
    const blob = await response.blob();

    // convert binary data to a b64 string
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return dataUrl;
  } catch (error: any) {
    console.error('Error fetching item:' + itemId, error);
    return error;
  }
};
