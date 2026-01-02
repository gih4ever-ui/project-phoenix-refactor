import { useState } from "react";
import { Tag, Search, ChevronDown, ChevronUp, Wallet, Percent, CheckCircle, X, CheckSquare, Square, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, Button, SearchBar, Badge } from "../ui";
import { safeFixed } from "@/lib/utils";
import { DatabaseHook } from "@/hooks/useLocalData";

interface CatalogProps {
  db: DatabaseHook;
}

export const Catalog = ({ db }: CatalogProps) => {
  const { products, kits, materials, extras, fixedCosts } = db.data;
  const [activeTab, setActiveTab] = useState<"products" | "kits">("products");
  const [searchTerm, setSearchTerm] = useState("");

  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [activeProductTab, setActiveProductTab] = useState("overview");

  const [expandedKitId, setExpandedKitId] = useState<number | null>(null);
  const [activeKitTab, setActiveKitTab] = useState("overview");

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredKits = kits.filter((k) =>
    k.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpandProduct = (id: number) => {
    setExpandedProductId(expandedProductId === id ? null : id);
    setActiveProductTab("overview");
  };

  const toggleExpandKit = (id: number) => {
    setExpandedKitId(expandedKitId === id ? null : id);
    setActiveKitTab("overview");
  };

  const getProductExtrasCost = (product: any) => {
    if (!product || !product.selectedExtras) return 0;
    return product.selectedExtras.reduce((acc: number, item: any) => {
      const extraItem = extras.find((e) => e.id == item.extraId);
      let costUnit = 0;
      if (extraItem?.quotes?.length) {
        costUnit = Math.min(...extraItem.quotes.map((q) => Number(q.price)));
      } else {
        costUnit = Number(extraItem?.price) || 0;
      }
      const yieldVal = Number(extraItem?.yield) > 0 ? Number(extraItem.yield) : 1;
      const costPerUseUnit = costUnit / yieldVal;
      return acc + costPerUseUnit * item.quantity;
    }, 0);
  };

  const getKitFinancials = (kit: any) => {
    let totalCost = 0;
    (kit.items || []).forEach((item: any) => {
      const prod = products.find((p) => p.id == item.id);
      if (prod) {
        let prodCost = Number(prod.totalCost) || 0;
        if (item.withoutPackaging) {
          const packCost = getProductExtrasCost(prod);
          prodCost -= packCost;
        }
        totalCost += prodCost * item.qty;
      }
    });
    (kit.kitExtras || []).forEach((item: any) => {
      const ext = extras.find((e) => e.id == item.id);
      if (ext) {
        let costUnit = 0;
        if (ext.quotes && ext.quotes.length > 0) {
          costUnit = Math.min(...ext.quotes.map((q) => Number(q.price)));
        } else {
          costUnit = Number(ext.price) || 0;
        }
        const yieldVal = Number(ext.yield) > 0 ? Number(ext.yield) : 1;
        const costPerUse = costUnit / yieldVal;
        totalCost += costPerUse * item.qty;
      }
    });
    const revenue = Number(kit.finalPrice) || 0;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { totalCost, profit, margin };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">Catálogo Digital</h2>
        <div className="flex bg-card rounded-lg border border-border p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "products"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Produtos
          </button>
          <button
            onClick={() => setActiveTab("kits")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "kits"
                ? "bg-badge-purple text-white shadow"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Kits & Combos
          </button>
        </div>
      </div>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar no catálogo..." />

      <div className="grid grid-cols-1 gap-6">
        {activeTab === "products" && (
          <div className="grid grid-cols-1 gap-4">
            {filteredProducts.map((p) => {
              const isExpanded = expandedProductId === p.id;
              const price = Number(p.finalPrice) || p.suggestedPrice || 0;
              const profit =
                price -
                (p.totalCost || 0) -
                price * ((p.tax || 0) / 100) -
                price * ((p.commission || 0) / 100);

              return (
                <Card
                  key={p.id}
                  className={`relative border-l-4 border-l-primary p-0 overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
                    isExpanded ? "ring-2 ring-primary/20" : ""
                  }`}
                  onClick={() => toggleExpandProduct(p.id)}
                >
                  <div className="flex flex-col p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-foreground">{p.name}</h4>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <span>
                            Preço:{" "}
                            <span className="text-primary font-bold text-sm">
                              R$ {safeFixed(price)}
                            </span>
                          </span>
                          {p.variations && p.variations.length > 0 && (
                            <Badge color="gray">{p.variations.length} vars</Badge>
                          )}
                        </div>

                        {!isExpanded && p.variations && p.variations.some((v) => v.active) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.variations
                              .filter((v) => v.active)
                              .map((v) => (
                                <span
                                  key={v.id}
                                  className="text-[10px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded font-medium"
                                >
                                  {v.name}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="bg-primary/10 text-primary p-2 rounded-full">
                        <Tag size={20} />
                      </div>
                    </div>

                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {p.description || "Sem descrição."}
                      </p>
                    )}

                    {isExpanded && (
                      <div
                        className="mt-3 pt-3 border-t border-border animate-fade-in text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex border-b border-border mb-4 bg-muted -mx-5 px-5 pt-2">
                          <button
                            onClick={() => setActiveProductTab("overview")}
                            className={`flex-1 pb-2 text-center font-bold uppercase text-[10px] tracking-wide ${
                              activeProductTab === "overview"
                                ? "text-primary border-b-2 border-primary"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Visão Geral
                          </button>
                          <button
                            onClick={() => setActiveProductTab("composition")}
                            className={`flex-1 pb-2 text-center font-bold uppercase text-[10px] tracking-wide ${
                              activeProductTab === "composition"
                                ? "text-primary border-b-2 border-primary"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Composição
                          </button>
                          <button
                            onClick={() => setActiveProductTab("variations")}
                            className={`flex-1 pb-2 text-center font-bold uppercase text-[10px] tracking-wide ${
                              activeProductTab === "variations"
                                ? "text-primary border-b-2 border-primary"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Variações
                          </button>
                          <button
                            onClick={() => setActiveProductTab("costs")}
                            className={`flex-1 pb-2 text-center font-bold uppercase text-[10px] tracking-wide ${
                              activeProductTab === "costs"
                                ? "text-primary border-b-2 border-primary"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Financeiro
                          </button>
                        </div>

                        {activeProductTab === "overview" && (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground italic mb-2 bg-card p-2 rounded border border-border">
                              {p.description || "Nenhuma descrição informada."}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-muted p-3 rounded border border-border">
                                <span className="block text-muted-foreground text-[10px] uppercase font-bold">
                                  Preço de Venda
                                </span>
                                <span className="text-xl font-bold text-foreground">
                                  R$ {safeFixed(price)}
                                </span>
                              </div>
                              <div className="bg-success/10 p-3 rounded border border-success/20">
                                <span className="block text-success text-[10px] uppercase font-bold">
                                  Lucro Líquido
                                </span>
                                <span className="text-xl font-bold text-success">
                                  R$ {safeFixed(profit)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeProductTab === "composition" && (
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 border-b border-border pb-1">
                                Matéria Prima
                              </p>
                              <ul className="space-y-1">
                                {p.materials &&
                                  p.materials.map((mat, i) => {
                                    const materialInfo = materials.find(
                                      (m) => m.id == mat.materialId
                                    );
                                    return (
                                      <li
                                        key={i}
                                        className="flex justify-between bg-card p-2 rounded border border-border shadow-sm items-center"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                          <span>{materialInfo?.name || "Desconhecido"}</span>
                                        </div>
                                        <Badge color="gray">
                                          {mat.quantity} {materialInfo?.useUnit}
                                        </Badge>
                                      </li>
                                    );
                                  })}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 border-b border-border pb-1">
                                Embalagens & Extras
                              </p>
                              <ul className="space-y-1">
                                {p.selectedExtras &&
                                  p.selectedExtras.map((ext, i) => {
                                    const extraInfo = extras.find((e) => e.id == ext.extraId);
                                    return (
                                      <li
                                        key={i}
                                        className="flex justify-between bg-card p-2 rounded border border-border shadow-sm items-center"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-badge-purple"></div>
                                          <span>{extraInfo?.name || "Desconhecido"}</span>
                                        </div>
                                        <Badge color="gray">
                                          {ext.quantity} {extraInfo?.useUnit || "un"}
                                        </Badge>
                                      </li>
                                    );
                                  })}
                              </ul>
                            </div>
                          </div>
                        )}

                        {activeProductTab === "variations" && (
                          <div>
                            {p.variations && p.variations.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2">
                                {p.variations.map((v) => (
                                  <div
                                    key={v.id}
                                    className={`p-2 rounded border flex items-center justify-between ${
                                      v.active
                                        ? "bg-card border-primary/20"
                                        : "bg-muted border-border opacity-60"
                                    }`}
                                  >
                                    <span
                                      className={`font-medium text-xs ${
                                        v.active ? "text-foreground" : "text-muted-foreground"
                                      }`}
                                    >
                                      {v.name}
                                    </span>
                                    {v.active ? (
                                      <CheckCircle size={14} className="text-primary" />
                                    ) : (
                                      <X size={14} className="text-muted-foreground" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center p-8 bg-muted rounded border border-dashed border-border">
                                <p className="text-muted-foreground text-[10px]">
                                  Produto sem grade de variações.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {activeProductTab === "costs" && (
                          <div className="space-y-3">
                            <div className="bg-card p-3 rounded border border-border">
                              <h5 className="font-bold text-foreground mb-2 flex items-center gap-2 text-[10px] uppercase">
                                <Wallet size={12} /> Custos de Produção
                              </h5>
                              <div className="flex justify-between border-b border-border pb-1 mb-1 text-foreground">
                                <span>Custo Total:</span>
                                <span className="font-mono">R$ {safeFixed(p.totalCost)}</span>
                              </div>
                              <div className="flex justify-between border-b border-border pb-1 mb-1 text-muted-foreground text-[10px]">
                                <span>Mão de Obra:</span>
                                <span className="font-mono">
                                  R$ {safeFixed(Number(p.laborCost || 0))}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-border pb-1 mb-1 text-muted-foreground text-[10px]">
                                <span>Custo Fixo (Rateio):</span>
                                <span className="font-mono">
                                  R${" "}
                                  {safeFixed(
                                    fixedCosts.estimatedSales > 0
                                      ? fixedCosts.total / fixedCosts.estimatedSales
                                      : 0
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="bg-card p-3 rounded border border-border">
                              <h5 className="font-bold text-foreground mb-2 flex items-center gap-2 text-[10px] uppercase">
                                <Percent size={12} /> Taxas & Deduções
                              </h5>
                              <div className="flex justify-between border-b border-border pb-1 mb-1 text-foreground">
                                <span>Impostos ({p.tax}%):</span>
                                <span className="font-mono text-destructive">
                                  - R$ {safeFixed(price * (p.tax / 100))}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-border pb-1 mb-1 text-foreground">
                                <span>Comissões ({p.commission}%):</span>
                                <span className="font-mono text-destructive">
                                  - R$ {safeFixed(price * (p.commission / 100))}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!isExpanded && (
                      <div className="flex justify-center mt-1">
                        <ChevronDown size={16} className="text-muted-foreground" />
                      </div>
                    )}
                    {isExpanded && (
                      <div className="flex justify-center mt-1">
                        <ChevronUp size={16} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === "kits" && (
          <div className="grid grid-cols-1 gap-4">
            {filteredKits.map((kit) => {
              const isExpanded = expandedKitId === kit.id;
              const financials = getKitFinancials(kit);
              const discountValue = kit.rawTotal - kit.finalPrice;
              const discountPercent = (discountValue / kit.rawTotal) * 100;

              return (
                <Card
                  key={kit.id}
                  className={`relative border-l-4 border-l-badge-purple p-0 overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
                    isExpanded ? "ring-2 ring-badge-purple/20" : ""
                  }`}
                  onClick={() => toggleExpandKit(kit.id)}
                >
                  <div className="flex flex-col p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-badge-purple/10 text-badge-purple text-[10px] px-1.5 py-0.5">
                            KIT
                          </Badge>
                          <h4 className="font-bold text-lg text-foreground">{kit.name}</h4>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{kit.items.length} itens</span>
                          <span>•</span>
                          <span className="text-success font-bold">
                            {safeFixed(discountPercent)}% OFF
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isExpanded && (
                      <div className="flex justify-between items-end border-t border-border pt-3 mt-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground line-through">
                            De: R$ {safeFixed(kit.rawTotal)}
                          </p>
                          <p className="text-xl font-bold text-badge-purple">
                            R$ {safeFixed(kit.finalPrice)}
                          </p>
                        </div>
                        <div className="flex justify-center">
                          <ChevronDown size={16} className="text-muted-foreground" />
                        </div>
                      </div>
                    )}

                    {isExpanded && (
                      <div
                        className="mt-2 pt-2 border-t border-border animate-fade-in text-xs cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex border-b border-border mb-4 bg-muted -mx-5 px-5 pt-2">
                          <button
                            onClick={() => setActiveKitTab("overview")}
                            className={`flex-1 pb-2 text-center font-bold uppercase text-[10px] tracking-wide ${
                              activeKitTab === "overview"
                                ? "text-badge-purple border-b-2 border-badge-purple"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Visão Geral
                          </button>
                          <button
                            onClick={() => setActiveKitTab("items")}
                            className={`flex-1 pb-2 text-center font-bold uppercase text-[10px] tracking-wide ${
                              activeKitTab === "items"
                                ? "text-badge-purple border-b-2 border-badge-purple"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Itens
                          </button>
                          <button
                            onClick={() => setActiveKitTab("financial")}
                            className={`flex-1 pb-2 text-center font-bold uppercase text-[10px] tracking-wide ${
                              activeKitTab === "financial"
                                ? "text-badge-purple border-b-2 border-badge-purple"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Financeiro
                          </button>
                        </div>

                        {activeKitTab === "overview" && (
                          <div className="space-y-4 px-2">
                            <div className="grid grid-cols-2 gap-4 text-center">
                              <div className="bg-muted p-3 rounded border border-border">
                                <span className="block text-muted-foreground text-[10px] uppercase font-bold">
                                  Preço Original
                                </span>
                                <span className="text-base font-bold text-muted-foreground line-through">
                                  R$ {safeFixed(kit.rawTotal)}
                                </span>
                              </div>
                              <div className="bg-success/10 p-3 rounded border border-success/20">
                                <span className="block text-success text-[10px] uppercase font-bold">
                                  Preço do Kit
                                </span>
                                <span className="text-xl font-bold text-success">
                                  R$ {safeFixed(kit.finalPrice)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeKitTab === "items" && (
                          <div className="space-y-4 px-2">
                            <div>
                              <h5 className="font-bold text-foreground mb-2 border-b border-border pb-1">
                                Produtos Inclusos
                              </h5>
                              <ul className="space-y-2">
                                {kit.items.map((it, i) => {
                                  const prod = products.find((p) => p.id == it.id);
                                  return (
                                    <li
                                      key={i}
                                      className="flex justify-between bg-card p-2 rounded border border-border"
                                    >
                                      <span className="font-medium text-foreground">
                                        <span className="font-bold">{it.qty}x</span>{" "}
                                        {prod?.name || "Produto removido"}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        )}

                        {activeKitTab === "financial" && (
                          <div className="space-y-3 px-2">
                            <div className="bg-card p-3 rounded border border-border">
                              <h5 className="font-bold text-foreground mb-2 flex items-center gap-2">
                                <Wallet size={12} /> Custos
                              </h5>
                              <div className="flex justify-between items-center pt-1">
                                <span className="font-bold text-foreground">
                                  Custo Total Produção
                                </span>
                                <span className="font-bold text-foreground">
                                  R$ {safeFixed(financials.totalCost)}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-success/10 p-2 rounded border border-success/20 text-center">
                                <span className="block text-success text-[10px] uppercase font-bold">
                                  Lucro Líquido
                                </span>
                                <span className="text-lg font-bold text-success">
                                  R$ {safeFixed(financials.profit)}
                                </span>
                              </div>
                              <div className="bg-primary/10 p-2 rounded border border-primary/20 text-center">
                                <span className="block text-primary text-[10px] uppercase font-bold">
                                  Margem Real
                                </span>
                                <span className="text-lg font-bold text-primary">
                                  {safeFixed(financials.margin)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-center mt-2">
                          <ChevronUp size={16} className="text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {((activeTab === "products" && filteredProducts.length === 0) ||
        (activeTab === "kits" && filteredKits.length === 0)) && (
        <div className="text-center py-20 text-muted-foreground bg-muted rounded-xl border-2 border-dashed border-border">
          <Search size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">Nenhum item encontrado.</p>
        </div>
      )}
    </div>
  );
};
