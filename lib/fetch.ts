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

export const NW_API_URL = 'https://api.maplestory.net/character/render';
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
    const response = await fetch(NW_API_URL, {
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

    return dataUrl as string;
  } catch (error) {
    console.error('Error fetching char:', error);
    return prev;
  }
};
