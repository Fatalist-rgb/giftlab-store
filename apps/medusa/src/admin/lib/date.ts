/**
 * Date formatting that follows the operator's admin language. The dashboard's language
 * codes are not all valid BCP-47 tags ("enGB", "ptBR", "zhCN"), and Date#toLocaleString
 * throws on an invalid tag — so unknown codes fall back instead of breaking the page.
 */
const TAGS: Record<string, string> = {
  en: "en-GB",
  enGB: "en-GB",
  faIR: "fa-IR",
  ptBR: "pt-BR",
  ptPT: "pt-PT",
  zhCN: "zh-CN",
  zhTW: "zh-TW",
  pl: "pl-PL",
  uk: "uk-UA",
}

export function formatDateTime(iso: string, language: string): string {
  const tag = TAGS[language] ?? (/^[a-z]{2}$/.test(language) ? language : "en-GB")
  const date = new Date(iso)
  try {
    return date.toLocaleString(tag)
  } catch {
    return date.toLocaleString("en-GB")
  }
}
