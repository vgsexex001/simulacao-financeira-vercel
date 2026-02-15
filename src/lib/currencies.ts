export const DEFAULT_CURRENCY = "BRL";

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: "BRL", name: "Real Brasileiro", symbol: "R$", locale: "pt-BR" },
  { code: "USD", name: "Dólar Americano", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "\u20AC", locale: "de-DE" },
  { code: "GBP", name: "Libra Esterlina", symbol: "\u00A3", locale: "en-GB" },
  { code: "ARS", name: "Peso Argentino", symbol: "$", locale: "es-AR" },
  { code: "JPY", name: "Iene Japonês", symbol: "\u00A5", locale: "ja-JP" },
  { code: "CAD", name: "Dólar Canadense", symbol: "CA$", locale: "en-CA" },
  { code: "AUD", name: "Dólar Australiano", symbol: "A$", locale: "en-AU" },
  { code: "CHF", name: "Franco Suíço", symbol: "CHF", locale: "de-CH" },
];

/**
 * Formats a numeric value as a currency string using Intl.NumberFormat.
 * Falls back to DEFAULT_CURRENCY if the given code is not found.
 */
export function formatCurrency(value: number, currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  const locale = currency?.locale ?? "pt-BR";
  const code = currency?.code ?? DEFAULT_CURRENCY;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
  }).format(value);
}

/**
 * Returns the display symbol for a currency code.
 * Falls back to the code itself if not found.
 */
export function getCurrencySymbol(code: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return currency?.symbol ?? code;
}
