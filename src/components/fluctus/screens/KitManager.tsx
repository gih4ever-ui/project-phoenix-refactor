import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  ChevronDown,
  ChevronUp,
  Box,
  Package,
  Gift,
  X,
  Copy,
} from "lucide-react";
import { Card, Button, Input, SearchBar, Badge } from "../ui";
import { safeFixed } from "@/lib/utils";
import { DatabaseHook } from "@/hooks/useLocalData";
import { Kit, KitItem, KitExtra } from "@/types/fluctus";

interface KitManagerProps {
  db: DatabaseHook;
}

const emptyForm = {
  name: "",
  items: [] as KitItem[],
  kitExtras: [] as KitExtra[],
  discount: 0,
  finalPrice: 0,
};

export const KitManager = ({ db }: KitManagerProps) => {
  const { data, add, update, remove } = db;
  const { kits, products, extras } = data;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

  // Helper: get the active price for an extra
  const getExtraPrice = (ext: typeof extras[0]) => {
    if (ext.selectedQuoteId) {
      const selectedQuote = ext.quotes.find((q) => q.id === ext.selectedQuoteId);
      if (selectedQuote) return selectedQuote.price;
    }
    const sortedQuotes = [...ext.quotes].sort((a, b) => a.price - b.price);
    return sortedQuotes[0]?.price || ext.price || 0;
  };

  // Helper: get unit cost
  const getUnitCost = (price: number, yieldVal: number): number => {
    return price / (yieldVal || 1);
  };

  // Calculate raw total (sum of all products at full price)
  const rawTotal = useMemo(() => {
    let total = 0;
    form.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.id);
      if (prod) {
        let prodPrice = prod.finalPrice || prod.suggestedPrice || 0;
        // If without packaging, subtract extras cost
        if (item.withoutPackaging && prod.extrasCost) {
          prodPrice -= prod.extrasCost;
        }
        total += prodPrice * item.qty;
      }
    });
    return total;
  }, [form.items, products]);

  // Calculate production cost
  const totalProductionCost = useMemo(() => {
    let cost = 0;
    form.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.id);
      if (prod) {
        let prodCost = prod.totalCost || 0;
        if (item.withoutPackaging && prod.extrasCost) {
          prodCost -= prod.extrasCost;
        }
        cost += prodCost * item.qty;
      }
    });
    // Add kit extras cost
    form.kitExtras.forEach((ke) => {
      const ext = extras.find((e) => e.id === ke.id);
      if (ext) {
        const price = getExtraPrice(ext);
        const unitCost = getUnitCost(price, ext.yield || 1);
        cost += unitCost * ke.qty;
      }
    });
    return cost;
  }, [form.items, form.kitExtras, products, extras]);

  // Calculate display price with discount
  const displayPrice = useMemo(() => {
    if (form.finalPrice > 0) return form.finalPrice;
    return rawTotal * (1 - form.discount / 100);
  }, [rawTotal, form.discount, form.finalPrice]);

  // Calculate margin
  const margin = useMemo(() => {
    if (displayPrice <= 0) return 0;
    return ((displayPrice - totalProductionCost) / displayPrice) * 100;
  }, [displayPrice, totalProductionCost]);

  // Handlers for items
  const handleAddItem = () => {
    if (products.length === 0) return;
    setForm({
      ...form,
      items: [...form.items, { id: products[0].id, qty: 1, withoutPackaging: false }],
    });
  };

  const handleRemoveItem = (index: number) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };

  const handleUpdateItem = (index: number, field: keyof KitItem, value: any) => {
    setForm({
      ...form,
      items: form.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    });
  };

  // Handlers for kit extras
  const handleAddKitExtra = () => {
    if (extras.length === 0) return;
    setForm({
      ...form,
      kitExtras: [...form.kitExtras, { id: extras[0].id, qty: 1 }],
    });
  };

  const handleRemoveKitExtra = (index: number) => {
    setForm({
      ...form,
      kitExtras: form.kitExtras.filter((_, i) => i !== index),
    });
  };

  const handleUpdateKitExtra = (index: number, field: keyof KitExtra, value: any) => {
    setForm({
      ...form,
      kitExtras: form.kitExtras.map((ke, i) =>
        i === index ? { ...ke, [field]: value } : ke
      ),
    });
  };

  const handleSave = () => {
    if (!form.name.trim() || form.items.length === 0) return;

    const kitData: Omit<Kit, 'id'> = {
      name: form.name,
      items: form.items,
      kitExtras: form.kitExtras,
      discount: form.discount,
      finalPrice: form.finalPrice || displayPrice,
      totalProductionCost,
      displayPrice,
      margin,
      rawTotal,
    };

    if (editingId) {
      update("kits", editingId, kitData);
      setEditingId(null);
    } else {
      add("kits", kitData);
    }
    setForm(emptyForm);
  };

  const handleEdit = (kit: Kit) => {
    setForm({
      name: kit.name,
      items: kit.items || [],
      kitExtras: kit.kitExtras || [],
      discount: kit.discount || 0,
      finalPrice: kit.finalPrice || 0,
    });
    setEditingId(kit.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicate = (kit: Kit) => {
    const now = Date.now();
    const duplicatedKit: Omit<Kit, 'id'> = {
      name: `${kit.name} (Cópia)`,
      items: (kit.items || []).map((item, idx) => ({
        ...item,
        id: item.id, // Keep product references
      })),
      kitExtras: (kit.kitExtras || []).map((ke, idx) => ({
        ...ke,
        id: ke.id, // Keep extra references
      })),
      discount: kit.discount || 0,
      finalPrice: kit.finalPrice || 0,
      totalProductionCost: kit.totalProductionCost || 0,
      displayPrice: kit.displayPrice || 0,
      margin: kit.margin || 0,
      rawTotal: kit.rawTotal || 0,
    };
    add("kits", duplicatedKit);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const toggleExpand = (id: number) => setExpandedCardId(expandedCardId === id ? null : id);

  const filteredKits = kits.filter((k) =>
    k.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Gerenciador de Kits</h2>

      {/* Kit Form */}
      <Card className={editingId ? "border-l-4 border-l-warning bg-warning/5" : ""}>
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          {editingId ? "Editando Kit" : "Novo Kit"}
        </h3>

        {/* Basic Info */}
        <div className="mb-6">
          <Input
            label="Nome do Kit"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Kit Pai e Filho"
          />
        </div>

        {/* Products Section */}
        <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Package size={18} className="text-primary" /> Produtos do Kit
            </h4>
            <Button onClick={handleAddItem} variant="secondary" className="h-8 text-xs">
              <Plus size={14} /> Adicionar
            </Button>
          </div>
          {form.items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum produto adicionado.</p>
          ) : (
            <div className="space-y-2">
              {form.items.map((item, index) => {
                const prod = products.find((p) => p.id === item.id);
                const price = prod ? (prod.finalPrice || prod.suggestedPrice || 0) : 0;
                const lineTotal = price * item.qty;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-card p-2 rounded border border-border"
                  >
                    <select
                      className="flex-1 border border-input rounded p-1.5 text-sm bg-card text-foreground"
                      value={item.id}
                      onChange={(e) => handleUpdateItem(index, "id", Number(e.target.value))}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - R$ {safeFixed(p.finalPrice || p.suggestedPrice || 0)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="w-16 border border-input rounded p-1.5 text-sm text-center bg-card text-foreground"
                      value={item.qty}
                      onChange={(e) => handleUpdateItem(index, "qty", Number(e.target.value))}
                      min={1}
                    />
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={item.withoutPackaging || false}
                        onChange={(e) => handleUpdateItem(index, "withoutPackaging", e.target.checked)}
                      />
                      Sem emb.
                    </label>
                    <span className="text-xs text-muted-foreground w-24 text-right">
                      R$ {safeFixed(lineTotal)}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
              <div className="text-right text-sm font-semibold text-foreground pt-2 border-t border-border">
                Subtotal Produtos: R$ {safeFixed(rawTotal)}
              </div>
            </div>
          )}
        </div>

        {/* Kit Extras Section */}
        <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Gift size={18} className="text-accent" /> Extras do Kit
            </h4>
            <Button onClick={handleAddKitExtra} variant="secondary" className="h-8 text-xs">
              <Plus size={14} /> Adicionar
            </Button>
          </div>
          {form.kitExtras.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum extra do kit adicionado.</p>
          ) : (
            <div className="space-y-2">
              {form.kitExtras.map((ke, index) => {
                const ext = extras.find((e) => e.id === ke.id);
                const price = ext ? getExtraPrice(ext) : 0;
                const unitCost = ext ? getUnitCost(price, ext.yield || 1) : 0;
                const lineCost = unitCost * ke.qty;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-card p-2 rounded border border-border"
                  >
                    <select
                      className="flex-1 border border-input rounded p-1.5 text-sm bg-card text-foreground"
                      value={ke.id}
                      onChange={(e) => handleUpdateKitExtra(index, "id", Number(e.target.value))}
                    >
                      {extras.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} ({ex.useUnit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="w-16 border border-input rounded p-1.5 text-sm text-center bg-card text-foreground"
                      value={ke.qty}
                      onChange={(e) => handleUpdateKitExtra(index, "qty", Number(e.target.value))}
                      min={1}
                    />
                    <span className="text-xs text-muted-foreground w-24 text-right">
                      R$ {safeFixed(lineCost)}
                    </span>
                    <button
                      onClick={() => handleRemoveKitExtra(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Box size={18} className="text-primary" /> Precificação do Kit
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Input
              label="Desconto (%)"
              type="number"
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
              min={0}
              max={100}
            />
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Preço Sugerido</label>
              <div className="bg-muted p-2 rounded text-center font-bold text-foreground">
                R$ {safeFixed(rawTotal * (1 - form.discount / 100))}
              </div>
            </div>
            <Input
              label="Preço Final (R$)"
              type="number"
              value={form.finalPrice || ""}
              onChange={(e) => setForm({ ...form, finalPrice: Number(e.target.value) })}
              placeholder={safeFixed(displayPrice)}
              min={0}
              step={0.01}
            />
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Margem</label>
              <div className={`bg-muted p-2 rounded text-center font-bold ${margin >= 30 ? "text-success" : "text-destructive"}`}>
                {safeFixed(margin)}%
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Valor Original</p>
              <p className="text-sm font-bold text-muted-foreground line-through">R$ {safeFixed(rawTotal)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Custo Produção</p>
              <p className="text-sm font-bold text-foreground">R$ {safeFixed(totalProductionCost)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Preço Final</p>
              <p className="text-lg font-bold text-success">R$ {safeFixed(displayPrice)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Lucro</p>
              <p className="text-sm font-bold text-success">R$ {safeFixed(displayPrice - totalProductionCost)}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={handleSave} variant="primary" disabled={!form.name.trim() || form.items.length === 0}>
            <Save size={16} /> {editingId ? "Salvar Alterações" : "Criar Kit"}
          </Button>
          {editingId && (
            <Button onClick={handleCancel} variant="ghost">
              Cancelar
            </Button>
          )}
        </div>
      </Card>

      {/* Search */}
      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar kits..." />

      {/* Kit List */}
      <div className="space-y-4">
        {filteredKits.map((kit) => {
          const isExpanded = expandedCardId === kit.id;
          const discountPercent = kit.rawTotal > 0 ? ((kit.rawTotal - kit.finalPrice) / kit.rawTotal) * 100 : 0;

          return (
            <Card
              key={kit.id}
              className={`cursor-pointer hover:shadow-md transition-all ${
                isExpanded ? "ring-2 ring-primary/20" : ""
              } p-0 overflow-hidden`}
            >
              <div
                className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4"
                onClick={() => toggleExpand(kit.id)}
              >
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color="purple">KIT</Badge>
                    <h4 className="font-bold text-foreground text-lg">{kit.name}</h4>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="text-muted-foreground">
                      Itens: <strong className="text-foreground">{kit.items?.length || 0}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      De: <strong className="text-muted-foreground line-through">R$ {safeFixed(kit.rawTotal)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Por: <strong className="text-success">R$ {safeFixed(kit.finalPrice)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Desconto: <strong className="text-success">{safeFixed(discountPercent)}%</strong>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted p-4 animate-fade-in cursor-default">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-card p-3 rounded border border-border">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">
                        Produtos ({kit.items?.length || 0})
                      </p>
                      {kit.items && kit.items.length > 0 ? (
                        <div className="space-y-2">
                          {kit.items.map((item, idx) => {
                            const prod = products.find((p) => p.id === item.id);
                            return (
                              <div key={idx} className="text-sm bg-muted/50 p-2 rounded flex justify-between items-center">
                                <span className="font-medium text-foreground">
                                  {item.qty}x {prod?.name || "Produto não encontrado"}
                                </span>
                                {item.withoutPackaging && (
                                  <Badge color="gray" className="text-xs">Sem emb.</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Nenhum</p>
                      )}
                    </div>
                    <div className="bg-card p-3 rounded border border-border">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Financeiro</p>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Custo Produção:</span>{" "}
                          <strong>R$ {safeFixed(kit.totalProductionCost)}</strong>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Preço Final:</span>{" "}
                          <strong className="text-success">R$ {safeFixed(kit.finalPrice)}</strong>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Margem:</span>{" "}
                          <strong className={kit.margin >= 30 ? "text-success" : "text-destructive"}>
                            {safeFixed(kit.margin)}%
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(kit);
                      }}
                      variant="ghost"
                      className="text-muted-foreground hover:bg-muted h-8 text-xs"
                    >
                      <Copy size={14} /> Duplicar
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(kit);
                      }}
                      variant="ghost"
                      className="text-primary hover:bg-primary/10 h-8 text-xs"
                    >
                      <Pencil size={14} /> Editar
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove("kits", kit.id);
                      }}
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 h-8 text-xs"
                    >
                      <Trash2 size={14} /> Excluir
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {filteredKits.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Box size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nenhum kit cadastrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};
