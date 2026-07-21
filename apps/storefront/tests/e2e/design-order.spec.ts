import { expect, test, type Page } from '@playwright/test';

/**
 * The buyer's journey in a real browser (T030): constructor → sample face → name →
 * quantity → add to cart → cart page (withdrawal notice beside the pay button, T059)
 * → checkout form → confirmation. The /api/gl endpoints are mocked — the full-stack
 * path is covered separately by backend contract tests; here the UI contract is pinned.
 */

const CART = {
  id: 'cart_e2e',
  email: null,
  currency: 'pln',
  itemTotal: 158,
  total: 158,
  completed: false,
  items: [
    { id: 'li_e2e', title: 'Figurka z brzuszkiem', quantity: 2, unitPrice: 79, total: 158, designId: 'des_e2e' },
  ],
};

async function mockApi(page: Page) {
  await page.route('**/api/gl/add-to-cart', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ designId: 'des_e2e', cartId: 'cart_e2e', totalQuantity: 2, ladderUnitGrosz: 7900 }),
    }),
  );
  await page.route('**/api/gl/cart*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CART) }),
  );
  await page.route('**/api/gl/checkout', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ orderId: 'order_e2e', displayId: 42, total: 173.99, currency: 'pln', email: 'e2e@test.pl' }),
    }),
  );
  await page.route('**/api/gl/consent', (route) =>
    route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
  );
}

test('design → cart → checkout → confirmation', async ({ page }) => {
  await mockApi(page);

  // constructor
  await page.goto('/pl/product');
  await page.getByTestId('consent-necessary').click();

  // pick a different character variant + sample face + name + quantity 2
  await page.getByRole('button', { name: /różowy/i }).click();
  await page.getByRole('button', { name: /wstaw przykładową|przykładow/i }).click();
  await page.getByPlaceholder(/np\.|imię/i).fill('Zosia');
  await page.getByRole('button', { name: '+', exact: true }).click();

  // live preview canvas rendered
  await expect(page.locator('canvas')).toBeVisible();

  // price reflects qty 2 at base tier (2 × 79)
  await expect(page.getByTestId('total-price')).toContainText('158');

  // add to cart → success + link to the cart
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('added-ok')).toBeVisible();
  await page.getByRole('link', { name: /koszyka/i }).click();

  // cart page: line, totals, withdrawal notice NEXT TO the pay button (T059/FR-030)
  await expect(page).toHaveURL(/\/pl\/cart/);
  await expect(page.getByText('Figurka z brzuszkiem')).toBeVisible();
  const notice = page.getByTestId('withdrawal-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('art. 38 pkt 3');
  const placeOrder = page.getByTestId('place-order');
  await expect(placeOrder).toBeVisible();

  // checkout form → mocked order
  await page.getByTestId('email').fill('e2e@test.pl');
  await page.getByPlaceholder('Imię').fill('Zosia');
  await page.getByPlaceholder('Nazwisko').fill('Testowa');
  await page.getByPlaceholder(/ulica/i).fill('ul. Testowa 1');
  await page.getByPlaceholder(/kod/i).fill('00-001');
  await page.getByPlaceholder(/miasto/i).fill('Warszawa');
  await placeOrder.click();

  // confirmation with the order number
  await expect(page.getByTestId('order-ok')).toBeVisible();
  await expect(page.getByTestId('order-ok')).toContainText('42');
});
