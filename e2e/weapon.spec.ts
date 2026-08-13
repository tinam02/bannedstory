import { test, expect, type Page } from '@playwright/test';

/**
 * Weapons on the character, end to end.
 *
 * Nothing is stubbed, same as closet.spec: the manifests and sheets come off
 * public/avatar, so a broken extraction fails these. That is the point of them.
 * A weapon that stops drawing is invisible in a build and in a typecheck, and
 * the only other way to notice is to open the app and look
 */

/** Serenity Flare, a cash sword that also has a type 49 gun carry extracted */
const CARRIED = 1703317;

/** the character standing on the stage, not a picker thumbnail */
const stage = (page: Page) => page.locator('[class*="charAnchor"] canvas').first();

/**
 * The drawn character, as something comparable.
 *
 * Width and height are the avatar's own bounding box, which is what makes them
 * worth asserting on: they move when a layer is added, moved or dropped, and
 * they do NOT move when the face blinks, which runs on its own clock and would
 * otherwise make every pixel comparison flake
 */
const shape = (page: Page) =>
  stage(page).evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext('2d');
    const d = ctx?.getImageData(0, 0, el.width, el.height).data;
    let drawn = 0;
    if (d) for (let i = 3; i < d.length; i += 4) if (d[i] > 8) drawn++;
    return { w: el.width, h: el.height, drawn };
  });

/**
 * The character once it has stopped changing.
 *
 * The sheets arrive over the network and the canvas is redrawn as they land,
 * so a reading taken too early is of a half dressed character
 */
const settled = async (page: Page) => {
  let last = '';
  await expect
    .poll(
      async () => {
        const now = JSON.stringify(await shape(page));
        const held = now === last && !now.includes('"w":0');
        last = now;
        return held;
      },
      { message: 'the character never stopped redrawing' },
    )
    .toBe(true);
  return JSON.parse(last) as { w: number; h: number; drawn: number };
};

test.describe('weapons', () => {
  // no map, which is a real choice and not an empty state.
  //
  // nothing here reads the backdrop: the assertions come off the character's
  // own canvas and the map is separate dom. but the default is Arcana, which
  // pulls plates, animated backs and particles on every load, so this is a
  // subsystem these tests would otherwise wait for and could be broken by
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('scene', JSON.stringify({ mapId: null }));
    });
  });

  test('a weapon draws on the character in the default pose', async ({ page }) => {
    await page.goto('/');
    await expect(stage(page)).toBeVisible();
    const bare = await settled(page);

    // ?wear equips and then drops the parameter, the same path every item
    // page's button takes
    await page.goto(`/?wear=${CARRIED}`);
    await expect(stage(page)).toBeVisible();
    const armed = await settled(page);

    // a sword is longer than the character is wide, so it has to grow the box.
    // if the manifest went missing this is where it shows: the item equips,
    // the inventory row appears, and nothing is drawn
    expect(armed.w).toBeGreaterThan(bare.w);
    expect(armed.drawn).toBeGreaterThan(bare.drawn);
  });

  test('the gun carry draws different art from the normal carry', async ({ page }) => {
    await page.goto(`/?wear=${CARRIED}`);
    await expect(stage(page)).toBeVisible();
    const normal = await settled(page);

    // the standing row holds all three carries. this one is stand1 as well, so
    // anything that changes is the weapon and not the pose
    await page.getByRole('button', { name: 'Pose' }).click();
    await page.getByRole('button', { name: 'Stand gun' }).click();

    const gun = await settled(page);

    // the type 49 sheet is different art at a different origin, so the box it
    // needs is a different size. equal here means loadCarried fell back, which
    // is what happens when the -49 files are missing from the extraction
    expect(`${gun.w}x${gun.h}`).not.toBe(`${normal.w}x${normal.h}`);
  });

  test('every carry in the standing row keeps the character on screen', async ({ page }) => {
    await page.goto(`/?wear=${CARRIED}`);
    await expect(stage(page)).toBeVisible();
    await settled(page);

    for (const carry of ['Stand', 'Stand 2H', 'Stand gun']) {
      await page.getByRole('button', { name: 'Pose' }).click();
      await page.getByRole('button', { name: carry, exact: true }).click();
      const drawn = await settled(page);

      // a stance a weapon has no art for still draws the character, and an
      // anchor that resolves to nothing would collapse the box instead
      expect(drawn.w, `${carry} drew nothing`).toBeGreaterThan(0);
      expect(drawn.drawn, `${carry} drew no pixels`).toBeGreaterThan(0);
    }
  });
});
