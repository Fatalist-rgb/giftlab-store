# Przelewy24 — uruchomienie płatności

Moduł jest gotowy w kodzie i **rejestruje się dopiero wtedy, gdy w środowisku są dane
merchanta**. Do tego czasu sklep działa na domyślnym providerze (zamówienia testowe),
więc wgranie zmiennych jest jedyną operacją potrzebną do włączenia płatności.

## 1. Zmienne środowiskowe (Railway → serwis `backend`)

| Zmienna | Skąd | Uwagi |
|---|---|---|
| `P24_MERCHANT_ID` | panel P24 | liczba |
| `P24_POS_ID` | panel P24 | zwykle równe `P24_MERCHANT_ID`; można pominąć |
| `P24_CRC` | panel P24 → Moje dane → Klucz CRC | **inny dla sandboxa i produkcji** |
| `P24_API_KEY` | panel P24 → klucz do raportów (API) | używany jako hasło Basic Auth |
| `P24_SANDBOX` | `true` na testy, `false` na produkcję | domyślnie `true` |
| `BACKEND_PUBLIC_URL` | publiczny adres backendu | z niego budowany jest `urlStatus` |
| `SITE_URL` | publiczny adres sklepu | z niego budowany jest `urlReturn` |

W panelu P24 trzeba jeszcze **dodać adres IP / domenę serwera** do listy dozwolonych
oraz włączyć metody: BLIK, przelewy online, karty.

## 2. Adresy, które wpisuje P24

- `urlStatus` (notyfikacja): `{BACKEND_PUBLIC_URL}/hooks/payment/przelewy24_przelewy24`
- `urlReturn` (powrót klienta): `{SITE_URL}/pl/checkout/return`

Oba są wysyłane w żądaniu rejestracji transakcji — nie trzeba ich konfigurować ręcznie
w panelu, ale muszą być publicznie osiągalne (Railway/Vercel są).

## 3. Test w sandboxie (przed produkcją)

1. Ustaw dane sandboxa i `P24_SANDBOX=true`, zrób redeploy.
2. Złóż zamówienie w sklepie — po kliknięciu „Zamawiam i płacę" powinno nastąpić
   przekierowanie na `sandbox.przelewy24.pl`.
3. Zapłać testowo. P24 wyśle notyfikację na `urlStatus`; w logach backendu pojawi się
   `[p24] payment verified for …`.
4. Klient wraca na `/pl/checkout/return`, zamówienie zostaje utworzone i rusza render.
5. Sprawdź w panelu admina, że zamówienie ma opłaconą płatność i plik produkcyjny.

Dopiero po udanym teście zmień dane na produkcyjne i `P24_SANDBOX=false`.

## Jak to działa w kodzie

- `lib/sign.ts` — sumy kontrolne SHA-384 (rejestracja / weryfikacja / notyfikacja).
  Zestawy pól różnią się per operacja — pilnują tego testy `__tests__/sign.unit.spec.ts`.
- `lib/client.ts` — REST v1: `POST /transaction/register`, `PUT /transaction/verify`,
  `GET /testAccess`; Basic Auth `posId:apiKey`; kwoty w groszach.
- `service.ts` — provider Medusy. Płatność uznajemy za dokonaną **wyłącznie** po
  poprawnej notyfikacji + potwierdzeniu przez `verify`; sam powrót klienta niczego nie
  przesądza.
- Zwroty przez API wymagają osobnej umowy z P24 — `refundPayment` celowo rzuca błąd,
  żeby nikt nie uznał zwrotu za wykonany. Zwroty robimy w panelu P24.
