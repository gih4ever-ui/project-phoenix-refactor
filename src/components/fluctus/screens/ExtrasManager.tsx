import { useState } from "react";
import { Plus, Trash2, Pencil, Star, Sparkles, X, Save } from "lucide-react";
import { Card, Button, Input, SearchBar, Badge, ConfirmDialog } from "../ui";
import { safeFixed } from "@/lib/utils";
import { DatabaseHook } from "@/hooks/useLocalData";
import { Quote } from "@/types/fluctus";

interface ExtrasManagerProps {
  db: DatabaseHook;
}

export const ExtrasManager = ({ db }: ExtrasManagerProps) => {
  const { data, add, update, remove } = db;
  const { extras, suppliers } = data;
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [editingExtraId, setEditingExtraId] = useState<number | null>(null);
  const [newExtra, setNewExtra] = useState({
    name: "",
    buyUnit: "un",
    useUnit: "un",
    yield: 1,
    quotes: [] as Quote[],
  });
  const [quoteForm, setQuoteForm] = useState({ supplierId: "", price: "", obs: "" });
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);

  const handleSaveExtra = () => {
    if (!newExtra.name) return;
    if (editingExtraId) {
      update("extras", editingExtraId, newExtra);
      setEditingExtraId(null);
    } else {
      add("extras", { ...newExtra, createdAt: new Date() });
    }
    setNewExtra({ name: "", buyUnit: "un", useUnit: "un", yield: 1, quotes: [] });
  };

  const handleEditExtra = (ext: any) => {
    setNewExtra(ext);
    setEditingExtraId(ext.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveQuote = (extraId: number, currentQuotes: Quote[]) => {
    if (!quoteForm.supplierId || !quoteForm.price) return;
    let updatedQuotes: Quote[];
    if (editingQuoteId) {
      updatedQuotes = currentQuotes.map((q) =>
        q.id === editingQuoteId
          ? { ...quoteForm, id: editingQuoteId, price: parseFloat(quoteForm.price), supplierId: quoteForm.supplierId }
          : q
      );
      setEditingQuoteId(null);
    } else {
      updatedQuotes = [
        ...currentQuotes,
        { ...quoteForm, id: Date.now(), price: parseFloat(quoteForm.price), supplierId: quoteForm.supplierId },
      ];
    }
    update("extras", extraId, { quotes: updatedQuotes });
    setQuoteForm({ supplierId: "", price: "", obs: "" });
  };

  const handleDeleteQuote = (extraId: number, quoteId: number, currentQuotes: Quote[]) => {
    const updatedQuotes = currentQuotes.filter((q) => q.id !== quoteId);
    update("extras", extraId, { quotes: updatedQuotes });
  };

  const sortedSuppliers = [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
  const filteredExtras = extras.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Embalagens & Extras</h2>

      <Card>
        <h3 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">
          {editingExtraId ? "Editar Item" : "Novo Item"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6">
            <Input
              label="Nome do Item"
              value={newExtra.name}
              onChange={(e) => setNewExtra({ ...newExtra, name: e.target.value })}
              placeholder="Ex: Caixa Padrão, Tag"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Unid. Compra"
              placeholder="ex: Milheiro, Un"
              value={newExtra.buyUnit}
              onChange={(e) => setNewExtra({ ...newExtra, buyUnit: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Rendimento"
              type="number"
              placeholder="Qtd"
              value={newExtra.yield}
              onChange={(e) => setNewExtra({ ...newExtra, yield: parseFloat(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Unid. Uso"
              placeholder="ex: un"
              value={newExtra.useUnit}
              onChange={(e) => setNewExtra({ ...newExtra, useUnit: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {editingExtraId && (
            <Button
              onClick={() => {
                setEditingExtraId(null);
                setNewExtra({ name: "", buyUnit: "un", useUnit: "un", yield: 1, quotes: [] });
              }}
              variant="ghost"
            >
              Cancelar
            </Button>
          )}
          <Button onClick={handleSaveExtra} variant="success">
            {editingExtraId ? "Atualizar" : "Cadastrar Item"}
          </Button>
        </div>
      </Card>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar item..." />

      <div className="grid grid-cols-1 gap-4">
        {filteredExtras.map((ext) => {
          const sortedQuotes = [...(ext.quotes || [])].sort((a, b) => a.price - b.price);
          const isEditing = editingExtraId === ext.id;

          return (
            <Card key={ext.id} className="border-l-4 border-l-badge-purple p-0 overflow-hidden shadow-md">
              <div className="flex flex-col p-5 bg-card">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
                  <div className="flex-grow">
                    <h4 className="text-xl font-bold text-foreground">{ext.name}</h4>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 self-start">
                    <Button
                      variant="outline"
                      className="text-sm h-8 px-3"
                      onClick={() => setEditingExtraId(isEditing ? null : ext.id)}
                    >
                      {isEditing ? "Fechar" : "Cotações"}
                    </Button>
                    <button
                      onClick={() => handleEditExtra(ext)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ open: true, id: ext.id })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-row flex-wrap gap-6 text-sm text-muted-foreground mb-3 items-center">
                  <span className="bg-muted px-2 py-1 rounded">
                    Rendimento: <b>{ext.yield} {ext.useUnit}</b> por {ext.buyUnit}
                  </span>
                </div>
                {!isEditing && sortedQuotes.length > 0 && (
                  <div className="w-full border-t border-border/50 mt-1 pt-2 flex flex-wrap gap-2">
                    {sortedQuotes.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border ${
                          idx === 0
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                        title={q.obs}
                      >
                        {idx === 0 && <Star size={12} className="text-badge-gold fill-current" />}
                        <span className="font-semibold">
                          {suppliers.find((s) => s.id == q.supplierId)?.name}
                        </span>
                        <span className="font-bold">
                          R$ {safeFixed(q.price)}/{ext.buyUnit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="bg-badge-purple/5 border-t border-badge-purple/20 p-5 animate-fade-in">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-bold text-sm text-badge-purple">Cotações Cadastradas</h5>
                    <Button
                      onClick={() => setEditingQuoteId(null)}
                      className="h-7 px-2 text-xs bg-badge-purple hover:bg-badge-purple/90 text-white"
                    >
                      <Plus size={12} /> Nova
                    </Button>
                  </div>
                  <div className="space-y-2 mb-4 bg-card rounded-lg border border-border p-1 shadow-sm">
                    {sortedQuotes.map((q, idx) => {
                      const supName = suppliers.find((s) => s.id == q.supplierId)?.name || "Desconhecido";
                      return (
                        <div
                          key={q.id}
                          className={`flex justify-between items-center text-sm p-3 border-b last:border-0 border-border ${
                            idx === 0 ? "bg-success/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {idx === 0 && <Sparkles size={14} className="text-badge-gold fill-current" />}
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{supName}</span>
                              {q.obs && <span className="text-xs text-muted-foreground italic">{q.obs}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-foreground">R$ {safeFixed(q.price)}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setQuoteForm({ supplierId: String(q.supplierId), price: String(q.price), obs: q.obs || "" });
                                  setEditingQuoteId(q.id);
                                }}
                                className="p-1.5 hover:bg-primary/10 rounded text-primary"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteQuote(ext.id, q.id, ext.quotes)}
                                className="p-1.5 hover:bg-destructive/10 rounded text-destructive"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {sortedQuotes.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">
                        Nenhuma cotação cadastrada.
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex flex-col md:flex-row gap-2 items-end p-3 rounded-lg border shadow-sm ${
                      editingQuoteId ? "bg-warning/10 border-warning/30" : "bg-card border-badge-purple/30"
                    }`}
                  >
                    <div className="w-full md:w-1/3">
                      <label className="text-xs font-bold text-muted-foreground ml-1 mb-1 block">
                        Fornecedor
                      </label>
                      <select
                        className="w-full border border-input rounded-lg p-2 text-sm bg-card text-foreground outline-none"
                        value={quoteForm.supplierId}
                        onChange={(e) => setQuoteForm({ ...quoteForm, supplierId: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        {sortedSuppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-1/4">
                      <label className="text-xs font-bold text-muted-foreground ml-1 mb-1 block">
                        Preço ({ext.buyUnit})
                      </label>
                      <input
                        type="number"
                        className="w-full border border-input rounded-lg p-2 text-sm outline-none bg-card text-foreground"
                        value={quoteForm.price}
                        onChange={(e) => setQuoteForm({ ...quoteForm, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="w-full md:flex-1">
                      <label className="text-xs font-bold text-muted-foreground ml-1 mb-1 block">
                        Obs
                      </label>
                      <input
                        className="w-full border border-input rounded-lg p-2 text-sm outline-none bg-card text-foreground"
                        value={quoteForm.obs}
                        onChange={(e) => setQuoteForm({ ...quoteForm, obs: e.target.value })}
                        placeholder="Ex: À vista"
                      />
                    </div>
                    <div className="w-full md:w-auto flex justify-end mt-2 md:mt-0">
                      <Button
                        onClick={() => handleSaveQuote(ext.id, ext.quotes)}
                        variant={editingQuoteId ? "warning" : "success"}
                        className="h-10"
                      >
                        {editingQuoteId ? <Save size={16} /> : <Plus size={16} />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, id: open ? deleteConfirm.id : null })}
        title="Excluir Extra"
        description="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
        onConfirm={() => {
          if (deleteConfirm.id) remove("extras", deleteConfirm.id);
          setDeleteConfirm({ open: false, id: null });
        }}
      />
    </div>
  );
};
