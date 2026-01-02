import { useState } from "react";
import { Plus, Trash2, Pencil, Star, Sparkles, X, Save, Wallet } from "lucide-react";
import { Card, Button, Input, SearchBar } from "../ui";
import { safeFixed } from "@/lib/utils";
import { DatabaseHook } from "@/hooks/useLocalData";

interface FixedCostsProps {
  db: DatabaseHook;
}

export const FixedCosts = ({ db }: FixedCostsProps) => {
  const { data, updateFixedCosts } = db;
  const { fixedCosts } = data;
  const [newItem, setNewItem] = useState({ name: "", value: "" });
  const [editingCostId, setEditingCostId] = useState<number | null>(null);

  const addItem = () => {
    if (!newItem.name || !newItem.value) return;
    const val = parseFloat(newItem.value);
    let newItems;
    if (editingCostId) {
      newItems = fixedCosts.items.map((item) =>
        item.id === editingCostId ? { ...newItem, value: val, id: editingCostId } : item
      );
      setEditingCostId(null);
    } else {
      newItems = [...(fixedCosts.items || []), { ...newItem, value: val, id: Date.now() }];
    }
    const newTotal = newItems.reduce((acc, item) => acc + item.value, 0);
    updateFixedCosts({ items: newItems, total: newTotal });
    setNewItem({ name: "", value: "" });
  };

  const handleEdit = (item: any) => {
    setNewItem({ name: item.name, value: item.value });
    setEditingCostId(item.id);
  };

  const removeItem = (id: number) => {
    const newItems = fixedCosts.items.filter((i) => i.id !== id);
    const newTotal = newItems.reduce((acc, item) => acc + item.value, 0);
    updateFixedCosts({ items: newItems, total: newTotal });
  };

  const updateEstimate = (val: string) => {
    const numVal = parseFloat(val) || 0;
    updateFixedCosts({ estimatedSales: numVal });
  };

  const costPerUnit =
    fixedCosts.estimatedSales > 0 ? fixedCosts.total / fixedCosts.estimatedSales : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Custos Fixos & Rateio</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Wallet className="text-primary" /> Despesas Mensais
          </h3>
          <div className="flex gap-2 mb-6 items-end">
            <div className="flex-1">
              <Input
                label="Descrição"
                placeholder="Ex: Aluguel"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="w-32">
              <Input
                label="Valor (R$)"
                type="number"
                placeholder="0.00"
                value={newItem.value}
                onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
              />
            </div>
            {editingCostId ? (
              <div className="flex gap-1">
                <Button
                  onClick={() => {
                    setEditingCostId(null);
                    setNewItem({ name: "", value: "" });
                  }}
                  variant="ghost"
                  className="px-3"
                >
                  X
                </Button>
                <Button onClick={addItem} variant="warning" className="px-3">
                  <Save size={18} />
                </Button>
              </div>
            ) : (
              <Button onClick={addItem} variant="success">
                <Plus size={18} />
              </Button>
            )}
          </div>
          <div className="bg-muted rounded-lg border border-border divide-y divide-border max-h-64 overflow-y-auto">
            {fixedCosts.items && fixedCosts.items.length === 0 && (
              <p className="p-4 text-center text-muted-foreground text-sm">
                Nenhuma despesa cadastrada.
              </p>
            )}
            {fixedCosts.items &&
              fixedCosts.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 flex justify-between items-center hover:bg-card transition-colors ${
                    editingCostId === item.id ? "bg-warning/10" : ""
                  }`}
                >
                  <span className="font-medium text-foreground">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground mr-2">R$ {safeFixed(item.value)}</span>
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-primary hover:text-primary/80 p-1"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Total Mensal:</span>
            <span className="text-2xl font-bold text-foreground">R$ {safeFixed(fixedCosts.total)}</span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <h3 className="text-lg font-bold text-primary mb-2">Cálculo de Rateio</h3>
            <Input
              label="Estimativa de Vendas (Peças/Mês)"
              type="number"
              className="bg-card"
              value={fixedCosts.estimatedSales}
              onChange={(e) => updateEstimate(e.target.value)}
            />
            <div className="mt-8 text-center p-8 bg-card rounded-xl shadow-sm border border-primary/10">
              <p className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-2">
                Custo Fixo por Peça
              </p>
              <p className="text-5xl font-extrabold text-primary">R$ {safeFixed(costPerUnit)}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
