import { useState, useMemo } from "react";
import { Plus, Trash2, Filter, TrendingUp, TrendingDown, Package, Gift, User, Wrench, ArrowUpDown } from "lucide-react";
import { Card, Button, Badge, Input, SearchBar } from "../ui";
import { safeFixed } from "@/lib/utils";
import { StockMovement, StockMovementType } from "@/types/fluctus";
import { DatabaseHook } from "@/hooks/useLocalData";
import { ConfirmDialog } from "../ui/ConfirmDialog";

const TYPE_CONFIG: Record<StockMovementType, { label: string; icon: typeof Plus; color: string; sign: '+' | '-' | '±' }> = {
  production: { label: 'Produção', icon: Plus, color: 'text-success', sign: '+' },
  sale: { label: 'Venda', icon: TrendingUp, color: 'text-primary', sign: '-' },
  gift: { label: 'Presente', icon: Gift, color: 'text-badge-pink', sign: '-' },
  personal: { label: 'Uso Pessoal', icon: User, color: 'text-warning', sign: '-' },
  adjustment: { label: 'Ajuste', icon: Wrench, color: 'text-muted-foreground', sign: '±' },
};

interface StockManagerProps {
  db: DatabaseHook;
}

export const StockManager = ({ db }: StockManagerProps) => {
  const { data } = db;
  const movements = data.stockMovements || [];
  const products = data.products || [];

  const [showForm, setShowForm] = useState(false);
  const [filterProduct, setFilterProduct] = useState<number | 'all'>('all');
  const [filterType, setFilterType] = useState<StockMovementType | 'all'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'week' | 'month' | 'currentMonth' | 'lastMonth'>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [formProductId, setFormProductId] = useState<number | ''>('');
  const [formType, setFormType] = useState<StockMovementType>('production');
  const [formQty, setFormQty] = useState(1);
  const [formValue, setFormValue] = useState(0);
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Auto-fill value from product registration
  const handleProductChange = (pid: number) => {
    setFormProductId(pid);
    const product = products.find(p => p.id === pid);
    if (product) {
      setFormValue(formType === 'sale' ? (product.finalPrice || 0) : (product.totalCost || 0));
    }
  };

  const handleTypeChange = (type: StockMovementType) => {
    setFormType(type);
    if (formProductId) {
      const product = products.find(p => p.id === formProductId);
      if (product) {
        setFormValue(type === 'sale' ? (product.finalPrice || 0) : (product.totalCost || 0));
      }
    }
  };

  const handleSubmit = () => {
    if (!formProductId || formQty <= 0) return;
    const movement: StockMovement = {
      id: Date.now(),
      productId: formProductId as number,
      date: formDate,
      type: formType,
      quantity: formQty,
      unitValue: formValue,
      description: formDesc || undefined,
    };
    db.add('stockMovements', movement);
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setFormProductId('');
    setFormType('production');
    setFormQty(1);
    setFormValue(0);
    setFormDesc('');
    setFormDate(new Date().toISOString().split('T')[0]);
  };

  const handleDelete = () => {
    if (deleteId !== null) {
      db.remove('stockMovements', deleteId);
      setDeleteId(null);
    }
  };

  // Calculations
  const productSummaries = useMemo(() => {
    const map = new Map<number, {
      produced: number; sold: number; gifted: number; personal: number; adjusted: number;
      totalCostInvested: number; totalRevenue: number; totalFullPriceRevenue: number;
    }>();

    for (const m of movements) {
      if (!map.has(m.productId)) {
        map.set(m.productId, { produced: 0, sold: 0, gifted: 0, personal: 0, adjusted: 0, totalCostInvested: 0, totalRevenue: 0, totalFullPriceRevenue: 0 });
      }
      const s = map.get(m.productId)!;
      const product = products.find(p => p.id === m.productId);

      switch (m.type) {
        case 'production':
          s.produced += m.quantity;
          s.totalCostInvested += m.quantity * m.unitValue;
          break;
        case 'sale':
          s.sold += m.quantity;
          s.totalRevenue += m.quantity * m.unitValue;
          s.totalFullPriceRevenue += m.quantity * (product?.finalPrice || m.unitValue);
          break;
        case 'gift':
          s.gifted += m.quantity;
          break;
        case 'personal':
          s.personal += m.quantity;
          break;
        case 'adjustment':
          s.adjusted += m.quantity; // can be negative
          break;
      }
    }
    return map;
  }, [movements, products]);

  const globalSummary = useMemo(() => {
    let totalAvailable = 0, totalInvested = 0, totalRevenue = 0, totalLost = 0, totalFullPriceRevenue = 0, totalExpectedProfit = 0;
    
    for (const [pid, s] of productSummaries) {
      const product = products.find(p => p.id === pid);
      const available = s.produced - s.sold - s.gifted - s.personal + s.adjusted;
      totalAvailable += available;
      totalInvested += s.totalCostInvested;
      totalRevenue += s.totalRevenue;
      totalFullPriceRevenue += s.totalFullPriceRevenue;
      const unitCost = product?.totalCost || 0;
      totalLost += (s.gifted + s.personal) * unitCost;
      // Expected profit: available pieces × (finalPrice - totalCost) from product registration
      if (product && available > 0) {
        totalExpectedProfit += available * ((product.finalPrice || 0) - (product.totalCost || 0));
      }
    }

    let totalCostOfSold = 0;
    for (const [pid, s] of productSummaries) {
      const product = products.find(p => p.id === pid);
      const unitCost = product?.totalCost || 0;
      totalCostOfSold += s.sold * unitCost;
    }

    return {
      totalAvailable,
      totalInvested,
      totalRevenue,
      totalFullPriceRevenue,
      totalLost,
      totalProfit: totalRevenue - totalCostOfSold,
      totalExpectedProfit,
      totalDiscount: totalFullPriceRevenue - totalRevenue,
    };
  }, [productSummaries, products]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    const now = new Date();
    const inPeriod = (dateStr: string) => {
      if (filterPeriod === 'all') return true;
      const d = new Date(dateStr);
      if (filterPeriod === 'week') {
        const sevenAgo = new Date(now);
        sevenAgo.setDate(now.getDate() - 7);
        return d >= sevenAgo && d <= now;
      }
      if (filterPeriod === 'month') {
        const thirtyAgo = new Date(now);
        thirtyAgo.setDate(now.getDate() - 30);
        return d >= thirtyAgo && d <= now;
      }
      if (filterPeriod === 'currentMonth') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (filterPeriod === 'lastMonth') {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
      }
      return true;
    };
    return movements
      .filter(m => filterProduct === 'all' || m.productId === filterProduct)
      .filter(m => filterType === 'all' || m.type === filterType)
      .filter(m => inPeriod(m.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, filterProduct, filterType, filterPeriod]);

  const getProductName = (pid: number) => products.find(p => p.id === pid)?.name || `Produto #${pid}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-2xl font-bold text-foreground">Produção & Vendas</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus size={16} /> Nova Movimentação
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-primary">
          <p className="text-muted-foreground text-sm font-medium flex items-center gap-1"><Package size={14} /> Peças Disponíveis</p>
          <p className="text-3xl font-bold text-foreground">{globalSummary.totalAvailable}</p>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <p className="text-muted-foreground text-sm font-medium flex items-center gap-1"><TrendingDown size={14} /> Investido</p>
          <p className="text-2xl font-bold text-foreground">R$ {safeFixed(globalSummary.totalInvested)}</p>
        </Card>
        <Card className="border-l-4 border-l-success">
          <p className="text-muted-foreground text-sm font-medium flex items-center gap-1"><TrendingUp size={14} /> Receita Real</p>
          <p className="text-2xl font-bold text-success">R$ {safeFixed(globalSummary.totalRevenue)}</p>
          {globalSummary.totalDiscount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">R$ {safeFixed(globalSummary.totalDiscount)} em descontos</p>
          )}
        </Card>
        <Card className={`border-l-4 ${globalSummary.totalProfit >= 0 ? 'border-l-success' : 'border-l-destructive'}`}>
          <p className="text-muted-foreground text-sm font-medium">Lucro Real</p>
          <p className={`text-2xl font-bold ${globalSummary.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            R$ {safeFixed(globalSummary.totalProfit)}
          </p>
          {globalSummary.totalLost > 0 && (
            <p className="text-xs text-muted-foreground mt-1">R$ {safeFixed(globalSummary.totalLost)} em perdas</p>
          )}
        </Card>
        <Card className="border-l-4 border-l-accent">
          <p className="text-muted-foreground text-sm font-medium flex items-center gap-1"><TrendingUp size={14} /> Lucro Esperado</p>
          <p className={`text-2xl font-bold ${globalSummary.totalExpectedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            R$ {safeFixed(globalSummary.totalExpectedProfit)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">se vender tudo a preço cheio</p>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <h3 className="font-bold text-foreground mb-4">Registrar Movimentação</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Produto *</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formProductId}
                onChange={(e) => handleProductChange(Number(e.target.value))}
              >
                <option value="">Selecione...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Tipo *</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formType}
                onChange={(e) => handleTypeChange(e.target.value as StockMovementType)}
              >
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Data</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Quantidade *</label>
              <Input
                type="number"
                min={formType === 'adjustment' ? undefined : 1}
                value={formQty}
                onChange={(e) => setFormQty(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Valor Unitário (R$)
                {formType === 'sale' && <span className="text-xs text-muted-foreground ml-1">(editável p/ promoção)</span>}
              </label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={formValue}
                onChange={(e) => setFormValue(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Descrição</label>
              <Input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Ex: Venda feira X, presente primo..."
              />
            </div>
          </div>

          {/* Sale preview */}
          {formType === 'sale' && formProductId && (() => {
            const product = products.find(p => p.id === formProductId);
            if (!product) return null;
            const discount = product.finalPrice - formValue;
            const profit = formValue - (product.totalCost || 0);
            return (
              <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                <p className="text-muted-foreground">Preço cheio: <span className="font-bold text-foreground">R$ {safeFixed(product.finalPrice)}</span></p>
                {discount > 0 && <p className="text-warning">Desconto: <span className="font-bold">R$ {safeFixed(discount)}</span> ({safeFixed((discount / product.finalPrice) * 100)}%)</p>}
                <p className={profit >= 0 ? 'text-success' : 'text-destructive'}>
                  Lucro por peça: <span className="font-bold">R$ {safeFixed(profit)}</span>
                </p>
              </div>
            );
          })()}

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit} disabled={!formProductId || formQty <= 0}>Salvar</Button>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
          </div>
        </Card>
      )}

      {/* Per-product summary */}
      {productSummaries.size > 0 && (
        <Card>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <ArrowUpDown size={16} /> Resumo por Produto
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4">Produto</th>
                  <th className="pb-2 pr-4 text-center">Disponível</th>
                  <th className="pb-2 pr-4 text-center">Produzido</th>
                  <th className="pb-2 pr-4 text-center">Vendido</th>
                  <th className="pb-2 pr-4 text-center">Perdas</th>
                  <th className="pb-2 pr-4 text-right">Custo Un.</th>
                  <th className="pb-2 pr-4 text-right">Preço Un.</th>
                  <th className="pb-2 pr-4 text-right">Receita</th>
                  <th className="pb-2 pr-4 text-right">Lucro Real</th>
                  <th className="pb-2 text-right">Lucro Esperado</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(productSummaries.entries()).map(([pid, s]) => {
                  const product = products.find(p => p.id === pid);
                  const available = s.produced - s.sold - s.gifted - s.personal + s.adjusted;
                  const unitCost = product?.totalCost || 0;
                  const unitPrice = product?.finalPrice || 0;
                  const profit = s.totalRevenue - (s.sold * unitCost);
                  const expectedProfit = available > 0 ? available * (unitPrice - unitCost) : 0;
                  return (
                    <tr key={pid} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 pr-4 font-medium text-foreground">{getProductName(pid)}</td>
                      <td className="py-2 pr-4 text-center font-bold text-foreground">{available}</td>
                      <td className="py-2 pr-4 text-center text-success">{s.produced}</td>
                      <td className="py-2 pr-4 text-center text-primary">{s.sold}</td>
                      <td className="py-2 pr-4 text-center text-warning">{s.gifted + s.personal}</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">R$ {safeFixed(unitCost)}</td>
                      <td className="py-2 pr-4 text-right text-foreground">R$ {safeFixed(unitPrice)}</td>
                      <td className="py-2 pr-4 text-right text-success">R$ {safeFixed(s.totalRevenue)}</td>
                      <td className={`py-2 pr-4 text-right font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        R$ {safeFixed(profit)}
                      </td>
                      <td className={`py-2 text-right font-bold ${expectedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        R$ {safeFixed(expectedProfit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* History */}
      <Card>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Filter size={16} /> Histórico
          </h3>
          <div className="flex gap-2 flex-wrap">
            <select
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              value={filterProduct === 'all' ? 'all' : filterProduct}
              onChange={(e) => setFilterProduct(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Todos os produtos</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as StockMovementType | 'all')}
            >
              <option value="all">Todos os tipos</option>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <select
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as typeof filterPeriod)}
            >
              <option value="all">Todo o período</option>
              <option value="week">Últimos 7 dias</option>
              <option value="month">Últimos 30 dias</option>
              <option value="currentMonth">Mês atual</option>
              <option value="lastMonth">Mês passado</option>
            </select>
          </div>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma movimentação registrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMovements.map(m => {
              const cfg = TYPE_CONFIG[m.type];
              const Icon = cfg.icon;
              const product = products.find(p => p.id === m.productId);
              const isDiscount = m.type === 'sale' && product && m.unitValue < product.finalPrice;
              return (
                <div key={m.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-background ${cfg.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {cfg.sign === '+' ? '+' : cfg.sign === '-' ? '-' : ''}{m.quantity}× {getProductName(m.productId)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(m.date).toLocaleDateString('pt-BR')}</span>
                        <Badge color={m.type === 'sale' ? 'blue' : m.type === 'production' ? 'green' : m.type === 'gift' ? 'pink' : 'gray'} className="text-[10px]">
                          {cfg.label}
                        </Badge>
                        {isDiscount && (
                          <Badge color="orange" className="text-[10px]">Promocional</Badge>
                        )}
                        {m.description && <span>• {m.description}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${m.type === 'sale' ? 'text-success' : 'text-foreground'}`}>
                        R$ {safeFixed(m.unitValue * m.quantity)}
                      </p>
                      <p className="text-xs text-muted-foreground">R$ {safeFixed(m.unitValue)}/un</p>
                    </div>
                    <button
                      onClick={() => setDeleteId(m.id)}
                      className="p-1.5 text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Excluir Movimentação"
        description="Tem certeza que deseja excluir esta movimentação?"
        variant="destructive"
      />
    </div>
  );
};

export default StockManager;
