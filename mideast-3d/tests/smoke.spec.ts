import { test, expect, type Page } from '@playwright/test';
import chapters from '../src/data/chapters.json' with { type: 'json' };
import type { AppState } from '../src/state/store';

/**
 * Smoke test: the app loads, the timeline can be scrubbed to several dates,
 * boundary layers change with the date, and one event per era opens a detail
 * panel with attributed, multi-source content. Runs at 1440px and 375px.
 */

declare global {
  interface Window {
    __mideast?: {
      setDate: (iso: string) => void;
      selectEvent: (id: string | null) => void;
      getState: () => AppState;
    };
  }
}

async function setDate(page: Page, iso: string): Promise<void> {
  await page.evaluate((d) => window.__mideast!.setDate(d), iso);
}

async function boundaryStatus(page: Page, chapterId: string) {
  await page.waitForFunction(
    (id) => {
      const s = window.__mideast?.getState().boundaryStatus;
      return !!s && s.chapterId === id && s.featureCount > 0;
    },
    chapterId,
    { timeout: 30_000 },
  );
  return page.evaluate(() => window.__mideast!.getState().boundaryStatus!);
}

async function ensurePanelExpanded(page: Page): Promise<void> {
  const toggle = page.getByTestId('panel-toggle');
  if (await toggle.isVisible()) {
    const expanded = await toggle.getAttribute('aria-expanded');
    if (expanded !== 'true') await toggle.click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('globe-canvas')).toBeVisible();
  await page.waitForFunction(() => typeof window.__mideast?.getState === 'function');
});

test('scrubbing changes the date, chapter and boundary layer', async ({ page }) => {
  const slider = page.getByTestId('timeline-slider');
  await expect(slider).toBeVisible();

  // Three scrub targets via the public test hook, then one via the keyboard.
  await setDate(page, '1947-11-29');
  await expect(page.getByTestId('current-date')).toContainText('29 November 1947');
  const s1947 = await boundaryStatus(page, 'partition-war');
  expect(s1947.visibleStyles).toContain('partition-jewish-state');

  await setDate(page, '1949-08-01');
  const s1949 = await boundaryStatus(page, 'armistice-suez');
  expect(s1949.visibleStyles).toContain('israel');
  expect(s1949.visibleStyles).not.toContain('partition-jewish-state');
  expect(s1949.visibleStyles).toContain('armistice');

  await setDate(page, '1967-07-01');
  const s1967 = await boundaryStatus(page, 'six-day-to-yom-kippur');
  expect(s1967.visibleStyles).toContain('israeli-occupied');
  expect(s1967.visibleStyles).not.toContain('jordan-administered');

  await setDate(page, '2026-09-09');
  const s2026 = await boundaryStatus(page, 'ceasefire-and-after');
  expect(s2026.visibleStyles).toContain('idf-control-zone');
  await expect(page.getByTestId('current-date')).toContainText('9 September 2026');

  // Keyboard scrub: Home jumps to the start of the scope.
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(page.getByTestId('current-date')).toContainText('2 November 1917');
  await boundaryStatus(page, 'mandate');

  // Play/pause toggles playback state.
  await page.getByTestId('play-toggle').click();
  await page.waitForFunction(() => window.__mideast!.getState().playing === true);
  await page.getByTestId('play-toggle').click();
  await page.waitForFunction(() => window.__mideast!.getState().playing === false);
});

test('one event per era opens a sourced detail panel', async ({ page }) => {
  for (const chapter of chapters) {
    await setDate(page, chapter.start);
    await ensurePanelExpanded(page);
    await expect(page.getByTestId('chapter-title')).toContainText(chapter.title);

    const items = page.getByTestId('event-list-item');
    await expect(items.first()).toBeVisible();
    const target = items.nth(Math.min(1, (await items.count()) - 1));
    const eventId = await target.getAttribute('data-event-id');
    await target.click();

    const detail = page.getByTestId('detail-panel');
    await expect(detail).toBeVisible();
    await expect(page.getByTestId('detail-title')).not.toBeEmpty();
    const links = page.getByTestId('sources').locator('a[href^="http"]');
    expect(await links.count(), `event ${eventId} should cite at least two sources`).toBeGreaterThanOrEqual(2);
    expect(await page.getByTestId('perspectives').locator('li').count()).toBeGreaterThanOrEqual(2);

    await page.getByTestId('detail-back').click();
    await expect(page.getByTestId('chapter-title')).toBeVisible();
  }
});

test('October 7 and the Gaza war show attributed, multi-source casualty figures', async ({ page }) => {
  const cases = [
    { date: '2023-10-07', idPrefix: '2023-10-07' },
    { date: '2024-08-31', idPrefix: null },
  ];
  for (const c of cases) {
    await setDate(page, c.date);
    await ensurePanelExpanded(page);
    const items = page.getByTestId('event-list-item');
    await expect(items.first()).toBeVisible();
    let picked = items.first();
    if (c.idPrefix) {
      picked = page.locator(`[data-testid="event-list-item"][data-event-id^="${c.idPrefix}"]`).first();
    } else {
      // The Gaza war: pick the event in this chapter with the most casualty rows.
      const best = await page.evaluate(() => {
        const s = window.__mideast!.getState();
        return s.activeChapterId;
      });
      expect(best).toBe('october-7-gaza-war');
      picked = page.locator('[data-testid="event-list-item"][data-has-casualties="true"]').first();
    }
    await expect(picked).toBeVisible();
    await picked.click();
    await expect(page.getByTestId('detail-panel')).toBeVisible();
    const rows = page.getByTestId('casualties').locator('tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(2);
    const attributions = await rows.locator('td:nth-child(3)').allTextContents();
    expect(new Set(attributions.map((a) => a.trim())).size).toBeGreaterThanOrEqual(2);
    const links = page.getByTestId('sources').locator('a[href^="http"]');
    expect(await links.count()).toBeGreaterThanOrEqual(2);
    await page.getByTestId('detail-back').click();
  }
});
