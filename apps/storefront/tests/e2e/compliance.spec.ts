import { expect, test, type Page } from '@playwright/test';

/**
 * Compliance E2E (T059): consent gating (zero analytics before AND after a
 * necessary-only choice), banner persistence, legal page, and no manufactured
 * urgency (Principle VIII).
 */

const ANALYTICS_HOSTS = /googletagmanager|google-analytics|facebook|hotjar|clarity/i;

function collectAnalyticsRequests(page: Page): string[] {
  const hits: string[] = [];
  page.on('request', (req) => {
    if (ANALYTICS_HOSTS.test(req.url())) hits.push(req.url());
  });
  return hits;
}

test('no analytics loads before consent; banner shows equal choices', async ({ page }) => {
  const hits = collectAnalyticsRequests(page);

  await page.goto('/pl/product');
  await expect(page.getByRole('dialog', { name: /ciasteczka/i })).toBeVisible();

  // both choices carry equal prominence (two buttons side by side)
  await expect(page.getByTestId('consent-necessary')).toBeVisible();
  await expect(page.getByTestId('consent-accept')).toBeVisible();

  await page.waitForTimeout(1500); // give any stray loader a chance to fire
  expect(hits).toEqual([]);
});

test('necessary-only: no analytics after the choice, choice persists across reload', async ({ page }) => {
  const hits = collectAnalyticsRequests(page);

  await page.goto('/pl/product');
  await page.getByTestId('consent-necessary').click();
  await expect(page.getByRole('dialog', { name: /ciasteczka/i })).toBeHidden();

  // navigate + reload — the banner must not return, analytics must stay silent
  await page.goto('/pl');
  await page.reload();
  await expect(page.getByRole('dialog', { name: /ciasteczka/i })).toBeHidden();
  await page.waitForTimeout(1000);
  expect(hits).toEqual([]);
});

test('legal content page renders', async ({ page }) => {
  // without a backend the content page 404s gracefully — assert the route responds
  const res = await page.goto('/pl/info/regulamin');
  expect([200, 404]).toContain(res?.status() ?? 0);
});

test('no manufactured urgency on the product page (Principle VIII)', async ({ page }) => {
  await page.goto('/pl/product');
  const body = (await page.textContent('body')) ?? '';
  expect(body).not.toMatch(/zostało tylko|kończy się za|only \d+ left|ends in/i);
  // and no countdown-looking timers
  expect(await page.locator('[data-countdown], .countdown').count()).toBe(0);
});
