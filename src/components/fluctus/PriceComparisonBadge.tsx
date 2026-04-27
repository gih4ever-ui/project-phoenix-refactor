import { TrendingDown, TrendingUp, Minus, HelpCircle } from "lucide-react";
import type { PriceCompareResult } from "@/lib/priceCompare";

interface Props {
  result: PriceCompareResult;
  /** Mostra forma compacta sem texto, só ícone + diff */
  compact?: boolean;
  className?: string;
}

const fmt = (n: number) => `R$ ${n.toFixed(2)}`;

export default function PriceComparisonBadge({ result, compact, className = "" }: Props) {
  if (result.status === "no_quote") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}
        title="Sem cotação cadastrada para este fornecedor"
      >
        <HelpCircle className="w-3 h-3" />
        {!compact && <span>sem cotação</span>}
      </span>
    );
  }

  if (result.status === "equal") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}
        title={`Mesmo preço da cotação (${fmt(result.quotedPrice!)})`}
      >
        <Minus className="w-3 h-3" />
        {!compact && <span>mesmo preço da cotação</span>}
      </span>
    );
  }

  const cheaper = result.status === "cheaper";
  const Icon = cheaper ? TrendingDown : TrendingUp;
  const colorCls = cheaper ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  const absDiff = Math.abs(result.diff);
  const absPct = Math.abs(result.diffPercent);
  const word = cheaper ? "mais barato" : "mais caro";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${colorCls} ${className}`}
      title={`Cotação cadastrada: ${fmt(result.quotedPrice!)}`}
    >
      <Icon className="w-3 h-3" />
      {compact ? (
        <span>
          {cheaper ? "−" : "+"}
          {fmt(absDiff)} ({absPct.toFixed(1)}%)
        </span>
      ) : (
        <span>
          {absPct.toFixed(1)}% {word} que a cotação ({fmt(result.quotedPrice!)})
        </span>
      )}
    </span>
  );
}
