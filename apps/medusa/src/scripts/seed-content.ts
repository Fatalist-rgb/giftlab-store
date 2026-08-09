import { ExecArgs } from '@medusajs/framework/types'
import { CONTENT_MODULE } from '../modules/content'
import type ContentModuleService from '../modules/content/service'

/**
 * Polish base of the legal / info pages (FR-036), written for this shop's actual model
 * (personalised acrylic figurines, single size, courier delivery) and carrying the
 * seller's real registration data. Complete enough for the payment operator's site
 * review — still worth a lawyer's sign-off before launch. Editable afterwards in
 * admin → Treści. Idempotent (upsert per slug). Run with:
 *   npx medusa exec ./src/scripts/seed-content.ts
 */

/**
 * The seller identity block. One constant, used by every page, so the shop can never
 * state two different addresses.
 *
 * The court, KRS number, NIP and share capital are not decoration: art. 206 § 1 of the
 * Polish Commercial Companies Code requires a sp. z o.o. to carry all of them on its
 * website. Verified against the Ministry of Justice KRS register (state of 07.07.2026).
 */
const SELLER = `**GKR-GROUP sp. z o.o.**
ul. Paprotna 8B, 51-117 Wrocław, woj. dolnośląskie, Polska
KRS 0000551761 — Sąd Rejonowy dla Wrocławia-Fabrycznej we Wrocławiu,
VI Wydział Gospodarczy Krajowego Rejestru Sądowego
NIP 8133703087 · REGON 361194800 · kapitał zakładowy 20 000,00 zł
e-mail: mavorashop2026@gmail.com · tel. +48 531 083 838`

/** Where a customer sends a return or a complaint — same site as the workshop. */
const RETURN_ADDRESS = `GKR-GROUP sp. z o.o., ul. Paprotna 8B, 51-117 Wrocław`

const SHOP_EMAIL = 'mavorashop2026@gmail.com'
const SHOP_URL = 'https://mavorashop.eu'
/** The day these terms take effect — the date the shop published this version. */
const TERMS_DATE = '9 sierpnia 2026 r.'

