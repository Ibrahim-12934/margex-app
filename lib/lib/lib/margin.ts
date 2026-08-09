export const CURRENCIES = {
  XOF: { label: "FCFA", symbol: "FCFA", rate: 1 },
  EUR: { label: "Euro", symbol: "€", rate: 655.96 },
} as const;

export type Currency = keyof typeof CURRENCIES;

export function fmt(amount: number, currency: Currency) {
  if (currency === "EUR") return `${amount.toFixed(2)} €`;
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}

export function toXOF(amount: number, currency: Currency) {
  return currency === "EUR" ? amount * CURRENCIES.EUR.rate : amount;
}

export function fromXOF(amountXOF: number, currency: Currency) {
  return currency === "EUR" ? amountXOF / CURRENCIES.EUR.rate : amountXOF;
}

export type ProductLike = {
  cost_xof: number;
  price_xof: number;
  fee_pct: number;
};

export function computeMargin(p: ProductLike) {
  const fee = p.price_xof * (p.fee_pct / 100);
  const marginXOF = p.price_xof - p.cost_xof - fee;
  const marginPct = p.price_xof > 0 ? (marginXOF / p.price_xof) * 100 : 0;
  return { marginXOF, marginPct, fee };
}

export function suggestedPrice(costXOF: number, targetMarginPct: number, feePct: number) {
  const marginRatio = targetMarginPct / 100;
  const fee = feePct / 100;
  const denom = 1 - fee - marginRatio;
  if (denom <= 0) return null;
  return costXOF / denom;
}
