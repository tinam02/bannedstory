import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * The closet, end to end: browse a tab, page it in by scrolling, wear one.
 *
 * Nothing here is stubbed. The index json and the icon sheets come off
 * public/avatar the same way they do in dev, so a broken extraction fails
 * these too
 */

// components/molecules/Items/ItemList.tsx LOCAL_PAGE. the whole tab is in
// memory and this is only how much of it reaches the dom at once
const LOCAL_PAGE = 60;

/** the panel behind one tab, once that tab is the open one */
const openTab = async (page: Page, name: string) => {
  await page.getByRole('tab', { name, exact: true }).click();
  const panel = page.getByRole('tabpanel', { name, exact: true });
  await expect(panel).toBeVisible();
  return panel;
};

/**
 * The item buttons in a panel.
 *
 * Every one wraps a SpriteIcon, which is the role=img. That is what keeps the
 * cash toggle and the search clear out of the count
 */
const itemsIn = (panel: Locator) => panel.locator('button:has([role="img"])');

/**
 * How many rows are in, once the count stops climbing.
 *
 * The grid fills itself on open: the sentinel sits inside the 200px preload
 * margin until enough rows push it out of range, so a few pages land before
 * anyone has scrolled. Waiting for it to hold still is the only way to take a
 * reading that means anything
 */
const settledCount = async (items: Locator) => {
  let last = -1;
  await expect
    .poll(
      async () => {
        const now = await items.count();
        const held = now > 0 && now === last;
        last = now;
        return held;
      },
      { message: 'the item count never stopped changing' },
    )
    .toBe(true);
  return last;
};

/** what the active character is wearing in one slot, straight out of storage */
const wornId = (page: Page, slot: string) =>
  page.evaluate(key => {
    const raw = localStorage.getItem('chars');
    if (!raw) return null;
    const { chars, activeId } = JSON.parse(raw);
    const active = chars.find((c: any) => c.id === activeId) ?? chars[0];
    return active?.selectedItems?.[key]?.id ?? null;
  }, slot);

test.describe('closet', () => {
  test('the hair tab pages in more items as you scroll', async ({ page }) => {
    await page.goto('/');
    const panel = await openTab(page, 'HAIR');
    const items = itemsIn(panel);

    const first = await settledCount(items);

    // whole pages, and only a handful of them. hair is thousands of items and
    // the point of the sentinel is that they are not all in the dom
    expect(first % LOCAL_PAGE).toBe(0);
    expect(first).toBeLessThan(LOCAL_PAGE * 10);

    // scrolling the last row into view puts the sentinel back inside the
    // grid's rootMargin, which is what pulls the next page
    await items.last().scrollIntoViewIfNeeded();
    const second = await settledCount(items);
    expect(second).toBeGreaterThan(first);

    // and it keeps going, rather than stopping dead after one refill. this is
    // the case the observer's `page` dep exists for
    await items.last().scrollIntoViewIfNeeded();
    const third = await settledCount(items);
    expect(third).toBeGreaterThan(second);
  });

  test('clicking a hair puts it on the character', async ({ page }) => {
    await page.goto('/');
    const panel = await openTab(page, 'HAIR');
    const items = itemsIn(panel);
    await expect(items.first()).toBeVisible();

    // a new character already wears DEFAULT_HAIR, so wearing one is not the
    // assertion. changing to a different one is
    const before = await wornId(page, 'Hair');
    expect(before).not.toBeNull();

    const chosen = items.first();
    const name = await chosen.getByRole('img').getAttribute('aria-label');
    expect(name).toBeTruthy();

    await chosen.click();

    // the inventory row is the visible half of it
    await expect(page.getByRole('button', { name: `Adjust ${name}` })).toBeVisible();

    // and the saved character is the other half
    await expect.poll(() => wornId(page, 'Hair')).not.toBe(before);
  });
});
