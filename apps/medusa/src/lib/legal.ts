/**
 * The withdrawal notice shown at payment (FR-030 / T064). The VERSION is what gets
 * frozen onto every order line (withdrawal_notice_version) — bump it whenever the text
 * meaningfully changes, so "which notice did this buyer see" stays provable. The
 * default texts can be overridden by a content page with slug `withdrawal-notice`.
 */
export const WITHDRAWAL_NOTICE_VERSION = 'v1'

export const WITHDRAWAL_NOTICE_TEXT: Record<'pl' | 'en' | 'uk', { title: string; body: string }> = {
  pl: {
    title: 'Prawo odstąpienia od umowy',
    body:
      'Produkty personalizowane (ze zdjęciem lub imieniem) są wykonywane na indywidualne ' +
      'zamówienie i nie podlegają zwrotowi w ramach 14-dniowego prawa odstąpienia ' +
      '(art. 38 pkt 3 ustawy o prawach konsumenta). Pozycje standardowe zachowują pełne ' +
      'prawo zwrotu. Niezależnie od tego przysługuje Ci rękojmia za wady produktu.',
  },
  en: {
    title: 'Right of withdrawal',
    body:
      'Personalized items (with a photo or a name) are made to order and are excluded ' +
      'from the 14-day right of withdrawal (art. 38(3) of the Polish Consumer Rights Act). ' +
      'Standard items keep the full right of return. Statutory warranty for defects applies ' +
      'regardless.',
  },
  uk: {
    title: 'Право відмови від договору',
    body:
      'Персоналізовані товари (з фото або імʼям) виготовляються на індивідуальне замовлення ' +
      'і не підлягають поверненню в межах 14-денного права відмови (art. 38 pkt 3 польського ' +
      'закону про права споживача). Стандартні позиції зберігають повне право повернення. ' +
      'Гарантія за дефекти діє незалежно від цього.',
  },
}
