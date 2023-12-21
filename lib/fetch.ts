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
export async function sendData( ) {
  try {
    const response = await fetch(NW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        skin: 'light',
        faceId: 20000,
        hairId: 30000,
        pose: 'standingOneHanded',
        poseFrame: 1,
        faceEmote: 'smile',
        faceFrame: 0,
        ears: 'humanEars',
        itemIds: [1060002, 1040193],
        effectFrame: 0,
      }),
    });

    const responseData = await response.blob();
    
    const imageUrl = URL.createObjectURL(responseData);
    return imageUrl;
  } catch (error) {
    console.error('Error sending data:', error);
    throw error;
  }
}