const REGULAMIN = `# Regulamin sklepu

Sklep internetowy mavorashop, dostępny pod adresem ${SHOP_URL}, prowadzi:

${SELLER}

## §1. Postanowienia ogólne

1. Regulamin określa zasady sprzedaży personalizowanych figurek akrylowych oraz
   towarzyszących im usług świadczonych drogą elektroniczną.
2. Ceny podane w sklepie są cenami brutto w złotych polskich (PLN) i nie zawierają
   kosztów dostawy, które są wskazywane przed złożeniem zamówienia.
3. Do korzystania ze sklepu wystarczy urządzenie z aktualną przeglądarką internetową
   i dostępem do internetu. Konfigurator wymaga włączonej obsługi JavaScript.

## §2. Produkt i personalizacja

1. Produktem jest figurka akrylowa o wysokości ok. 11 cm z wbudowanym magnesem,
   wykonywana na podstawie konfiguracji wybranej przez Klienta: wariantu postaci,
   przesłanego zdjęcia twarzy oraz opcjonalnego imienia.
2. Przed dodaniem do koszyka Klient widzi **podgląd na żywo** odwzorowujący plik
   produkcyjny. Sprzedawca drukuje dokładnie zatwierdzoną konfigurację.
3. Zdjęcie powinno przedstawiać **jedną osobę**, twarz w dobrym świetle. System
   ostrzega o zbyt niskiej rozdzielczości; ostateczną decyzję o zamówieniu
   podejmuje Klient.
4. Klient oświadcza, że posiada prawa do przesłanego zdjęcia oraz zgodę osób na nim
   przedstawionych na wykonanie produktu.
5. Sprzedawca może odmówić realizacji zamówienia, którego treść jest bezprawna,
   obraźliwa lub narusza prawa osób trzecich; opłata jest wtedy zwracana w całości.

## §3. Składanie zamówienia i zawarcie umowy

1. Zamówienie składa się przez konfigurator, koszyk i formularz zamówienia; nie jest
   wymagane zakładanie konta.
2. Cena jednostkowa zależy wyłącznie od łącznej liczby zamawianych figurek (rabat
   ilościowy). Wszystkie opcje personalizacji są bezpłatne.
3. Umowa zostaje zawarta z chwilą potwierdzenia przyjęcia zamówienia przesłanego na
   adres e-mail Klienta.
4. Klient może zamówić figurkę bez zdjęcia („prześlę zdjęcie później") — produkcja
   rusza po dosłaniu zdjęcia przez stronę statusu zamówienia.

## §4. Płatności

1. Dostępne metody płatności: BLIK, szybki przelew online i karta płatnicza,
   obsługiwane przez operatora płatności Przelewy24 — PayPro S.A. z siedzibą
   w Poznaniu, ul. Pastelowa 8, 60-198 Poznań, wpisaną do rejestru krajowych
   instytucji płatniczych prowadzonego przez Komisję Nadzoru Finansowego.
2. Zamówienie jest kierowane do produkcji po zaksięgowaniu płatności.
3. Do każdego zamówienia wystawiany jest dokument sprzedaży przesyłany elektronicznie.

## §5. Realizacja i dostawa

1. Czas produkcji: 2–4 dni robocze od zaksięgowania płatności (dla zamówień ze zdjęciem
   dosyłanym później — od momentu przesłania zdjęcia).
2. Dostawa kurierem na terenie Polski: 1–2 dni robocze, koszt wskazany w koszyku.
3. Przewidywane okno dostawy jest prezentowane przed złożeniem zamówienia.

## §6. Prawo odstąpienia od umowy

1. Konsument oraz przedsiębiorca na prawach konsumenta może odstąpić od umowy zawartej
   na odległość w terminie 14 dni bez podania przyczyny.
2. **Wyłączenie:** prawo odstąpienia nie przysługuje w odniesieniu do produktów
   personalizowanych — wykonanych według specyfikacji Klienta (zdjęcie i/lub imię) —
   zgodnie z art. 38 pkt 3 ustawy o prawach konsumenta. Informacja o tym jest
   prezentowana przed złożeniem zamówienia i wymaga potwierdzenia.
3. Pozycje niespersonalizowane zachowują pełne prawo odstąpienia. Oświadczenie można
   złożyć e-mailem na adres ${SHOP_EMAIL}; zwrot płatności następuje w terminie 14 dni.
4. Adres do zwrotów: ${RETURN_ADDRESS}.

## §7. Reklamacje i gwarancja jakości

1. Sprzedawca odpowiada za zgodność towaru z umową na zasadach ustawy o prawach
   konsumenta (rozdział 5a).
2. Reklamacje przyjmowane są e-mailem na adres ${SHOP_EMAIL}; sprzedawca ustosunkuje
   się do reklamacji w terminie 14 dni.
3. Niezależnie od uprawnień ustawowych: w razie wady produkcyjnej sprzedawca wykonuje
   figurkę ponownie albo zwraca zapłaconą kwotę, bez kosztów odsyłki po stronie Klienta.

## §8. Opinie klientów

1. Opinie publikowane są po moderacji (spam, treści bezprawne). Treść i ocena nie są
   modyfikowane.
2. Oznaczenie „zweryfikowany zakup" otrzymują wyłącznie opinie, których autor podał
   numer zamówienia i adres e-mail zgodne z bazą zamówień tego produktu.

## §9. Dane osobowe

Zasady przetwarzania danych, w tym przesyłanych zdjęć, opisuje Polityka prywatności.

## §10. Postanowienia końcowe

1. W sprawach nieuregulowanych stosuje się przepisy prawa polskiego.
2. Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji,
   w tym z platformy ODR: https://ec.europa.eu/consumers/odr
3. Regulamin obowiązuje od dnia ${TERMS_DATE} Zmiany nie naruszają praw
   nabytych z zamówień złożonych przed zmianą.`

