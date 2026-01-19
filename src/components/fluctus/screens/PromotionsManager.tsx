import { useState, useMemo } from "react";
import { 
  Plus, Trash2, Pencil, Save, X, Users2, Tag, Percent, Gift, 
  Calendar, ChevronDown, ChevronUp, Check, Clock, Truck, 
  ShoppingBag, Layers, UserPlus, Send, Eye
} from "lucide-react";
import { Card, Button, Input, SearchBar, Badge } from "../ui";
import { DatabaseHook } from "@/hooks/useLocalData";
import { Promotion, PromotionType, Client } from "@/types/fluctus";
import { SYSTEM_TAGS } from "@/lib/utils";

interface PromotionsManagerProps {
  db: DatabaseHook;
}

const PROMOTION_TYPES: { value: PromotionType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'percentage', label: 'Desconto em %', icon: <Percent size={16} />, description: 'Desconto simples em porcentagem' },
  { value: 'fixed_value', label: 'Valor Fixo', icon: <Tag size={16} />, description: 'Desconto de valor fixo em reais' },
  { value: 'take_x_pay_y', label: 'Leve X, Pague Y', icon: <Layers size={16} />, description: 'Cliente leva mais, paga menos' },
  { value: 'time_coupon', label: 'Cupom Limitado', icon: <Clock size={16} />, description: 'Cupom válido por tempo limitado' },
  { value: 'free_shipping', label: 'Frete Grátis', icon: <Truck size={16} />, description: 'Frete grátis acima de valor mínimo' },
  { value: 'first_purchase', label: 'Primeira Compra', icon: <UserPlus size={16} />, description: 'Desconto para novos clientes' },
  { value: 'progressive', label: 'Desconto Progressivo', icon: <ChevronUp size={16} />, description: 'Mais compra = mais desconto' },
  { value: 'seasonal', label: 'Promoção Sazonal', icon: <Calendar size={16} />, description: 'Promoções de datas especiais' },
  { value: 'cross_selling', label: 'Cross Selling', icon: <ShoppingBag size={16} />, description: 'Desconto ao adicionar outro produto' },
];

const TARGET_TYPES = [
  { value: 'all', label: 'Todos os Clientes' },
  { value: 'tags', label: 'Por Tags/Grupos' },
  { value: 'individual', label: 'Clientes Específicos' },
];

const generateCouponCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const PromotionsManager = ({ db }: PromotionsManagerProps) => {
  const { data, add, update, remove } = db;
  const { promotions, clients } = data;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'distribute'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedPromoForDistribute, setSelectedPromoForDistribute] = useState<number | null>(null);
  const [tagFilter, setTagFilter] = useState<string>("");
  
  const [form, setForm] = useState<Partial<Promotion>>({
    name: '',
    type: 'percentage',
    description: '',
    code: '',
    discountPercent: 10,
    discountValue: 0,
    takeQuantity: 3,
    payQuantity: 2,
    minOrderValue: 100,
    progressiveTiers: [{ minQty: 2, discount: 5 }, { minQty: 5, discount: 10 }],
    targetType: 'all',
    targetTags: [],
    targetClientIds: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    active: true,
    maxUsesTotal: undefined,
    maxUsesPerClient: 1,
  });

  const resetForm = () => {
    setForm({
      name: '',
      type: 'percentage',
      description: '',
      code: '',
      discountPercent: 10,
      discountValue: 0,
      takeQuantity: 3,
      payQuantity: 2,
      minOrderValue: 100,
      progressiveTiers: [{ minQty: 2, discount: 5 }, { minQty: 5, discount: 10 }],
      targetType: 'all',
      targetTags: [],
      targetClientIds: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      active: true,
      maxUsesTotal: undefined,
      maxUsesPerClient: 1,
    });
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name || !form.type) return;
    
    const promotionData: Omit<Promotion, 'id'> = {
      name: form.name,
      type: form.type as PromotionType,
      description: form.description || '',
      code: form.code || generateCouponCode(),
      discountPercent: form.discountPercent,
      discountValue: form.discountValue,
      takeQuantity: form.takeQuantity,
      payQuantity: form.payQuantity,
      minOrderValue: form.minOrderValue,
      progressiveTiers: form.progressiveTiers,
      targetType: form.targetType as 'all' | 'tags' | 'individual',
      targetTags: form.targetTags,
      targetClientIds: form.targetClientIds,
      startDate: form.startDate || new Date().toISOString().split('T')[0],
      endDate: form.endDate || new Date().toISOString().split('T')[0],
      active: form.active ?? true,
      maxUsesTotal: form.maxUsesTotal,
      maxUsesPerClient: form.maxUsesPerClient,
      totalGiven: 0,
      totalUsed: 0,
      createdAt: new Date().toISOString(),
    };

    if (editingId) {
      const existing = promotions.find(p => p.id === editingId);
      update("promotions", editingId, { 
        ...promotionData, 
        totalGiven: existing?.totalGiven || 0,
        totalUsed: existing?.totalUsed || 0,
        createdAt: existing?.createdAt || promotionData.createdAt
      });
    } else {
      add("promotions", promotionData);
    }
    
    resetForm();
    setActiveTab('list');
  };

  const handleEdit = (promo: Promotion) => {
    setForm(promo);
    setEditingId(promo.id);
    setActiveTab('create');
  };

  const handleDistributeToClients = (promoId: number, clientIds: number[]) => {
    const promo = promotions.find(p => p.id === promoId);
    if (!promo) return;

    clientIds.forEach(clientId => {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        const existingDiscount = client.discounts?.find(d => d.promotionId === promoId);
        if (!existingDiscount) {
          const newDiscount = {
            id: Date.now() + Math.random(),
            promotionId: promoId,
            code: promo.code || generateCouponCode(),
            description: promo.description,
            validUntil: promo.endDate,
            dateGiven: new Date().toISOString(),
            used: false,
          };
          update("clients", clientId, {
            ...client,
            discounts: [...(client.discounts || []), newDiscount]
          });
        }
      }
    });

    // Update promo stats
    update("promotions", promoId, {
      ...promo,
      totalGiven: (promo.totalGiven || 0) + clientIds.length
    });

    setSelectedPromoForDistribute(null);
    setActiveTab('list');
  };

  const handleMarkAsUsed = (clientId: number, discountId: number) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const discount = client.discounts?.find(d => d.id === discountId);
    if (!discount) return;

    // Update client discount
    update("clients", clientId, {
      ...client,
      discounts: client.discounts?.map(d => 
        d.id === discountId ? { ...d, used: true, usedAt: new Date().toISOString() } : d
      )
    });

    // Update promo stats
    const promo = promotions.find(p => p.id === discount.promotionId);
    if (promo) {
      update("promotions", promo.id, {
        ...promo,
        totalUsed: (promo.totalUsed || 0) + 1
      });
    }
  };

  const handleToggleTag = (tag: string) => {
    const currentTags = form.targetTags || [];
    if (currentTags.includes(tag)) {
      setForm({ ...form, targetTags: currentTags.filter(t => t !== tag) });
    } else {
      setForm({ ...form, targetTags: [...currentTags, tag] });
    }
  };

  const getClientsForPromo = (promo: Promotion): Client[] => {
    if (promo.targetType === 'all') return clients;
    if (promo.targetType === 'tags' && promo.targetTags?.length) {
      return clients.filter(c => 
        c.tags?.some(t => promo.targetTags?.includes(t))
      );
    }
    if (promo.targetType === 'individual' && promo.targetClientIds?.length) {
      return clients.filter(c => promo.targetClientIds?.includes(c.id));
    }
    return [];
  };

  const getPromoTypeInfo = (type: PromotionType) => {
    return PROMOTION_TYPES.find(t => t.value === type);
  };

  const filteredClients = useMemo(() => {
    if (!tagFilter) return clients;
    return clients.filter(c => c.tags?.includes(tagFilter));
  }, [clients, tagFilter]);

  const getPromoDiscountText = (promo: Promotion) => {
    switch (promo.type) {
      case 'percentage': return `${promo.discountPercent}% off`;
      case 'fixed_value': return `R$ ${promo.discountValue} off`;
      case 'take_x_pay_y': return `Leve ${promo.takeQuantity}, Pague ${promo.payQuantity}`;
      case 'free_shipping': return `Frete grátis +R$ ${promo.minOrderValue}`;
      case 'first_purchase': return `${promo.discountPercent}% primeira compra`;
      default: return promo.description;
    }
  };

  const isPromoExpired = (promo: Promotion) => {
    return new Date(promo.endDate) < new Date();
  };

  const filteredPromos = promotions.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get all clients who have a specific promo
  const getClientsWithPromo = (promoId: number) => {
    return clients.filter(c => c.discounts?.some(d => d.promotionId === promoId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Promoções & Campanhas</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => { resetForm(); setActiveTab('create'); }}
            variant={activeTab === 'create' ? 'primary' : 'ghost'}
          >
            <Plus size={18} /> Nova Promoção
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'list' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Gift size={16} className="inline mr-2" />
          Promoções ({promotions.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'create' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Plus size={16} className="inline mr-2" />
          {editingId ? 'Editar' : 'Criar'}
        </button>
        <button
          onClick={() => setActiveTab('distribute')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'distribute' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Send size={16} className="inline mr-2" />
          Distribuir
        </button>
      </div>

      {/* Create/Edit Form */}
      {activeTab === 'create' && (
        <Card className={editingId ? "border-l-4 border-l-warning bg-warning/5" : ""}>
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            {editingId ? "Editando Promoção" : "Nova Promoção"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Nome da Promoção"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Black Friday 2025"
            />
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">
                Tipo de Promoção
              </label>
              <select
                className="w-full border border-input rounded-lg p-2 text-sm bg-card text-foreground"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as PromotionType })}
              >
                {PROMOTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <Input
              label="Descrição"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição da promoção para o cliente"
            />
          </div>

          {/* Type-specific fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {(form.type === 'percentage' || form.type === 'first_purchase' || form.type === 'time_coupon' || form.type === 'seasonal') && (
              <Input
                label="Desconto (%)"
                type="number"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
              />
            )}
            {form.type === 'fixed_value' && (
              <Input
                label="Valor do Desconto (R$)"
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              />
            )}
            {form.type === 'take_x_pay_y' && (
              <>
                <Input
                  label="Leve (quantidade)"
                  type="number"
                  value={form.takeQuantity}
                  onChange={(e) => setForm({ ...form, takeQuantity: Number(e.target.value) })}
                />
                <Input
                  label="Pague (quantidade)"
                  type="number"
                  value={form.payQuantity}
                  onChange={(e) => setForm({ ...form, payQuantity: Number(e.target.value) })}
                />
              </>
            )}
            {form.type === 'free_shipping' && (
              <Input
                label="Valor Mínimo do Pedido (R$)"
                type="number"
                value={form.minOrderValue}
                onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              label="Código do Cupom"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="AUTO-GERADO"
            />
            <Input
              label="Data Início"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              label="Data Fim"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>

          {/* Target selection */}
          <div className="mb-4 p-4 bg-muted rounded-lg border border-border">
            <label className="text-sm font-bold text-muted-foreground mb-2 block">
              Público Alvo
            </label>
            <div className="flex gap-2 mb-3">
              {TARGET_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, targetType: t.value as any })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    form.targetType === t.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {form.targetType === 'tags' && (
              <div className="flex flex-wrap gap-2 mt-3">
                {SYSTEM_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleToggleTag(tag)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                      form.targetTags?.includes(tag)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Máximo de Usos Total (deixe vazio = ilimitado)"
              type="number"
              value={form.maxUsesTotal || ''}
              onChange={(e) => setForm({ ...form, maxUsesTotal: e.target.value ? Number(e.target.value) : undefined })}
            />
            <Input
              label="Máximo por Cliente"
              type="number"
              value={form.maxUsesPerClient || 1}
              onChange={(e) => setForm({ ...form, maxUsesPerClient: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-sm font-medium text-foreground">Promoção Ativa</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            {editingId && (
              <Button onClick={resetForm} variant="ghost">
                Cancelar
              </Button>
            )}
            <Button onClick={handleSave} variant={editingId ? "warning" : "success"}>
              <Save size={18} /> {editingId ? "Atualizar" : "Criar Promoção"}
            </Button>
          </div>
        </Card>
      )}

      {/* List View */}
      {activeTab === 'list' && (
        <>
          <SearchBar 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Buscar por nome ou código..." 
          />

          <div className="grid gap-4">
            {filteredPromos.length === 0 ? (
              <Card className="text-center py-12">
                <Gift size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">Nenhuma promoção cadastrada</p>
                <Button onClick={() => setActiveTab('create')} className="mt-4">
                  <Plus size={18} /> Criar Primeira Promoção
                </Button>
              </Card>
            ) : (
              filteredPromos.map(promo => {
                const typeInfo = getPromoTypeInfo(promo.type);
                const isExpired = isPromoExpired(promo);
                const clientsWithPromo = getClientsWithPromo(promo.id);
                const isExpanded = expandedId === promo.id;

                return (
                  <Card 
                    key={promo.id} 
                    className={`transition-all ${
                      !promo.active || isExpired ? 'opacity-60' : ''
                    } ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : promo.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          promo.active && !isExpired ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {typeInfo?.icon || <Gift size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-foreground">{promo.name}</h4>
                            {promo.code && (
                              <Badge color="blue">{promo.code}</Badge>
                            )}
                            {isExpired && <Badge color="red">Expirada</Badge>}
                            {!promo.active && <Badge color="gray">Inativa</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getPromoDiscountText(promo)}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(promo.startDate).toLocaleDateString('pt-BR')} - {new Date(promo.endDate).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users2 size={12} />
                              {promo.totalGiven} enviados
                            </span>
                            <span className="flex items-center gap-1">
                              <Check size={12} />
                              {promo.totalUsed} usados
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-xs font-bold text-muted-foreground mb-1">Público Alvo</p>
                            <p className="text-sm text-foreground">
                              {promo.targetType === 'all' && 'Todos os clientes'}
                              {promo.targetType === 'tags' && `Tags: ${promo.targetTags?.join(', ')}`}
                              {promo.targetType === 'individual' && `${promo.targetClientIds?.length} clientes específicos`}
                            </p>
                          </div>
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-xs font-bold text-muted-foreground mb-1">Taxa de Conversão</p>
                            <p className="text-sm text-foreground">
                              {promo.totalGiven > 0 
                                ? `${((promo.totalUsed / promo.totalGiven) * 100).toFixed(1)}%`
                                : '0%'
                              }
                            </p>
                          </div>
                        </div>

                        {/* Clients who received this promo */}
                        {clientsWithPromo.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-muted-foreground mb-2">
                              Clientes com este cupom ({clientsWithPromo.length})
                            </p>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {clientsWithPromo.map(client => {
                                const discount = client.discounts?.find(d => d.promotionId === promo.id);
                                return (
                                  <div 
                                    key={client.id}
                                    className="flex items-center justify-between bg-card p-2 rounded border border-border text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{client.name}</span>
                                      {discount?.used ? (
                                        <Badge color="green">Usado</Badge>
                                      ) : (
                                        <Badge color="orange">Pendente</Badge>
                                      )}
                                    </div>
                                    {!discount?.used && (
                                      <Button
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (discount) handleMarkAsUsed(client.id, discount.id);
                                        }}
                                        className="h-7 text-xs px-2"
                                      >
                                        <Check size={14} /> Marcar Usado
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => {
                              setSelectedPromoForDistribute(promo.id);
                              setActiveTab('distribute');
                            }}
                            variant="secondary"
                            className="h-8 text-xs"
                          >
                            <Send size={14} /> Distribuir
                          </Button>
                          <Button
                            onClick={() => handleEdit(promo)}
                            variant="ghost"
                            className="h-8 text-xs"
                          >
                            <Pencil size={14} /> Editar
                          </Button>
                          <Button
                            onClick={() => remove("promotions", promo.id)}
                            variant="ghost"
                            className="text-destructive h-8 text-xs"
                          >
                            <Trash2 size={14} /> Excluir
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Distribute View */}
      {activeTab === 'distribute' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Distribuir Promoção para Clientes
          </h3>

          <div className="mb-4">
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Selecione a Promoção
            </label>
            <select
              className="w-full border border-input rounded-lg p-2 text-sm bg-card text-foreground"
              value={selectedPromoForDistribute || ''}
              onChange={(e) => setSelectedPromoForDistribute(Number(e.target.value))}
            >
              <option value="">Selecione uma promoção...</option>
              {promotions.filter(p => p.active && !isPromoExpired(p)).map(p => (
                <option key={p.id} value={p.id}>{p.name} - {p.code}</option>
              ))}
            </select>
          </div>

          {selectedPromoForDistribute && (
            <>
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">Filtrar por Tag:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTagFilter('')}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                      tagFilter === ''
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary'
                    }`}
                  >
                    Todos
                  </button>
                  {SYSTEM_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTagFilter(tag)}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${
                        tagFilter === tag
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:border-primary'
                      }`}
                    >
                      {tag} ({clients.filter(c => c.tags?.includes(tag)).length})
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {filteredClients.map(client => {
                  const hasPromo = client.discounts?.some(d => d.promotionId === selectedPromoForDistribute);
                  return (
                    <div 
                      key={client.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        hasPromo ? 'bg-success/10 border-success/30' : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{client.name}</p>
                          <div className="flex gap-1 mt-1">
                            {client.tags?.map(t => (
                              <Badge key={t} color="orange" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      {hasPromo ? (
                        <Badge color="green">Já possui</Badge>
                      ) : (
                        <Button
                          onClick={() => handleDistributeToClients(selectedPromoForDistribute, [client.id])}
                          variant="secondary"
                          className="h-8 px-3"
                        >
                          <Send size={14} /> Enviar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {tagFilter && (
                <Button
                  onClick={() => {
                    const eligibleClients = filteredClients.filter(
                      c => !c.discounts?.some(d => d.promotionId === selectedPromoForDistribute)
                    );
                    handleDistributeToClients(selectedPromoForDistribute, eligibleClients.map(c => c.id));
                  }}
                  className="w-full"
                >
                  <Send size={18} /> Enviar para Todos do Grupo "{tagFilter}" ({
                    filteredClients.filter(c => !c.discounts?.some(d => d.promotionId === selectedPromoForDistribute)).length
                  } clientes)
                </Button>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
};
