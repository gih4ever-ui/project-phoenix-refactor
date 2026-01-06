import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  ChevronDown,
  ChevronUp,
  Package,
  Gift,
  Layers,
  Calculator,
  X,
  Copy,
} from "lucide-react";
import { Card, Button, Input, SearchBar, Badge } from "../ui";
import { safeFixed, safeCeil } from "@/lib/utils";
import { DatabaseHook } from "@/hooks/useLocalData";
import { Product, VariationType, Variation, ProductMaterial, ProductExtra } from "@/types/fluctus";

interface ProductPricingProps {
  db: DatabaseHook;
}

const emptyForm = {
  name: "",
  description: "",
  laborCost: 0,
  tax: 12,
  commission: 10,
  platformFee: 0, // Taxa do site/sistema (%)
  margin: 30,
  finalPrice: 0,
  variationTypes: [] as VariationType[],
  variations: [] as Variation[],
  materials: [] as ProductMaterial[],
  selectedExtras: [] as ProductExtra[],
};

export const ProductPricing = ({ db }: ProductPricingProps) => {
  const { data, add, update, remove } = db;
  const { products, materials, extras, fixedCosts } = data;
  
  // Custo fixo por peça (rateio)
  const fixedCostPerUnit = fixedCosts.estimatedSales > 0 
    ? fixedCosts.total / fixedCosts.estimatedSales 
    : 0;
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

  // Variation Type Form
  const [newVariationType, setNewVariationType] = useState("");
  const [newOptionForType, setNewOptionForType] = useState<{ [key: number]: string }>({});
  const [editingVariationId, setEditingVariationId] = useState<number | null>(null);

  // Helper: get the active price for a material (uses selectedQuoteId or cheapest)
  const getMaterialPrice = (mat: typeof materials[0]) => {
    if (mat.selectedQuoteId) {
      const selectedQuote = mat.quotes.find((q) => q.id === mat.selectedQuoteId);
      if (selectedQuote) return selectedQuote.price;
    }
    // Fallback to cheapest
    const sortedQuotes = [...mat.quotes].sort((a, b) => a.price - b.price);
    return sortedQuotes[0]?.price || mat.price || 0;
  };

  // Helper: get the active price for an extra (uses selectedQuoteId or cheapest)
  const getExtraPrice = (ext: typeof extras[0]) => {
    if (ext.selectedQuoteId) {
      const selectedQuote = ext.quotes.find((q) => q.id === ext.selectedQuoteId);
      if (selectedQuote) return selectedQuote.price;
    }
    // Fallback to cheapest
    const sortedQuotes = [...ext.quotes].sort((a, b) => a.price - b.price);
    return sortedQuotes[0]?.price || ext.price || 0;
  };

  // Helper: get unit cost always rounding UP to avoid zero costs
  const getUnitCost = (price: number, yieldVal: number): number => {
    return safeCeil(price / (yieldVal || 1));
  };

  // Calculate costs
  const materialCost = useMemo(() => {
    return form.materials.reduce((sum, pm) => {
      const mat = materials.find((m) => m.id == pm.materialId);
      if (!mat) return sum;
      const price = getMaterialPrice(mat);
      const unitCost = getUnitCost(price, mat.yield || 1);
      return sum + unitCost * pm.quantity;
    }, 0);
  }, [form.materials, materials]);

  const extrasCost = useMemo(() => {
    return form.selectedExtras.reduce((sum, pe) => {
      const ext = extras.find((e) => e.id == pe.extraId);
      if (!ext) return sum;
      const price = getExtraPrice(ext);
      const unitCost = getUnitCost(price, ext.yield || 1);
      return sum + unitCost * pe.quantity;
    }, 0);
  }, [form.selectedExtras, extras]);

  // Total de custo inclui materiais, extras, mão de obra e custo fixo rateado
  const totalCost = materialCost + extrasCost + form.laborCost + fixedCostPerUnit;

  const suggestedPrice = useMemo(() => {
    // Divisor considera: imposto, comissão, taxa de sistema/site e margem
    const divisor = 1 - (form.tax / 100) - (form.commission / 100) - (form.platformFee / 100) - (form.margin / 100);
    if (divisor <= 0) return totalCost * 2;
    return totalCost / divisor;
  }, [totalCost, form.tax, form.commission, form.platformFee, form.margin]);

  const realMargin = useMemo(() => {
    const price = form.finalPrice || suggestedPrice;
    if (price <= 0) return 0;
    // Custos incluem imposto, comissão e taxa do sistema
    const costs = totalCost + (price * form.tax / 100) + (price * form.commission / 100) + (price * form.platformFee / 100);
    return ((price - costs) / price) * 100;
  }, [form.finalPrice, suggestedPrice, totalCost, form.tax, form.commission, form.platformFee]);

  // Handlers
  const handleAddMaterial = () => {
    if (materials.length === 0) return;
    setForm({
      ...form,
      materials: [
        ...form.materials,
        { id: Date.now(), materialId: materials[0].id, quantity: 1 },
      ],
    });
  };

  const handleRemoveMaterial = (id: number) => {
    setForm({
      ...form,
      materials: form.materials.filter((m) => m.id !== id),
    });
  };

  const handleUpdateMaterial = (id: number, field: string, value: any) => {
    setForm({
      ...form,
      materials: form.materials.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    });
  };

  const handleAddExtra = () => {
    if (extras.length === 0) return;
    setForm({
      ...form,
      selectedExtras: [
        ...form.selectedExtras,
        { id: Date.now(), extraId: extras[0].id, quantity: 1 },
      ],
    });
  };

  const handleRemoveExtra = (id: number) => {
    setForm({
      ...form,
      selectedExtras: form.selectedExtras.filter((e) => e.id !== id),
    });
  };

  const handleUpdateExtra = (id: number, field: string, value: any) => {
    setForm({
      ...form,
      selectedExtras: form.selectedExtras.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    });
  };

  // Add a new variation type (e.g., "Cor", "Tamanho")
  const handleAddVariationType = () => {
    if (!newVariationType.trim()) return;
    const newType: VariationType = {
      id: Date.now(),
      name: newVariationType.trim(),
      options: [],
    };
    setForm({
      ...form,
      variationTypes: [...form.variationTypes, newType],
    });
    setNewVariationType("");
  };

  // Remove a variation type entirely
  const handleRemoveVariationType = (id: number) => {
    const newVariationTypes = form.variationTypes.filter((vt) => vt.id !== id);
    const newVariations = generateVariations(newVariationTypes, form.variations);
    setForm({
      ...form,
      variationTypes: newVariationTypes,
      variations: newVariations,
    });
  };

  // Add an option to a variation type
  const handleAddOptionToType = (typeId: number) => {
    const optionText = newOptionForType[typeId]?.trim();
    if (!optionText) return;
    
    const newVariationTypes = form.variationTypes.map((vt) =>
      vt.id === typeId ? { ...vt, options: [...vt.options, optionText] } : vt
    );
    const newVariations = generateVariations(newVariationTypes, form.variations);
    setForm({
      ...form,
      variationTypes: newVariationTypes,
      variations: newVariations,
    });
    setNewOptionForType({ ...newOptionForType, [typeId]: "" });
  };

  // Remove an option from a variation type
  const handleRemoveOptionFromType = (typeId: number, optionIndex: number) => {
    const newVariationTypes = form.variationTypes.map((vt) => {
      if (vt.id !== typeId) return vt;
      const newOptions = vt.options.filter((_, idx) => idx !== optionIndex);
      return { ...vt, options: newOptions };
    });
    const newVariations = generateVariations(newVariationTypes, form.variations);
    setForm({
      ...form,
      variationTypes: newVariationTypes,
      variations: newVariations,
    });
  };

  // Move a variation type up or down
  const handleMoveVariationType = (id: number, direction: "up" | "down") => {
    const idx = form.variationTypes.findIndex((vt) => vt.id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === form.variationTypes.length - 1) return;

    const newTypes = [...form.variationTypes];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newTypes[idx], newTypes[swapIdx]] = [newTypes[swapIdx], newTypes[idx]];

    const newVariations = generateVariations(newTypes, form.variations);
    setForm({
      ...form,
      variationTypes: newTypes,
      variations: newVariations,
    });
  };

  // Move an option within a variation type
  const handleMoveOption = (typeId: number, optionIndex: number, direction: "up" | "down") => {
    const newVariationTypes = form.variationTypes.map((vt) => {
      if (vt.id !== typeId) return vt;
      const newOptions = [...vt.options];
      if (direction === "up" && optionIndex === 0) return vt;
      if (direction === "down" && optionIndex === newOptions.length - 1) return vt;
      
      const swapIdx = direction === "up" ? optionIndex - 1 : optionIndex + 1;
      [newOptions[optionIndex], newOptions[swapIdx]] = [newOptions[swapIdx], newOptions[optionIndex]];
      return { ...vt, options: newOptions };
    });
    const newVariations = generateVariations(newVariationTypes, form.variations);
    setForm({
      ...form,
      variationTypes: newVariationTypes,
      variations: newVariations,
    });
  };

  const generateVariations = (types: VariationType[], existingVariations: Variation[]): Variation[] => {
    if (types.length === 0) return [];
    
    const combine = (arrays: string[][]): string[][] => {
      if (arrays.length === 0) return [[]];
      const [first, ...rest] = arrays;
      const restCombos = combine(rest);
      return first.flatMap((item) => restCombos.map((combo) => [item, ...combo]));
    };

    const optionsArrays = types.map((t) => t.options);
    const combinations = combine(optionsArrays);

    // Map existing variations by their combination string for preservation
    const existingMap = new Map<string, Variation>();
    existingVariations.forEach((v) => {
      existingMap.set(v.name, v);
    });

    // Preserve existing variations or create new ones
    return combinations.map((combo, idx) => {
      const name = combo.join(" / ");
      const existing = existingMap.get(name);
      
      if (existing) {
        // Keep existing variation data (materials, extras, active state)
        return existing;
      }
      
      // Create new variation inheriting from base
      return {
        id: Date.now() + idx,
        name,
        combination: combo,
        active: true,
        materials: form.materials.map((m) => ({ ...m, id: Date.now() + idx * 1000 + m.id })),
        selectedExtras: form.selectedExtras.map((e) => ({ ...e, id: Date.now() + idx * 2000 + e.id })),
      };
    });
  };

  const handleToggleVariation = (id: number) => {
    setForm({
      ...form,
      variations: form.variations.map((v) =>
        v.id === id ? { ...v, active: !v.active } : v
      ),
    });
  };

  // Update variation materials
  const handleUpdateVariationMaterial = (variationId: number, materialPmId: number, field: string, value: any) => {
    setForm({
      ...form,
      variations: form.variations.map((v) => {
        if (v.id !== variationId) return v;
        return {
          ...v,
          materials: (v.materials || []).map((pm) =>
            pm.id === materialPmId ? { ...pm, [field]: value } : pm
          ),
        };
      }),
    });
  };

  const handleAddVariationMaterial = (variationId: number) => {
    if (materials.length === 0) return;
    setForm({
      ...form,
      variations: form.variations.map((v) => {
        if (v.id !== variationId) return v;
        return {
          ...v,
          materials: [
            ...(v.materials || []),
            { id: Date.now(), materialId: materials[0].id, quantity: 1 },
          ],
        };
      }),
    });
  };

  const handleRemoveVariationMaterial = (variationId: number, materialPmId: number) => {
    setForm({
      ...form,
      variations: form.variations.map((v) => {
        if (v.id !== variationId) return v;
        return {
          ...v,
          materials: (v.materials || []).filter((pm) => pm.id !== materialPmId),
        };
      }),
    });
  };

  // Update variation extras
  const handleUpdateVariationExtra = (variationId: number, extraPeId: number, field: string, value: any) => {
    setForm({
      ...form,
      variations: form.variations.map((v) => {
        if (v.id !== variationId) return v;
        return {
          ...v,
          selectedExtras: (v.selectedExtras || []).map((pe) =>
            pe.id === extraPeId ? { ...pe, [field]: value } : pe
          ),
        };
      }),
    });
  };

  const handleAddVariationExtra = (variationId: number) => {
    if (extras.length === 0) return;
    setForm({
      ...form,
      variations: form.variations.map((v) => {
        if (v.id !== variationId) return v;
        return {
          ...v,
          selectedExtras: [
            ...(v.selectedExtras || []),
            { id: Date.now(), extraId: extras[0].id, quantity: 1 },
          ],
        };
      }),
    });
  };

  const handleRemoveVariationExtra = (variationId: number, extraPeId: number) => {
    setForm({
      ...form,
      variations: form.variations.map((v) => {
        if (v.id !== variationId) return v;
        return {
          ...v,
          selectedExtras: (v.selectedExtras || []).filter((pe) => pe.id !== extraPeId),
        };
      }),
    });
  };

  // Calculate variation cost (inclui custo fixo rateado)
  const getVariationCost = (variation: Variation) => {
    const varMaterials = variation.materials || form.materials;
    const varExtras = variation.selectedExtras || form.selectedExtras;
    
    const matCost = varMaterials.reduce((sum, pm) => {
      const mat = materials.find((m) => m.id == pm.materialId);
      if (!mat) return sum;
      const price = getMaterialPrice(mat);
      return sum + getUnitCost(price, mat.yield || 1) * pm.quantity;
    }, 0);

    const extCost = varExtras.reduce((sum, pe) => {
      const ext = extras.find((e) => e.id == pe.extraId);
      if (!ext) return sum;
      const price = getExtraPrice(ext);
      return sum + getUnitCost(price, ext.yield || 1) * pe.quantity;
    }, 0);

    return matCost + extCost + form.laborCost + fixedCostPerUnit;
  };

  // Toggle variation directly on a saved product (without entering edit mode)
  const handleToggleProductVariation = (productId: number, variationId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product || !product.variations) return;
    
    const updatedVariations = product.variations.map((v) =>
      v.id === variationId ? { ...v, active: !v.active } : v
    );
    update("products", productId, { variations: updatedVariations });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    
    const productData: Omit<Product, 'id'> = {
      ...form,
      totalCost,
      suggestedPrice,
      realMargin,
      materialCost, // Salva custo dos materiais
      extrasCost, // Salva custo dos extras
      fixedCostPerUnit, // Salva custo fixo rateado
      finalPrice: form.finalPrice || suggestedPrice,
    };

    if (editingId) {
      update("products", editingId, productData);
      setEditingId(null);
    } else {
      add("products", productData);
    }
    setForm(emptyForm);
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      description: product.description || "",
      laborCost: product.laborCost,
      tax: product.tax,
      commission: product.commission,
      platformFee: (product as any).platformFee || 0,
      margin: product.margin,
      finalPrice: product.finalPrice,
      variationTypes: product.variationTypes || [],
      variations: product.variations || [],
      materials: product.materials || [],
      selectedExtras: product.selectedExtras || [],
    });
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const toggleExpand = (id: number) => setExpandedCardId(expandedCardId === id ? null : id);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Precificação de Produtos</h2>

      {/* Product Form */}
      <Card className={editingId ? "border-l-4 border-l-warning bg-warning/5" : ""}>
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          {editingId ? "Editando Produto" : "Novo Produto"}
        </h3>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            label="Nome do Produto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Sabonete Artesanal"
          />
          <Input
            label="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ex: Sabonete vegano de lavanda"
          />
        </div>

        {/* Materials Section */}
        <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Package size={18} className="text-primary" /> Materiais/Insumos
            </h4>
            <Button onClick={handleAddMaterial} variant="secondary" className="h-8 text-xs">
              <Plus size={14} /> Adicionar
            </Button>
          </div>
          {form.materials.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum material adicionado.</p>
          ) : (
            <div className="space-y-2">
              {form.materials.map((pm) => {
                const mat = materials.find((m) => m.id == pm.materialId);
                const price = mat?.price || (mat?.quotes[0]?.price || 0);
                const unitCost = mat ? price / (mat.yield || 1) : 0;
                const lineCost = unitCost * pm.quantity;
                return (
                  <div
                    key={pm.id}
                    className="flex items-center gap-3 bg-card p-2 rounded border border-border"
                  >
                    <select
                      className="flex-1 border border-input rounded p-1.5 text-sm bg-card text-foreground"
                      value={pm.materialId}
                      onChange={(e) => handleUpdateMaterial(pm.id, "materialId", Number(e.target.value))}
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.useUnit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="w-20 border border-input rounded p-1.5 text-sm text-center bg-card text-foreground"
                      value={pm.quantity}
                      onChange={(e) => handleUpdateMaterial(pm.id, "quantity", Number(e.target.value))}
                      min={0}
                      step={0.01}
                    />
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      R$ {safeFixed(lineCost)}
                    </span>
                    <button
                      onClick={() => handleRemoveMaterial(pm.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
              <div className="text-right text-sm font-semibold text-foreground pt-2 border-t border-border">
                Subtotal Materiais: R$ {safeFixed(materialCost)}
              </div>
            </div>
          )}
        </div>

        {/* Extras Section */}
        <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Gift size={18} className="text-accent" /> Embalagens/Extras
            </h4>
            <Button onClick={handleAddExtra} variant="secondary" className="h-8 text-xs">
              <Plus size={14} /> Adicionar
            </Button>
          </div>
          {form.selectedExtras.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum extra adicionado.</p>
          ) : (
            <div className="space-y-2">
              {form.selectedExtras.map((pe) => {
                const ext = extras.find((e) => e.id == pe.extraId);
                const price = ext?.price || (ext?.quotes[0]?.price || 0);
                const unitCost = ext ? price / (ext.yield || 1) : 0;
                const lineCost = unitCost * pe.quantity;
                return (
                  <div
                    key={pe.id}
                    className="flex items-center gap-3 bg-card p-2 rounded border border-border"
                  >
                    <select
                      className="flex-1 border border-input rounded p-1.5 text-sm bg-card text-foreground"
                      value={pe.extraId}
                      onChange={(e) => handleUpdateExtra(pe.id, "extraId", Number(e.target.value))}
                    >
                      {extras.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} ({ex.useUnit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="w-20 border border-input rounded p-1.5 text-sm text-center bg-card text-foreground"
                      value={pe.quantity}
                      onChange={(e) => handleUpdateExtra(pe.id, "quantity", Number(e.target.value))}
                      min={0}
                      step={0.01}
                    />
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      R$ {safeFixed(lineCost)}
                    </span>
                    <button
                      onClick={() => handleRemoveExtra(pe.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
              <div className="text-right text-sm font-semibold text-foreground pt-2 border-t border-border">
                Subtotal Extras: R$ {safeFixed(extrasCost)}
              </div>
            </div>
          )}
        </div>

        {/* Variations Section */}
        <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
          <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <Layers size={18} className="text-success" /> Variações
          </h4>
          
          {/* Add new variation type */}
          <div className="flex gap-3 mb-4">
            <Input
              label="Nome do Tipo de Variação"
              value={newVariationType}
              onChange={(e) => setNewVariationType(e.target.value)}
              placeholder="Ex: Cor, Tamanho, Aroma"
              className="flex-1"
            />
            <div className="flex items-end">
              <Button onClick={handleAddVariationType} variant="success" className="h-10">
                <Plus size={16} /> Criar Tipo
              </Button>
            </div>
          </div>

          {/* Variation Types List */}
          {form.variationTypes.length > 0 && (
            <div className="space-y-4">
              {form.variationTypes.map((vt, vtIndex) => (
                <div key={vt.id} className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{vt.name}</span>
                      <Badge color="blue" className="text-xs">{vt.options.length} opções</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveVariationType(vt.id, "up")}
                        disabled={vtIndex === 0}
                        className="p-1 hover:bg-muted rounded disabled:opacity-30"
                        title="Mover para cima"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMoveVariationType(vt.id, "down")}
                        disabled={vtIndex === form.variationTypes.length - 1}
                        className="p-1 hover:bg-muted rounded disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveVariationType(vt.id)}
                        className="p-1 hover:bg-destructive/10 text-destructive rounded"
                        title="Remover tipo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Options list */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {vt.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className="flex items-center gap-1 bg-muted border border-border rounded-full px-2 py-1 text-sm"
                      >
                        <button
                          onClick={() => handleMoveOption(vt.id, optIndex, "up")}
                          disabled={optIndex === 0}
                          className="p-0.5 hover:bg-card rounded disabled:opacity-30"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <span>{option}</span>
                        <button
                          onClick={() => handleMoveOption(vt.id, optIndex, "down")}
                          disabled={optIndex === vt.options.length - 1}
                          className="p-0.5 hover:bg-card rounded disabled:opacity-30"
                        >
                          <ChevronDown size={12} />
                        </button>
                        <button
                          onClick={() => handleRemoveOptionFromType(vt.id, optIndex)}
                          className="p-0.5 hover:text-destructive"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add option input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border border-input rounded px-2 py-1 text-sm bg-card text-foreground"
                      placeholder="Nova opção..."
                      value={newOptionForType[vt.id] || ""}
                      onChange={(e) => setNewOptionForType({ ...newOptionForType, [vt.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOptionToType(vt.id);
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleAddOptionToType(vt.id)}
                      variant="secondary"
                      className="h-8 text-xs"
                    >
                      <Plus size={14} /> Adicionar
                    </Button>
                  </div>
                </div>
              ))}

              {form.variations.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase">
                    Combinações Geradas ({form.variations.filter((v) => v.active).length} ativas) - Clique para ativar/desativar, botão editar para personalizar materiais
                  </p>
                  <div className="space-y-2">
                    {form.variations.map((v) => {
                      const varCost = getVariationCost(v);
                      const isEditing = editingVariationId === v.id;
                      return (
                        <div key={v.id} className="border border-border rounded-lg overflow-hidden">
                          <div
                            className={`flex items-center justify-between p-2 ${
                              v.active ? "bg-success/10" : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggleVariation(v.id)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                                  v.active
                                    ? "bg-success text-success-foreground border-success"
                                    : "bg-muted text-muted-foreground border-border line-through"
                                }`}
                              >
                                {v.name}
                              </button>
                              <span className="text-xs text-muted-foreground">
                                Custo: <strong className="text-foreground">R$ {safeFixed(varCost)}</strong>
                              </span>
                            </div>
                            <button
                              onClick={() => setEditingVariationId(isEditing ? null : v.id)}
                              className={`text-xs px-2 py-1 rounded border transition-all ${
                                isEditing
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card text-muted-foreground border-border hover:border-primary"
                              }`}
                            >
                              <Pencil size={12} className="inline mr-1" />
                              {isEditing ? "Fechar" : "Editar Materiais"}
                            </button>
                          </div>

                          {isEditing && (
                            <div className="p-3 bg-card border-t border-border space-y-3">
                              {/* Variation Materials */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                                    Materiais desta variação
                                  </span>
                                  <Button
                                    onClick={() => handleAddVariationMaterial(v.id)}
                                    variant="secondary"
                                    className="h-6 text-xs px-2"
                                  >
                                    <Plus size={12} /> Material
                                  </Button>
                                </div>
                                {(v.materials || []).length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">Sem materiais específicos</p>
                                ) : (
                                  <div className="space-y-1">
                                    {(v.materials || []).map((pm) => {
                                      const mat = materials.find((m) => m.id == pm.materialId);
                                      return (
                                        <div key={pm.id} className="flex items-center gap-2 text-xs">
                                          <select
                                            className="flex-1 border border-input rounded p-1 bg-card text-foreground text-xs"
                                            value={pm.materialId}
                                            onChange={(e) =>
                                              handleUpdateVariationMaterial(v.id, pm.id, "materialId", Number(e.target.value))
                                            }
                                          >
                                            {materials.map((m) => (
                                              <option key={m.id} value={m.id}>
                                                {m.name}
                                              </option>
                                            ))}
                                          </select>
                                          <input
                                            type="number"
                                            className="w-16 border border-input rounded p-1 text-xs text-center bg-card text-foreground"
                                            value={pm.quantity}
                                            onChange={(e) =>
                                              handleUpdateVariationMaterial(v.id, pm.id, "quantity", Number(e.target.value))
                                            }
                                            min={0}
                                            step={0.01}
                                          />
                                          <span className="text-muted-foreground">{mat?.useUnit}</span>
                                          <button
                                            onClick={() => handleRemoveVariationMaterial(v.id, pm.id)}
                                            className="text-muted-foreground hover:text-destructive"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Variation Extras */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                                    Extras desta variação
                                  </span>
                                  <Button
                                    onClick={() => handleAddVariationExtra(v.id)}
                                    variant="secondary"
                                    className="h-6 text-xs px-2"
                                  >
                                    <Plus size={12} /> Extra
                                  </Button>
                                </div>
                                {(v.selectedExtras || []).length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">Sem extras específicos</p>
                                ) : (
                                  <div className="space-y-1">
                                    {(v.selectedExtras || []).map((pe) => {
                                      const ext = extras.find((e) => e.id == pe.extraId);
                                      return (
                                        <div key={pe.id} className="flex items-center gap-2 text-xs">
                                          <select
                                            className="flex-1 border border-input rounded p-1 bg-card text-foreground text-xs"
                                            value={pe.extraId}
                                            onChange={(e) =>
                                              handleUpdateVariationExtra(v.id, pe.id, "extraId", Number(e.target.value))
                                            }
                                          >
                                            {extras.map((ex) => (
                                              <option key={ex.id} value={ex.id}>
                                                {ex.name}
                                              </option>
                                            ))}
                                          </select>
                                          <input
                                            type="number"
                                            className="w-16 border border-input rounded p-1 text-xs text-center bg-card text-foreground"
                                            value={pe.quantity}
                                            onChange={(e) =>
                                              handleUpdateVariationExtra(v.id, pe.id, "quantity", Number(e.target.value))
                                            }
                                            min={0}
                                            step={0.01}
                                          />
                                          <span className="text-muted-foreground">{ext?.useUnit}</span>
                                          <button
                                            onClick={() => handleRemoveVariationExtra(v.id, pe.id)}
                                            className="text-muted-foreground hover:text-destructive"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Calculator size={18} className="text-primary" /> Cálculo de Preço
          </h4>
          
          {/* Custo Fixo Rateado - Info */}
          {fixedCostPerUnit > 0 && (
            <div className="mb-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-xs text-muted-foreground">
                <strong className="text-accent">Custo Fixo Rateado:</strong> R$ {safeFixed(fixedCostPerUnit)} por peça 
                <span className="ml-2 text-muted-foreground/70">(Total: R$ {safeFixed(fixedCosts.total)} ÷ {fixedCosts.estimatedSales} peças/mês)</span>
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <Input
              label="Mão de Obra (R$)"
              type="number"
              value={form.laborCost}
              onChange={(e) => setForm({ ...form, laborCost: Number(e.target.value) })}
              min={0}
              step={0.01}
            />
            <Input
              label="Imposto (%)"
              type="number"
              value={form.tax}
              onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })}
              min={0}
              max={100}
            />
            <Input
              label="Comissão (%)"
              type="number"
              value={form.commission}
              onChange={(e) => setForm({ ...form, commission: Number(e.target.value) })}
              min={0}
              max={100}
            />
            <Input
              label="Taxa Sistema (%)"
              type="number"
              value={form.platformFee}
              onChange={(e) => setForm({ ...form, platformFee: Number(e.target.value) })}
              min={0}
              max={100}
            />
            <Input
              label="Margem Desejada (%)"
              type="number"
              value={form.margin}
              onChange={(e) => setForm({ ...form, margin: Number(e.target.value) })}
              min={0}
              max={100}
            />
          </div>

          {/* Cost Breakdown */}
          <div className="p-4 bg-card rounded-lg border border-border">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-3">Decomposição de Custos</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-muted p-3 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Package size={14} className="text-primary" />
                  <p className="text-xs text-muted-foreground uppercase">Materiais</p>
                </div>
                <p className="text-sm font-bold text-foreground">R$ {safeFixed(materialCost)}</p>
              </div>
              <div className="bg-muted p-3 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Gift size={14} className="text-primary" />
                  <p className="text-xs text-muted-foreground uppercase">Extras</p>
                </div>
                <p className="text-sm font-bold text-foreground">R$ {safeFixed(extrasCost)}</p>
              </div>
              <div className="bg-muted p-3 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calculator size={14} className="text-primary" />
                  <p className="text-xs text-muted-foreground uppercase">Mão de Obra</p>
                </div>
                <p className="text-sm font-bold text-foreground">R$ {safeFixed(form.laborCost)}</p>
              </div>
              <div className="bg-muted p-3 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Layers size={14} className="text-primary" />
                  <p className="text-xs text-muted-foreground uppercase">Custo Fixo</p>
                </div>
                <p className="text-sm font-bold text-foreground">R$ {safeFixed(fixedCostPerUnit)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Custo Total</p>
                <p className="text-lg font-bold text-foreground">R$ {safeFixed(totalCost)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Preço Sugerido</p>
                <p className="text-lg font-bold text-success">R$ {safeFixed(suggestedPrice)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Preço Final</p>
                <input
                  type="number"
                  className="w-full text-lg font-bold text-center border border-input rounded p-1 bg-card text-primary"
                  value={form.finalPrice || ""}
                  onChange={(e) => setForm({ ...form, finalPrice: Number(e.target.value) })}
                  placeholder={safeFixed(suggestedPrice)}
                  min={0}
                  step={0.01}
                />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Margem Real</p>
                <p
                  className={`text-lg font-bold ${
                    realMargin >= form.margin ? "text-success" : "text-destructive"
                  }`}
                >
                  {safeFixed(realMargin)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          {editingId && (
            <Button onClick={handleCancel} variant="ghost">
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} variant={editingId ? "warning" : "success"}>
            <Save size={18} /> {editingId ? "Atualizar Produto" : "Salvar Produto"}
          </Button>
        </div>
      </Card>

      {/* Search */}
      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar produto..." />

      {/* Products List */}
      <div className="flex flex-col gap-3">
        {filteredProducts.map((p) => {
          const isExpanded = expandedCardId === p.id;
          return (
            <Card
              key={p.id}
              className={`relative transition-all cursor-pointer hover:border-primary/30 ${
                isExpanded ? "ring-2 ring-primary/20" : ""
              } p-0 overflow-hidden`}
            >
              <div
                className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4"
                onClick={() => toggleExpand(p.id)}
              >
                <div className="flex-grow">
                  <h4 className="font-bold text-foreground text-lg">{p.name}</h4>
                  <p className="text-sm text-muted-foreground">{p.description || "Sem descrição"}</p>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="text-muted-foreground">
                      Custo: <strong className="text-foreground">R$ {safeFixed(p.totalCost)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Preço: <strong className="text-success">R$ {safeFixed(p.finalPrice)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Margem: <strong className={p.realMargin >= p.margin ? "text-success" : "text-destructive"}>
                        {safeFixed(p.realMargin)}%
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {p.variations && p.variations.filter((v) => v.active).length > 0 && (
                    <Badge color="purple">{p.variations.filter((v) => v.active).length} variações</Badge>
                  )}
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted p-4 animate-fade-in cursor-default">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-card p-3 rounded border border-border">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">
                        Materiais ({p.materials?.length || 0})
                      </p>
                      {p.materials && p.materials.length > 0 ? (
                        <div className="space-y-1">
                          {p.materials.map((pm) => {
                            const mat = materials.find((m) => m.id == pm.materialId);
                            const price = mat ? getMaterialPrice(mat) : 0;
                            const unitCost = mat ? getUnitCost(price, mat.yield || 1) : 0;
                            return (
                              <div key={pm.id} className="text-sm flex justify-between items-center">
                                <span className="text-foreground">{mat?.name || "?"}</span>
                                <span className="text-muted-foreground">{pm.quantity} × R$ {safeFixed(unitCost)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Nenhum</p>
                      )}
                    </div>
                    <div className="bg-card p-3 rounded border border-border">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">
                        Extras ({p.selectedExtras?.length || 0})
                      </p>
                      {p.selectedExtras && p.selectedExtras.length > 0 ? (
                        <div className="space-y-1">
                          {p.selectedExtras.map((pe) => {
                            const ext = extras.find((e) => e.id == pe.extraId);
                            const price = ext ? getExtraPrice(ext) : 0;
                            const unitCost = ext ? getUnitCost(price, ext.yield || 1) : 0;
                            return (
                              <div key={pe.id} className="text-sm flex justify-between items-center">
                                <span className="text-foreground">{ext?.name || "?"}</span>
                                <span className="text-muted-foreground">{pe.quantity} × R$ {safeFixed(unitCost)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Nenhum</p>
                      )}
                    </div>
                    <div className="bg-card p-3 rounded border border-border">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Decomposição de Custos</p>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Materiais:</span>{" "}
                          <strong>R$ {safeFixed(p.materialCost || 0)}</strong>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Extras:</span>{" "}
                          <strong>R$ {safeFixed(p.extrasCost || 0)}</strong>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Mão de Obra:</span>{" "}
                          <strong>R$ {safeFixed(p.laborCost)}</strong>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Custo Fixo:</span>{" "}
                          <strong>R$ {safeFixed(p.fixedCostPerUnit || 0)}</strong>
                        </p>
                        <hr className="border-border my-1" />
                        <p>
                          <span className="text-muted-foreground">Imposto:</span> <strong>{p.tax}%</strong>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Comissão:</span>{" "}
                          <strong>{p.commission}%</strong>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Taxa Sistema:</span>{" "}
                          <strong>{p.platformFee || 0}%</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {p.variations && p.variations.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">
                        Variações (clique para ativar/desativar)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {p.variations.map((v) => (
                          <button
                            key={v.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleProductVariation(p.id, v.id);
                            }}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                              v.active
                                ? "bg-success text-success-foreground border-success hover:bg-success/80"
                                : "bg-muted text-muted-foreground border-border line-through hover:bg-muted/80"
                            }`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(p);
                      }}
                      variant="ghost"
                      className="text-primary hover:bg-primary/10 h-8 text-xs"
                    >
                      <Pencil size={14} /> Editar
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove("products", p.id);
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
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nenhum produto cadastrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};