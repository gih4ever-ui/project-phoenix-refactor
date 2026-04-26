import { useRef, useState } from "react";
import { Camera, Loader2, Sparkles, X, Check, AlertCircle, Trash2, UserPlus, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button, Input } from "./ui";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Material, Extra, Supplier, Invoice, InvoiceItem } from "@/types/fluctus";

interface ParsedItem {
  description: string;
  qty: number;
  unitPrice: number;
  totalPrice?: number | null;
  suggestedType: "material" | "extra" | "other";
  matchedId?: number | string | null;
}

interface ParsedInvoice {
  supplierName?: string | null;
  supplierMatchedId?: number | string | null;
  date?: string | null;
  discount?: number | null;
  discountType?: "value" | "percent" | null;
  items: ParsedItem[];
}

interface InvoicePhotoImporterProps {
  open: boolean;
  onClose: () => void;
  materials: Material[];
  extras: Extra[];
  suppliers: Supplier[];
  /** Called with the parsed/edited invoice data when the user confirms. */
  onConfirm: (invoice: {
    supplierId: number | string;
    discount: number;
    discountType: "value" | "percent";
    items: InvoiceItem[];
  }) => void;
}

type EditableItem = ParsedItem & { _id: string };

export default function InvoicePhotoImporter({
  open,
  onClose,
  materials,
  extras,
  suppliers,
  onConfirm,
}: InvoicePhotoImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [supplierId, setSupplierId] = useState<number | string>("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"value" | "percent">("percent");

  if (!open) return null;

  const reset = () => {
    setImageDataUrl(null);
    setParsed(null);
    setItems([]);
    setSupplierId("");
    setDiscount(0);
    setDiscountType("percent");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Envie uma imagem (JPG ou PNG) da nota fiscal.",
        variant: "destructive",
      });
      return;
    }
    // Max ~8MB to keep payloads sane
    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: "Imagem muito grande",
        description: "Use uma imagem com até 8MB.",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImageDataUrl(dataUrl);
      await processImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (dataUrl: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-invoice-image", {
        body: {
          imageDataUrl: dataUrl,
          materials: materials.map((m) => ({ id: m.id, name: m.name })),
          extras: extras.map((e) => ({ id: e.id, name: e.name })),
          suppliers: suppliers.map((s) => ({ id: s.id, name: s.name })),
        },
      });

      if (error) {
        // Try to surface a user-friendly message from the function response
        const msg = (error as any)?.context?.error || error.message || "Erro ao ler a nota.";
        toast({ title: "Falha na leitura", description: msg, variant: "destructive" });
        return;
      }

      const result = data?.data as ParsedInvoice | undefined;
      if (!result || !Array.isArray(result.items)) {
        toast({
          title: "Nota não reconhecida",
          description: "A IA não conseguiu extrair itens. Tente uma foto mais nítida.",
          variant: "destructive",
        });
        return;
      }

      setParsed(result);
      setItems(
        result.items.map((it, idx) => ({
          ...it,
          _id: `${Date.now()}-${idx}`,
          // If suggested type is material/extra but no match, fall back to "other"
          suggestedType:
            (it.suggestedType === "material" || it.suggestedType === "extra") && !it.matchedId
              ? "other"
              : it.suggestedType,
        })),
      );
      if (result.supplierMatchedId) {
        setSupplierId(result.supplierMatchedId);
      }
      if (typeof result.discount === "number" && result.discount > 0) {
        setDiscount(result.discount);
        if (result.discountType === "value" || result.discountType === "percent") {
          setDiscountType(result.discountType);
        }
      }
      toast({
        title: "Nota lida com sucesso",
        description: `${result.items.length} itens extraídos. Revise e confirme.`,
      });
    } catch (err) {
      toast({
        title: "Erro inesperado",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (id: string, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((it) => (it._id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it._id !== id));
  };

  const handleConfirm = () => {
    if (!supplierId) {
      toast({ title: "Selecione o fornecedor", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Adicione pelo menos 1 item", variant: "destructive" });
      return;
    }

    const invoiceItems: InvoiceItem[] = items.map((it) => {
      if (it.suggestedType === "other") {
        return {
          id: 0,
          type: "other",
          qty: it.qty,
          price: it.unitPrice,
          description: it.description,
          includeInTotal: true,
        };
      }
      return {
        id: Number(it.matchedId) || 0,
        type: it.suggestedType,
        qty: it.qty,
        price: it.unitPrice,
        includeInTotal: true,
      };
    });

    onConfirm({
      supplierId,
      discount,
      discountType,
      items: invoiceItems,
    });
    reset();
  };

  const totalEstimated = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-3xl my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Importar Nota Fiscal por Foto</h2>
          </div>
          <Button variant="ghost" className="!p-2" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {!imageDataUrl && !parsed && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
              <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Tire uma foto ou envie uma imagem da nota fiscal. A IA vai ler os itens automaticamente.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-4 h-4 mr-2" />
                Escolher imagem
              </Button>
              <p className="text-xs text-muted-foreground">JPG ou PNG, até 8MB</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Lendo nota fiscal com IA...</p>
            </div>
          )}

          {parsed && !loading && (
            <>
              {/* Preview thumbnail */}
              {imageDataUrl && (
                <div className="flex gap-3 items-start">
                  <img
                    src={imageDataUrl}
                    alt="Nota"
                    className="w-24 h-24 object-cover rounded border"
                  />
                  <div className="flex-1 text-xs text-muted-foreground space-y-1">
                    {parsed.supplierName && <div>Fornecedor lido: <strong>{parsed.supplierName}</strong></div>}
                    {parsed.date && <div>Data: <strong>{parsed.date}</strong></div>}
                    <div>{items.length} itens extraídos</div>
                  </div>
                  <Button
                    variant="outline"
                    className="!px-3 !py-1 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Trocar foto
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {/* Supplier selection */}
              <div>
                <label className="text-xs text-muted-foreground">Fornecedor *</label>
                <select
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">Selecione o fornecedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {!supplierId && parsed.supplierName && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    "{parsed.supplierName}" não casou com nenhum fornecedor cadastrado. Selecione manualmente.
                  </p>
                )}
              </div>

              {/* Items list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Itens da nota</h3>
                  <span className="text-xs text-muted-foreground">
                    Total estimado: R$ {totalEstimated.toFixed(2)}
                  </span>
                </div>

                {items.map((it) => {
                  const catalog = it.suggestedType === "material" ? materials : extras;
                  return (
                    <div key={it._id} className="border rounded-md p-3 space-y-2 bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs text-muted-foreground italic flex-1">
                          📝 Lido: "{it.description}"
                        </div>
                        <Button
                          variant="ghost"
                          className="!p-1 h-6 w-6"
                          onClick={() => removeItem(it._id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-3">
                          <label className="text-xs text-muted-foreground">Tipo</label>
                          <select
                            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                            value={it.suggestedType}
                            onChange={(e) =>
                              updateItem(it._id, {
                                suggestedType: e.target.value as "material" | "extra" | "other",
                                matchedId: null,
                              })
                            }
                          >
                            <option value="material">Material</option>
                            <option value="extra">Extra</option>
                            <option value="other">Outro</option>
                          </select>
                        </div>

                        <div className="sm:col-span-5">
                          <label className="text-xs text-muted-foreground">
                            {it.suggestedType === "other" ? "Descrição" : "Item do catálogo"}
                          </label>
                          {it.suggestedType === "other" ? (
                            <Input
                              value={it.description}
                              onChange={(e) => updateItem(it._id, { description: e.target.value })}
                              className="h-9"
                            />
                          ) : (
                            <select
                              className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                              value={it.matchedId ?? ""}
                              onChange={(e) =>
                                updateItem(it._id, { matchedId: e.target.value || null })
                              }
                            >
                              <option value="">Selecione...</option>
                              {catalog.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-xs text-muted-foreground">Qtd</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={it.qty}
                            onChange={(e) => updateItem(it._id, { qty: Number(e.target.value) || 0 })}
                            className="h-9"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-xs text-muted-foreground">Vlr. unit.</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={it.unitPrice}
                            onChange={(e) => updateItem(it._id, { unitPrice: Number(e.target.value) || 0 })}
                            className="h-9"
                          />
                        </div>
                      </div>

                      {it.suggestedType !== "other" && !it.matchedId && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Selecione um item do catálogo ou troque para "Outro"
                        </p>
                      )}
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    Nenhum item. Tire outra foto ou cadastre manualmente.
                  </p>
                )}
              </div>

              {/* Discount */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Desconto</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tipo de desconto</label>
                  <select
                    className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "value" | "percent")}
                  >
                    <option value="percent">% Percentual</option>
                    <option value="value">R$ Valor fixo</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          {parsed && (
            <Button onClick={handleConfirm} disabled={loading || items.length === 0 || !supplierId}>
              <Check className="w-4 h-4 mr-2" />
              Salvar nota
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
