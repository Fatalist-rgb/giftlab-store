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
    { id: 'li_e2e', title: 'Figurka z brzuszkiem', quantity: 2, unitPrice: 79, total: 158, designId: 'des_e2e', pose: 'stoi', printedName: 'Zosia' },
  ],
};

const ORDER_STATUS = {
  orderId: 'order_e2e',
  displayId: 42,
  email: 'e2e@test.pl',
  currency: 'pln',
  itemTotal: 158,
  shippingTotal: 15.99,
  total: 173.99,
  shippingName: 'Dostawa kurierem',
  lines: [
    {
      lineItemId: 'li_e2e', title: 'Figurka z brzuszkiem', quantity: 2, unitPrice: 79, total: 158,
      pose: 'stoi', printedName: 'Zosia', renderStatus: 'queued', needsPhoto: false,
    },
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
  await page.route('**/api/gl/order-status*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ORDER_STATUS) }),
  );
  await page.route('**/api/gl/delivery-estimate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ from: '2026-08-14T00:00:00Z', to: '2026-08-20T00:00:00Z' }),
    }),
  );
}

test('design → cart → checkout → confirmation', async ({ page }) => {
  await mockApi(page);

  // constructor
  await page.goto('/pl/product');
  await page.getByTestId('consent-necessary').click();

  // step 1: character — the grouped picker: pick the second pose card, then check the
  // drink row appears for a pose that offers drinks and maps to the right variant
  await page.getByTestId('variant-kieszen').click();
  await page.getByTestId('variant-stoi').click();
  await expect(page.getByTestId('drink-row')).toBeVisible();
  await page.getByTestId('drink-piwo').click();
  // step 2: photo (sample face)
  await page.getByTestId('step-photo').click();
  await page.getByRole('button', { name: /wstaw przykładową|przykładow/i }).click();
  // step 3: name
  await page.getByTestId('step-name').click();
  await page.getByPlaceholder(/np\.|imię/i).fill('Zosia');
  // step 4: quantity 2 — the stepper IS the figurine list (demo model), so the
  // switcher appears and the second figurine inherits the first one's pose
  await page.getByTestId('step-quantity').click();
  await page.getByTestId('qty-plus').click();
  await expect(page.getByTestId('fig-switch')).toBeVisible();
  await expect(page.getByTestId('fig-1')).toBeVisible();

  // live preview canvas rendered; steps show completion marks
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.getByTestId('step-photo')).toContainText('✓');

  // price reflects qty 2 at base tier (2 × 79)
  await expect(page.getByTestId('total-price')).toContainText('158');

  // a THIRD figurine → the ladder tier flips: 65 zł each, middle tile lit
  await page.getByTestId('qty-plus').click();
  await expect(page.getByTestId('unit-price')).toContainText('65');
  await expect(page.getByTestId('total-price')).toContainText('195');
  // back to two for the rest of the flow
  await page.getByTestId('qty-minus').click();
  await expect(page.getByTestId('total-price')).toContainText('158');

  // add to cart: the price rides on the button; the toast confirms and links to the cart
  await expect(page.getByTestId('add-to-cart')).toContainText('158');
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('added-ok')).toBeVisible();
  await page.getByTestId('added-ok').getByRole('link').click();

  // cart page: line with the configured pose + name, cart total includes the courier
  await expect(page).toHaveURL(/\/pl\/cart/);
  await expect(page.getByText('Personalizowana figurka').first()).toBeVisible();
  await expect(page.getByText('Imię: Zosia').first()).toBeVisible();
  await expect(page.getByTestId('cart-total')).toContainText('173,99');

  // → checkout (its own page, as designed)
  await page.getByTestId('go-checkout').click();
  await expect(page).toHaveURL(/\/pl\/checkout/);

  // withdrawal notice NEXT TO the pay button (T059/FR-030)
  const notice = page.getByTestId('withdrawal-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('art. 38');
  const placeOrder = page.getByTestId('place-order');
  await expect(placeOrder).toBeVisible();

  // checkout form: address, both required consents, pay → mocked order
  await page.getByTestId('co-name').fill('Zosia Testowa');
  await page.getByTestId('email').fill('e2e@test.pl');
  await page.getByTestId('co-street').fill('ul. Testowa 1');
  await page.getByTestId('co-zip').fill('00001');
  await page.getByTestId('co-city').fill('Warszawa');

  // the pay button without consents must NOT submit — the hint appears instead
  await placeOrder.click();
  await expect(page.getByText(/wymagane zgody/i)).toBeVisible();
  await page.getByTestId('c-terms').click({ force: true });
  await page.getByTestId('c-priv').click({ force: true });
  await placeOrder.click();

  // confirmation page with the order number and the receipt
  await expect(page).toHaveURL(/\/pl\/order\/order_e2e/);
  await expect(page.getByTestId('order-ok')).toBeVisible();
  await expect(page.getByTestId('order-ok')).toContainText('42');
  await expect(page.getByText('Zamówienie przyjęte')).toBeVisible();
  await expect(page.getByText('173,99')).toBeVisible();
});
