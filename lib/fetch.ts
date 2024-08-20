import { IChar } from '@/types';
import * as R from 'remeda';
import { DEFAULT_CHAR_BODY } from './utils';

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
    console.log('qqfetc', reqBody);
    const blob = await response.blob();

    // convert binary data to a b64 string
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    //save reqbody in localstorage if different from prev
    if (
      !R.equals(reqBody, {
        itemIds: [],
        faceId: 20000,
        hairId: 30000,
        skin: 'light',
        ears: 'humanEars',
        pose: 'standingOneHanded',
        faceEmote: 'default',
        faceFrame: 0,
        poseFrame: 0,
        effectFrame: 0,
      })
    ) {
      console.log('SET CHAR');
      localStorage.setItem('char', JSON.stringify(reqBody));
    }

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
  subcategory,
}: {
  page?: number;
  nameText?: string;
  overallCategory?: string;
  subcategory?: string;
}) => {
  try {
    const pageNumber = page;
    const pageQuery = page ? `&page=${pageNumber}` : '';
    const nameQuery = nameText ? `&name=${nameText}` : '';
    const subcategoryQuery = subcategory ? `&subcategory=${subcategory}` : '';
    const response = await fetch(
      `${NW_API_URL}items/?${pageQuery}&overallCategory=${overallCategory}${nameQuery}${subcategoryQuery}&maxEntries=12`,
      { cache: 'force-cache' }
    );
    const { result, metadata } = await response.json();
    console.log(result);
    return { result, metadata };
  } catch (error: any) {
    console.error('Error fetching items:', error);
    return error;
  }
};

export const fetchRawIcon = async ({ itemId }: { itemId: number }) => {
  if (!itemId) return null;
  try {
    const response = await fetch(`${NW_API_URL}item/${itemId}/iconRaw`, {
      cache: 'force-cache',
    });
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

// BODY
export type IBodyTypes = 'face' | 'hair';
export const fetchBodyItems = async ({
  page,
  nameText,
  q = 'face',
}: {
  page?: number;
  nameText?: string;
  q?: IBodyTypes;
}) => {
  try {
    const pageNumber = page;
    const pageQuery = page ? `page=${pageNumber}` : '';
    const nameQuery = nameText ? `&nameText=${nameText}` : '';

    const response = await fetch(
      `${NW_API_URL}${q}s?${pageQuery}${nameQuery}&maxEntries=12`
    );
    const { result, metadata } = await response.json();
    return { result, metadata };
  } catch (error: any) {
    console.error(`Error fetching ${q}s:`, error);
    return error;
  }
};

export const fetchBodyIcon = async ({
  itemId,
  q = 'face',
}: {
  itemId: number;
  q: IBodyTypes;
}) => {
  if (!itemId) return null;
  try {
    const response = await fetch(`${NW_API_URL}${q}/${itemId}/icon`, {
      cache: 'force-cache',
    });
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
