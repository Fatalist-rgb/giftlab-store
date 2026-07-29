# Przewodnik administratora sklepu (GiftLab)

Panel administracyjny: `https://backend-production-8e23.up.railway.app/app`
(po podpięciu domeny adres się zmieni). Logowanie: e-mail + hasło administratora.

**Język panelu:** Settings → Profile → Edit → *Language*. Dostępne m.in. **Polski**,
**Українська** i English — wybór zapamiętuje się dla danego konta i tłumaczy zarówno
panel Medusy, jak i nasze ekrany (Produkcja / Opinie / Treści oraz widgety). Wersja
ukraińska przewodnika: [admin-guide.uk.md](./admin-guide.uk.md).

## Codzienna praca z zamówieniami

1. **Orders** — standardowa lista zamówień Medusa. Na stronie zamówienia panel
   **„Personalizacja (GiftLab)"** pokazuje dla każdej linii:
   - wybrany projekt (wariant, imię, ilość, status zdjęcia),
   - prawo odstąpienia: *bez prawa zwrotu (art. 38 pkt 3)* dla personalizowanych,
     *zwrot 14 dni* dla standardowych — obliczone i zamrożone w momencie zakupu,
   - status pliku produkcyjnego i przyciski **Druk (PNG) / Cięcie (SVG) / Spec (JSON)** —
     linki są podpisane i ważne 15 minut.
2. **Produkcja** (menu boczne) — problemy: linie z błędem renderu, zablokowane
   i czekające na zdjęcie klienta. Przycisk **„Ponów render"** ponawia generowanie pliku.
   Przycisk **„Eksport CSV"** pobiera zestawienie do Excela (średnik, polskie znaki OK).
3. Plik produkcyjny generuje się **automatycznie ~8 sekund po opłaceniu** zamówienia.
   Gdy klient wybrał „wyślę zdjęcie później", linia czeka jako *czeka na zdjęcie* i ruszy
   sama po dograniu zdjęcia przez klienta.

## Opinie

**Opinie** (menu boczne) — kolejka moderacji. Każda opinia czeka na decyzję:
**Publikuj / Odrzuć**. Znaczek *zweryfikowany zakup* nadaje system — tylko gdy numer
zamówienia, e-mail i produkt zgadzają się z bazą; ręcznie nie da się go nadać.

## Treści stron (regulamin, polityki, kontakt)

**Treści** (menu boczne) — edycja stron: `regulamin`, `privacy`, `cookies`, `zwroty`,
`dostawa`, `kontakt` oraz `withdrawal-notice` (treść informacji o prawie odstąpienia
pokazywanej przy płatności). Zmiany widać w sklepie do kilku minut (cache).
Polski jest wersją bazową; EN/UK spadają na polski, dopóki nie zostaną przetłumaczone.

## Produkt i cennik (schemat konstruktora)

Schemat konstruktora (warianty postaci, strefa twarzy, pola tekstu, **drabinka cen**)
publikuje się przez API administracyjne (`POST /admin/gl/products/:id/schema`).
Kluczowe zasady, które system wymusza automatycznie:

- **Darmowy wybór domyślny** — schemat, w którym domyślna konfiguracja kosztuje więcej
  niż cena bazowa, zostanie odrzucony (422). To wymóg prawa konsumenckiego, nie opcja.
- Każda publikacja tworzy **nową, niezmienną wersję** (stare zamówienia zostają
  odtwarzalne), a cena bazowa zapisuje się do **historii cen Omnibus** (najniższa cena
  z 30 dni przed obniżką musi być możliwa do pokazania).

## Katalog (kategorie i produkty)

Sklep ma cztery kategorie: **Mama i ciąża** (flagowa figurka z brzuszkiem), **Dzieci**
(Figurka Superbohater), **Zwierzaki** (Figurka Pupil) i **Święta i okazje** (Figurka
Świąteczna). Strona `/catalog` buduje się sama z aktywnych kategorii — pokazuje tylko
produkty, które mają **opublikowany schemat konstruktora** (bez schematu produkt nie
jest zamawialny i nie wyświetla się).

- Nowy produkt = produkt w Medusa (kategoria, kanał sprzedaży, profil wysyłki)
  **plus** opublikowany schemat. Wzorzec: `apps/medusa/src/scripts/seed-categories.ts`.
- Grafiki wariantów to pliki `art/*.png` — obecne są rysunkami poglądowymi do
  podmiany na docelowe ilustracje (te same nazwy plików, format PNG 304×424).
- Koszyk obsługuje **jeden typ produktu naraz**: gdy klient przełączy się na inny
  produkt i doda go do koszyka, poprzednie pozycje innego typu są usuwane, a cena
  liczy się od łącznej liczby sztuk nowego zestawu.

## Lejek konstruktora

Na liście zamówień u góry widget **„Lejek konstruktora (30 dni)"**: ile projektów
dodano do koszyka, jaki odsetek z personalizacją, ile linii opłacono i konwersja.
Liczone z własnej bazy — działa niezależnie od zgód na analitykę.

## Zdjęcia klientów (RODO)

- Zdjęcia trafiają do Cloudflare R2 w **jurysdykcji UE**; tło jest usuwane na
  urządzeniu klienta, oryginał normalizowany (EXIF/GPS usunięte).
- Zgoda na przetwarzanie jest zapisywana przy każdym zdjęciu; retencja: **60 dni**,
  po czym nocny job usuwa pliki i czyści rekord.