const PRIVACY = `# Polityka prywatności

## Administrator danych

Administratorem danych osobowych jest: ${SELLER}

## Jakie dane przetwarzamy i w jakim celu

| Dane | Cel | Podstawa prawna | Okres |
|---|---|---|---|
| Imię, nazwisko, adres, e-mail, telefon | realizacja zamówienia i dostawa | art. 6 ust. 1 lit. b RODO (umowa) | okres realizacji + przedawnienie roszczeń |
| Zdjęcie przesłane do konfiguratora | wykonanie personalizowanego produktu | art. 6 ust. 1 lit. b RODO; wizerunek — zgoda przy przesłaniu | **60 dni** od zamówienia, następnie automatyczne usunięcie |
| Dane rozliczeniowe | obowiązki podatkowe | art. 6 ust. 1 lit. c RODO | 5 lat podatkowych |
| Dane opinii (imię, treść, ocena) | publikacja opinii | zgoda | do wycofania zgody |
| Dane techniczne (logi, zgody cookie) | bezpieczeństwo i zgodność | art. 6 ust. 1 lit. f RODO | do 12 miesięcy |

## Zdjęcia klientów

1. Usunięcie tła odbywa się **na urządzeniu Klienta** — do sprzedawcy trafia zdjęcie
   już przygotowane do produkcji wraz z oryginałem potrzebnym do wydruku.
2. Pliki przechowywane są w infrastrukturze w **Unii Europejskiej**; metadane
   (EXIF/GPS) są usuwane przy zapisie.
3. Po 60 dniach pliki są kasowane automatycznie. Wcześniejsze usunięcie na żądanie:
   wystarczy e-mail z numerem zamówienia.

## Odbiorcy danych

Dostawcy niezbędni do realizacji zamówienia: firma kurierska, operator płatności,
dostawcy hostingu i przechowywania plików (UE), dostawca poczty e-mail. Podmioty te
przetwarzają dane na podstawie umów powierzenia.

## Prawa osób, których dane dotyczą

Prawo dostępu, sprostowania, usunięcia, ograniczenia, przenoszenia, sprzeciwu oraz
cofnięcia zgody w dowolnym momencie (bez wpływu na zgodność z prawem wcześniejszego
przetwarzania). Zgłoszenia: ${SHOP_EMAIL}.
Przysługuje również skarga do Prezesa Urzędu Ochrony Danych Osobowych
(ul. Stawki 2, 00-193 Warszawa).

## Pliki cookies

Zasady opisuje Polityka cookies. Analityka i marketing uruchamiane są wyłącznie po
wyrażeniu zgody; brak zgody nie ogranicza możliwości zakupu.`

const COOKIES = `# Polityka cookies

## Rodzaje plików

1. **Niezbędne** — koszyk, sesja zamówienia, zapamiętanie wyboru zgód. Działają zawsze,
   bez nich sklep nie funkcjonuje.
2. **Analityczne** — anonimowa statystyka odwiedzin, uruchamiane **tylko po zgodzie**.
3. **Marketingowe** — pomiar skuteczności reklam, uruchamiane **tylko po zgodzie**.

## Zgoda

Przy pierwszej wizycie wyświetlamy baner z równorzędnymi przyciskami „Tylko niezbędne"
i „Akceptuję wszystkie" oraz ustawieniami szczegółowymi. Do czasu decyzji nie ładujemy
żadnych skryptów analitycznych ani marketingowych.

## Zmiana lub wycofanie zgody

Wyboru można zmienić w każdej chwili — link „Cookies" w stopce sklepu — oraz przez
usunięcie plików cookies w ustawieniach przeglądarki.`

const ZWROTY = `# Zwroty i reklamacje

## Produkty personalizowane

Figurka ze zdjęciem lub imieniem powstaje wyłącznie na indywidualne zamówienie, dlatego
**nie podlega 14-dniowemu prawu odstąpienia** (art. 38 pkt 3 ustawy o prawach
konsumenta). Informujemy o tym przed zakupem i prosimy o potwierdzenie.

W zamian dajemy realne zabezpieczenie:
- widzisz **dokładny podgląd** przed produkcją i to on trafia do druku,
- wada produkcyjna = **nowa figurka albo zwrot pieniędzy**,
- reklamacja bez odsyłania towaru na Twój koszt.

## Produkty niespersonalizowane

Zachowują pełne prawo odstąpienia w terminie 14 dni. Wystarczy oświadczenie e-mailem
z numerem zamówienia; zwrot płatności następuje w ciągu 14 dni od otrzymania zwrotu.

## Reklamacja — jak zgłosić

1. Napisz na ${SHOP_EMAIL} i podaj numer zamówienia.
2. Dołącz zdjęcie wady — zwykle wystarcza do rozpatrzenia.
3. Odpowiadamy w ciągu 14 dni i uzgadniamy sposób załatwienia sprawy.

## Adres do zwrotów

${RETURN_ADDRESS}

Przed odesłaniem czegokolwiek napisz do nas — przy wadzie jakościowej zwykle nie
trzeba nic odsyłać.

## Uszkodzenie w transporcie

Zgłoś w ciągu 7 dni od odbioru — wykonujemy figurkę ponownie na nasz koszt.`

