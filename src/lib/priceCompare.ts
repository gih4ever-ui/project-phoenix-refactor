import type { Material, Extra } from "@/types/fluctus";

export type PriceCompareStatus = "cheaper" | "higher" | "equal" | "no_quote";

export interface PriceCompareResult {
  status: PriceCompareStatus;
  quotedPrice: number | null;
  paidPrice: number;
  diff: number; // paid - quoted (negative = saved money)
  diffPercent: number; // (paid-quoted)/quoted * 100
}

/**
 * Compara o preço pago em uma nota com o preço cotado para aquele fornecedor
 * naquele material/extra.
 */
export function compareToQuote(params: {
  type: "material" | "extra" | "other";
  itemId: number | string;
  supplierId: number | string;
  paidPrice: number;
  materials: Material[];
  extras: Extra[];
}): PriceCompareResult {
  const { type, itemId, supplierId, paidPrice, materials, extras } = params;

  if (type === "other" || !itemId) {
    return {
      status: "no_quote",
      quotedPrice: null,
      paidPrice,
      diff: 0,
      diffPercent: 0,
    };
  }

  const list = type === "material" ? materials : extras;
  const item = list.find((i) => i.id == itemId);
  if (!item) {
    return { status: "no_quote", quotedPrice: null, paidPrice, diff: 0, diffPercent: 0 };
  }

  // Procura cotação específica desse fornecedor
  const quote = item.quotes?.find((q) => q.supplierId == supplierId);
  const quoted = quote?.price;

  if (typeof quoted !== "number" || quoted <= 0) {
    return { status: "no_quote", quotedPrice: null, paidPrice, diff: 0, diffPercent: 0 };
  }

  const diff = paidPrice - quoted;
  const diffPercent = (diff / quoted) * 100;
  const epsilon = 0.005; // 0,5 centavo de tolerância
  let status: PriceCompareStatus;
  if (Math.abs(diff) < epsilon) status = "equal";
  else if (diff < 0) status = "cheaper";
  else status = "higher";

  return { status, quotedPrice: quoted, paidPrice, diff, diffPercent };
}
