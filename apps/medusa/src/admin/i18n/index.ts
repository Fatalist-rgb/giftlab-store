import en from "./json/en.json"
import pl from "./json/pl.json"
import uk from "./json/uk.json"

/**
 * Translations for OUR admin customizations (Produkcja / Opinie / Treści and the two
 * widgets). Medusa merges these into the dashboard's own i18n resources, so the
 * operator's language choice (Settings → Profile → Language) drives our strings too.
 * The dashboard already ships Ukrainian ("Українська") and Polish for the core UI;
 * anything missing falls back to English (dashboard's fallbackLng).
 */
export default {
  en: { translation: en },
  pl: { translation: pl },
  uk: { translation: uk },
}