const DOSTAWA = `# Dostawa

## Terminy

| Etap | Czas |
|---|---|
| Produkcja | 2–4 dni robocze od zaksięgowania płatności |
| Kurier (Polska) | 1–2 dni robocze |

Zamówienia ze zdjęciem dosyłanym później wchodzą do produkcji dopiero po przesłaniu
zdjęcia przez stronę statusu zamówienia (link jest w e-mailu potwierdzającym).

## Koszt i sposób

| Sposób | Koszt |
|---|---|
| Kurier (cała Polska) | 15,99 zł |

Koszt dostawy widoczny jest w koszyku przed złożeniem zamówienia; przewidywane okno
dostawy pokazujemy przy podsumowaniu. Wysyłamy wyłącznie na terenie Polski.

## Śledzenie

Status produkcji sprawdzisz na stronie zamówienia; numer przesyłki wysyłamy e-mailem
w momencie nadania.`

const KONTAKT = `# Kontakt

${SELLER}

**Obsługa zamówień:** ${SHOP_EMAIL}
**Telefon:** +48 531 083 838
**Godziny pracy:** pn.–pt. 9:00–17:00
**Adres do zwrotów i reklamacji:** ${RETURN_ADDRESS}

Odpowiadamy zwykle w ciągu jednego dnia roboczego. Przy pytaniach o zamówienie podaj
jego numer — przyspieszy to sprawę.`

const WITHDRAWAL_NOTICE = `Produkty personalizowane (ze zdjęciem lub imieniem) są wykonywane na indywidualne
zamówienie i zgodnie z art. 38 pkt 3 ustawy o prawach konsumenta nie podlegają
14-dniowemu prawu odstąpienia. Pozycje standardowe zachowują pełne prawo zwrotu.
Wady produkcyjne naprawiamy zawsze: nowa figurka albo zwrot pieniędzy.`

const PAGES: Array<{ slug: string; title: string; body: string; meta_title: string; meta_description: string }> = [
  {
    slug: 'regulamin',
    title: 'Regulamin',
    body: REGULAMIN,
    meta_title: 'Regulamin sklepu',
    meta_description: 'Zasady sprzedaży personalizowanych figurek akrylowych, płatności, dostawy i reklamacji.',
  },
  {
    slug: 'privacy',
    title: 'Polityka prywatności',
    body: PRIVACY,
    meta_title: 'Polityka prywatności',
    meta_description: 'Jak przetwarzamy dane osobowe i przesyłane zdjęcia (RODO), jak długo je przechowujemy.',
  },
  {
    slug: 'cookies',
    title: 'Polityka cookies',
    body: COOKIES,
    meta_title: 'Polityka cookies',
    meta_description: 'Jakich plików cookies używamy i jak zarządzać zgodą.',
  },
  {
    slug: 'zwroty',
    title: 'Zwroty i reklamacje',
    body: ZWROTY,
    meta_title: 'Zwroty i reklamacje',
    meta_description: 'Prawo odstąpienia, wyłączenie dla produktów personalizowanych i nasza gwarancja jakości.',
  },
  {
    slug: 'dostawa',
    title: 'Dostawa',
    body: DOSTAWA,
    meta_title: 'Dostawa',
    meta_description: 'Terminy produkcji i wysyłki, koszt dostawy, śledzenie zamówienia.',
  },
  {
    slug: 'kontakt',
    title: 'Kontakt',
    body: KONTAKT,
    meta_title: 'Kontakt',
    meta_description: 'Dane kontaktowe sprzedawcy i obsługi zamówień.',
  },
  {
    slug: 'withdrawal-notice',
    title: 'Informacja o prawie odstąpienia',
    body: WITHDRAWAL_NOTICE,
    meta_title: 'Informacja o prawie odstąpienia',
    meta_description: 'Wyłączenie prawa odstąpienia dla produktów personalizowanych (art. 38 pkt 3 UPK).',
  },
]

export default async function ({ container }: ExecArgs) {
  const svc: ContentModuleService = container.resolve(CONTENT_MODULE)
  for (const p of PAGES) {
    await svc.upsertPage({
      slug: p.slug,
      locale: 'pl',
      title: p.title,
      body: p.body,
      meta_title: p.meta_title,
      meta_description: p.meta_description,
    })
  }
  const all = await svc.listContentPages({ locale: 'pl' })
  console.log(`seeded/updated ${PAGES.length} PL pages; total PL pages now: ${all.length}`)
  console.log('slugs:', all.map((x) => x.slug).sort().join(', '))
  const todo = PAGES.filter((p) => p.body.includes('DO UZUPEŁNIENIA')).map((p) => p.slug)
  if (todo.length) console.log('still needs the seller data:', todo.join(', '))
}
