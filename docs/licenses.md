# Licencje czcionek i grafik (T076)

| Zasób | Licencja | Zakres użycia | Źródło |
|---|---|---|---|
| Bricolage Grotesque (TTF, wariable) | SIL Open Font License 1.1 — pełny tekst w `packages/constructor/assets/fonts/OFL.txt` | web (storefront przez Google Fonts) + **druk produkcyjny** (render serwerowy, czcionka wbudowana w paczkę) | google/fonts (ofl/bricolagegrotesque) |
| Space Grotesk (web) | SIL OFL 1.1 | web (Google Fonts, tekst UI) | Google Fonts |
| Grafiki postaci `apps/storefront/public/art/*` | wewnętrzne placeholder-y (wygenerowane programowo w tym projekcie) | dev/demo; **do podmiany na grafiki klienta przed startem sprzedaży** | to repo |
| @mediapipe/tasks-vision + model BlazeFace short-range (`public/models/face/blaze_face_short_range.tflite`, 230 KB) | Apache-2.0 (pakiet npm i model Google MediaPipe) | detekcja liczby twarzy w przeglądarce (guard „jedna osoba na zdjęciu”) + auto-centrowanie głowy; wasm serwowany z własnego originu | npm + storage.googleapis.com/mediapipe-models |
| @imgly/background-removal | licencja pakietu npm (GPLv3/komercyjna wg wydawcy — **do weryfikacji przed startem komercyjnym**; alternatywa: płatny provider przez port `@gl/cutout`) | usuwanie tła w przeglądarce klienta | npm |

**Uwaga (действие przed startem):** potwierdzić warunki komercyjne @imgly/background-removal
albo przełączyć się na płatnego providera (remove.bg / Photoroom / Clipdrop) — port w
`packages/cutout` jest gotowy, zmiana nie dotyka reszty systemu. Grafiki klienta: przy
dostarczeniu zapisać tu źródło i zakres licencji (kto autorem, czy obejmuje druk).
