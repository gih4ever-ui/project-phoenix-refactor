import { useState } from "react";
import { Package, Plus, Trash2, Edit2, Check, X, Truck, UtensilsCrossed, FileText, Calendar, ShoppingCart } from "lucide-react";
import { Card, Input, Button, SearchBar, Badge } from "../ui";
import type { DatabaseHook } from "@/hooks/useLocalData";
import type { ShoppingTrip, LogisticsItem, Invoice, InvoiceItem } from "@/types/fluctus";

interface ShoppingManagerProps {
  db: DatabaseHook;
}

export default function ShoppingManager({ db }: ShoppingManagerProps) {
  const { data, add, update, remove } = db;
  const { shoppingTrips = [], materials = [], extras = [], suppliers = [] } = data;

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null);
  
  // New trip form
  const [newTrip, setNewTrip] = useState<Partial<ShoppingTrip>>({
    date: new Date().toISOString().split('T')[0],
    status: 'open',
    logistics: [],
    invoices: [],
    totalLogistics: 0,
    totalGoods: 0,
    grandTotal: 0
  });

  // Logistics form
  const [newLogistics, setNewLogistics] = useState<Partial<LogisticsItem>>({
    type: 'transport',
    desc: '',
    value: 0
  });

  // Invoice creation flow
  const [creatingInvoice, setCreatingInvoice] = useState<number | null>(null); // tripId when creating
  const [editingInvoice, setEditingInvoice] = useState<number | null>(null); // invoiceId when editing
  const [newInvoiceSupplierId, setNewInvoiceSupplierId] = useState<number | string>('');
  
  // Invoice item form
  const [newInvoiceItem, setNewInvoiceItem] = useState<Partial<InvoiceItem>>({
    type: 'material',
    id: 0,
    qty: 1,
    price: 0,
    description: '',
    includeInTotal: true
  });

  // Invoice discount (applied at the end)
  const [invoiceDiscount, setInvoiceDiscount] = useState<{ discount: number; discountType: 'value' | 'percent' }>({
    discount: 0,
    discountType: 'percent'
  });

  // Get quoted price for material/extra from a specific supplier
  const getQuotedPriceBySupplier = (type: 'material' | 'extra', itemId: number, supplierId: number | string) => {
    if (type === 'material') {
      const mat = materials.find(m => m.id === itemId);
      if (mat) {
        // Find quote from this specific supplier
        const quote = mat.quotes.find(q => q.supplierId == supplierId);
        if (quote) return quote.price;
        // Fallback to selected quote or default price
        if (mat.selectedQuoteId) {
          const selectedQuote = mat.quotes.find(q => q.id === mat.selectedQuoteId);
          return selectedQuote?.price || mat.price || 0;
        }
        return mat.price || 0;
      }
      return 0;
    }
    const ext = extras.find(e => e.id === itemId);
    if (ext) {
      // Find quote from this specific supplier
      const quote = ext.quotes.find(q => q.supplierId == supplierId);
      if (quote) return quote.price;
      // Fallback to selected quote or default price
      if (ext.selectedQuoteId) {
        const selectedQuote = ext.quotes.find(q => q.id === ext.selectedQuoteId);
        return selectedQuote?.price || ext.price || 0;
      }
      return ext.price || 0;
    }
    return 0;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const safeFixed = (val: number | undefined) => (val ?? 0).toFixed(2);

  // Calculate totals for a trip
  const calculateTotals = (trip: ShoppingTrip) => {
    const totalLogistics = trip.logistics.reduce((sum, l) => sum + (l.value || 0), 0);
    const totalGoods = trip.invoices.reduce((sum, inv) => {
      // Only include items where includeInTotal is not false
      const itemsTotal = inv.items
        .filter(item => item.includeInTotal !== false)
        .reduce((s, item) => s + (item.qty * item.price), 0);
      const discount = inv.discountType === 'percent' 
        ? itemsTotal * (inv.discount / 100)
        : inv.discount;
      return sum + itemsTotal - discount;
    }, 0);
    return {
      totalLogistics,
      totalGoods,
      grandTotal: totalLogistics + totalGoods
    };
  };

  // Create new trip
  const handleCreateTrip = () => {
    const id = Date.now();
    const trip: ShoppingTrip = {
      id,
      date: newTrip.date || new Date().toISOString().split('T')[0],
      status: 'open',
      logistics: [],
      invoices: [],
      totalLogistics: 0,
      totalGoods: 0,
      grandTotal: 0
    };
    add('shoppingTrips', trip);
    setExpandedTrip(id);
    setNewTrip({
      date: new Date().toISOString().split('T')[0],
      status: 'open',
      logistics: [],
      invoices: [],
      totalLogistics: 0,
      totalGoods: 0,
      grandTotal: 0
    });
  };

  // Add logistics item to trip
  const handleAddLogistics = (tripId: number) => {
    const trip = shoppingTrips.find(t => t.id === tripId);
    if (!trip || !newLogistics.desc) return;

    const logistics: LogisticsItem = {
      id: Date.now(),
      type: newLogistics.type as 'transport' | 'food',
      desc: newLogistics.desc,
      value: Number(newLogistics.value) || 0
    };

    const updatedLogistics = [...trip.logistics, logistics];
    const totals = calculateTotals({ ...trip, logistics: updatedLogistics });
    
    update('shoppingTrips', tripId, { 
      logistics: updatedLogistics,
      ...totals
    });

    setNewLogistics({ type: 'transport', desc: '', value: 0 });
  };

  // Remove logistics item
  const handleRemoveLogistics = (tripId: number, logisticsId: number) => {
    const trip = shoppingTrips.find(t => t.id === tripId);
    if (!trip) return;

    const updatedLogistics = trip.logistics.filter(l => l.id !== logisticsId);
    const totals = calculateTotals({ ...trip, logistics: updatedLogistics });
    
    update('shoppingTrips', tripId, { 
      logistics: updatedLogistics,
      ...totals
    });
  };

  // Start creating invoice - just select supplier
  const handleStartInvoice = (tripId: number, supplierId: number | string) => {
    const trip = shoppingTrips.find(t => t.id === tripId);
    if (!trip || !supplierId) return;

    const invoice: Invoice = {
      id: Date.now(),
      supplierId: supplierId,
      discount: 0,
      discountValue: 0,
      discountType: 'percent',
      items: []
    };

    const updatedInvoices = [...trip.invoices, invoice];
    
    update('shoppingTrips', tripId, { invoices: updatedInvoices });
    setEditingInvoice(invoice.id);
    setCreatingInvoice(null);
    setNewInvoiceSupplierId('');
    setInvoiceDiscount({ discount: 0, discountType: 'percent' });
  };

  // Finalize invoice (apply discount and close editing)
  const handleFinalizeInvoice = (tripId: number, invoiceId: number) => {
    const trip = shoppingTrips.find(t => t.id === tripId);
    if (!trip) return;

    const invoiceIndex = trip.invoices.findIndex(i => i.id === invoiceId);
    if (invoiceIndex === -1) return;

    const updatedInvoices = [...trip.invoices];
    updatedInvoices[invoiceIndex] = {
      ...updatedInvoices[invoiceIndex],
      discount: invoiceDiscount.discount,
      discountType: invoiceDiscount.discountType
    };

    const totals = calculateTotals({ ...trip, invoices: updatedInvoices });
    
    update('shoppingTrips', tripId, { 
      invoices: updatedInvoices,
      ...totals
    });

    setEditingInvoice(null);
    setInvoiceDiscount({ discount: 0, discountType: 'percent' });
  };

  // Remove invoice
  const handleRemoveInvoice = (tripId: number, invoiceId: number) => {
    const trip = shoppingTrips.find(t => t.id === tripId);
    if (!trip) return;

    const updatedInvoices = trip.invoices.filter(i => i.id !== invoiceId);
    const totals = calculateTotals({ ...trip, invoices: updatedInvoices });
    
    update('shoppingTrips', tripId, { 
      invoices: updatedInvoices,
      ...totals
    });
  };

  // Add item to invoice
  const handleAddInvoiceItem = (tripId: number, invoiceId: number) => {
    const trip = shoppingTrips.find(t => t.id === tripId);
    if (!trip) return;

    const invoiceIndex = trip.invoices.findIndex(i => i.id === invoiceId);
    if (invoiceIndex === -1) return;

    const item: InvoiceItem = {
      id: Number(newInvoiceItem.id) || 0,
      type: newInvoiceItem.type as 'material' | 'extra' | 'other',
      qty: Number(newInvoiceItem.qty) || 1,
      price: Number(newInvoiceItem.price) || 0,
      description: newInvoiceItem.type === 'other' ? newInvoiceItem.description : undefined,
      includeInTotal: newInvoiceItem.includeInTotal !== false
    };

    const updatedInvoices = [...trip.invoices];
    updatedInvoices[invoiceIndex] = {
      ...updatedInvoices[invoiceIndex],
      items: [...updatedInvoices[invoiceIndex].items, item]
    };

    const totals = calculateTotals({ ...trip, invoices: updatedInvoices });
    
    update('shoppingTrips', tripId, { 
      invoices: updatedInvoices,
      ...totals
    });

    setNewInvoiceItem({ type: 'material', id: 0, qty: 1, price: 0, description: '', includeInTotal: true });
  };

  // Remove item from invoice
  const handleRemoveInvoiceItem = (tripId: number, invoiceId: number, itemIndex: number) => {
    const trip = shoppingTrips.find(t => t.id === tripId);
    if (!trip) return;

    const invoiceIndex = trip.invoices.findIndex(i => i.id === invoiceId);
    if (invoiceIndex === -1) return;

    const updatedInvoices = [...trip.invoices];
    updatedInvoices[invoiceIndex] = {
      ...updatedInvoices[invoiceIndex],
      items: updatedInvoices[invoiceIndex].items.filter((_, i) => i !== itemIndex)
    };

    const totals = calculateTotals({ ...trip, invoices: updatedInvoices });
    
    update('shoppingTrips', tripId, { 
      invoices: updatedInvoices,
      ...totals
    });
  };

  // Toggle trip status
  const handleToggleStatus = (tripId: number) => {
    const trip = shoppingTrips.find(t => t.id === tripId);
    if (!trip) return;
    update('shoppingTrips', tripId, { 
      status: trip.status === 'open' ? 'completed' : 'open' 
    });
  };

  // Delete trip
  const handleDeleteTrip = (tripId: number) => {
    remove('shoppingTrips', tripId);
    if (expandedTrip === tripId) setExpandedTrip(null);
  };

  const getSupplierName = (id: number | string) => {
    const supplier = suppliers.find(s => s.id == id);
    return supplier?.name || "Fornecedor desconhecido";
  };

  const getItemName = (type: 'material' | 'extra' | 'other', id: number, description?: string) => {
    if (type === 'other') {
      return description || "Item avulso";
    }
    if (type === 'material') {
      return materials.find(m => m.id === id)?.name || "Material desconhecido";
    }
    return extras.find(e => e.id === id)?.name || "Extra desconhecido";
  };

  const filteredTrips = shoppingTrips
    .filter(t => {
      const search = searchTerm.toLowerCase();
      return (
        formatDate(t.date).includes(search) ||
        t.status.includes(search)
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingCart className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Registro de Compras</h1>
          <p className="text-muted-foreground">Registre suas viagens de compras, notas fiscais e gastos extras</p>
        </div>
      </div>

      {/* New Trip Form */}
      <Card className="p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Viagem de Compras
        </h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground">Data</label>
            <Input
              type="date"
              value={newTrip.date}
              onChange={(e) => setNewTrip({ ...newTrip, date: e.target.value })}
            />
          </div>
          <Button onClick={handleCreateTrip}>
            <Plus className="w-4 h-4 mr-1" />
            Criar
          </Button>
        </div>
      </Card>

      {/* Search */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar por data..."
      />

      {/* Trips List */}
      <div className="space-y-4">
        {filteredTrips.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma viagem de compras registrada</p>
          </Card>
        ) : (
          filteredTrips.map((trip) => {
            const isExpanded = expandedTrip === trip.id;
            const totals = calculateTotals(trip);

            return (
              <Card key={trip.id} className="overflow-hidden">
                {/* Trip Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold">{formatDate(trip.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {trip.invoices.length} nota(s) • {trip.logistics.length} gasto(s) extra(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge color={trip.status === 'completed' ? 'green' : 'gray'}>
                        {trip.status === 'completed' ? 'Concluída' : 'Aberta'}
                      </Badge>
                      <div className="text-right">
                        <p className="font-bold text-lg">R$ {safeFixed(totals.grandTotal)}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t p-4 space-y-6">
                    {/* Quick Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">R$ {safeFixed(totals.totalGoods)}</p>
                        <p className="text-sm text-muted-foreground">Mercadorias</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">R$ {safeFixed(totals.totalLogistics)}</p>
                        <p className="text-sm text-muted-foreground">Logística</p>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-primary">R$ {safeFixed(totals.grandTotal)}</p>
                        <p className="text-sm text-muted-foreground">Total Geral</p>
                      </div>
                    </div>

                    {/* Logistics Section */}
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Gastos com Logística
                      </h3>
                      
                      {/* Logistics List */}
                      {trip.logistics.length > 0 && (
                        <div className="space-y-2">
                          {trip.logistics.map((log) => (
                            <div key={log.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                {log.type === 'transport' ? (
                                  <Truck className="w-4 h-4 text-primary" />
                                ) : (
                                  <UtensilsCrossed className="w-4 h-4 text-warning" />
                                )}
                                <div>
                                  <p className="font-medium">{log.desc}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {log.type === 'transport' ? 'Transporte' : 'Alimentação'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">R$ {safeFixed(log.value)}</span>
                                <Button
                                  variant="ghost"
                                  className="p-2 h-auto"
                                  onClick={() => handleRemoveLogistics(trip.id, log.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Logistics Form */}
                      <div className="flex gap-2 items-end">
                        <div className="w-32">
                          <label className="text-xs text-muted-foreground">Tipo</label>
                          <select
                            className="w-full h-10 px-3 rounded-md border bg-background"
                            value={newLogistics.type}
                            onChange={(e) => setNewLogistics({ ...newLogistics, type: e.target.value as 'transport' | 'food' })}
                          >
                            <option value="transport">Transporte</option>
                            <option value="food">Alimentação</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground">Descrição</label>
                          <Input
                            placeholder="Ex: Uber, Gasolina, Almoço..."
                            value={newLogistics.desc}
                            onChange={(e) => setNewLogistics({ ...newLogistics, desc: e.target.value })}
                          />
                        </div>
                        <div className="w-28">
                          <label className="text-xs text-muted-foreground">Valor</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newLogistics.value || ''}
                            onChange={(e) => setNewLogistics({ ...newLogistics, value: Number(e.target.value) })}
                          />
                        </div>
                        <Button onClick={() => handleAddLogistics(trip.id)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Invoices Section */}
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Notas Fiscais
                      </h3>

                      {/* Invoices List */}
                      {trip.invoices.length > 0 && (
                        <div className="space-y-3">
                          {trip.invoices.map((inv) => {
                            const itemsTotal = inv.items.reduce((s, item) => s + (item.qty * item.price), 0);
                            const discountVal = inv.discountType === 'percent' 
                              ? itemsTotal * (inv.discount / 100)
                              : inv.discount;
                            const invoiceTotal = itemsTotal - discountVal;
                            const isEditing = editingInvoice === inv.id;

                            return (
                              <div key={inv.id} className="border rounded-lg overflow-hidden">
                                <div className="bg-muted/50 p-3 flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{getSupplierName(inv.supplierId)}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {inv.items.length} item(ns)
                                      {inv.discount > 0 && (
                                        <> • Desconto: {inv.discount}{inv.discountType === 'percent' ? '%' : ' R$'}</>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">R$ {safeFixed(invoiceTotal)}</span>
                                    {!isEditing && (
                                      <Button
                                        variant="ghost"
                                        className="p-2 h-auto"
                                        onClick={() => {
                                          setEditingInvoice(inv.id);
                                          setInvoiceDiscount({ discount: inv.discount, discountType: inv.discountType });
                                        }}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                    {!isEditing && (
                                      <Button
                                        variant="ghost"
                                        className="p-2 h-auto"
                                        onClick={() => handleRemoveInvoice(trip.id, inv.id)}
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    )}
                                    {isEditing && (
                                      <Badge color="blue">Editando</Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Invoice Items */}
                                {(inv.items.length > 0 || isEditing) && (
                                  <div className="p-3 space-y-2">
                                    {inv.items.map((item, idx) => (
                                      <div key={idx} className={`flex items-center justify-between text-sm bg-background p-2 rounded ${item.includeInTotal === false ? 'opacity-60' : ''}`}>
                                        <div className="flex items-center gap-2">
                                          <Badge 
                                            color={item.type === 'material' ? 'blue' : item.type === 'extra' ? 'purple' : 'gray'} 
                                            className="text-xs"
                                          >
                                            {item.type === 'material' ? 'MAT' : item.type === 'extra' ? 'EXT' : 'OUT'}
                                          </Badge>
                                          <span>{getItemName(item.type, item.id, item.description)}</span>
                                          {item.includeInTotal === false && (
                                            <span className="text-xs text-muted-foreground">(não contabiliza)</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-muted-foreground">
                                            {item.qty} × R$ {safeFixed(item.price)}
                                          </span>
                                          <span className="font-medium">
                                            R$ {safeFixed(item.qty * item.price)}
                                          </span>
                                          {isEditing && (
                                            <Button
                                              variant="ghost"
                                              className="p-1 h-auto"
                                              onClick={() => handleRemoveInvoiceItem(trip.id, inv.id, idx)}
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}

                                    {/* Add Item Form */}
                                    {isEditing && (
                                      <div className="space-y-3 pt-2 border-t">
                                        <div className="flex gap-2 items-end flex-wrap">
                                          <div className="w-28">
                                            <label className="text-xs text-muted-foreground">Tipo</label>
                                            <select
                                              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                                              value={newInvoiceItem.type}
                                              onChange={(e) => {
                                                const type = e.target.value as 'material' | 'extra' | 'other';
                                                setNewInvoiceItem({ 
                                                  ...newInvoiceItem, 
                                                  type, 
                                                  id: 0, 
                                                  price: 0,
                                                  description: '',
                                                  includeInTotal: true
                                                });
                                              }}
                                            >
                                              <option value="material">Material</option>
                                              <option value="extra">Extra</option>
                                              <option value="other">Outro</option>
                                            </select>
                                          </div>
                                          
                                          {newInvoiceItem.type === 'other' ? (
                                            <div className="flex-1">
                                              <label className="text-xs text-muted-foreground">Descrição</label>
                                              <Input
                                                placeholder="Descrição do item..."
                                                value={newInvoiceItem.description || ''}
                                                onChange={(e) => setNewInvoiceItem({ ...newInvoiceItem, description: e.target.value })}
                                              />
                                            </div>
                                          ) : (
                                            <div className="flex-1">
                                              <label className="text-xs text-muted-foreground">Item</label>
                                              <select
                                                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                                                value={newInvoiceItem.id}
                                                onChange={(e) => {
                                                  const id = Number(e.target.value);
                                                  const quotedPrice = getQuotedPriceBySupplier(
                                                    newInvoiceItem.type as 'material' | 'extra', 
                                                    id,
                                                    inv.supplierId
                                                  );
                                                  setNewInvoiceItem({ ...newInvoiceItem, id, price: quotedPrice });
                                                }}
                                              >
                                                <option value={0}>Selecione...</option>
                                                {(newInvoiceItem.type === 'material' ? materials : extras).map((item) => (
                                                  <option key={item.id} value={item.id}>{item.name}</option>
                                                ))}
                                              </select>
                                            </div>
                                          )}
                                          
                                          <div className="w-20">
                                            <label className="text-xs text-muted-foreground">Qtd</label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={newInvoiceItem.qty || ''}
                                              onChange={(e) => setNewInvoiceItem({ ...newInvoiceItem, qty: Number(e.target.value) })}
                                            />
                                          </div>
                                          <div className="w-24">
                                            <label className="text-xs text-muted-foreground">Preço</label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={newInvoiceItem.price || ''}
                                              onChange={(e) => setNewInvoiceItem({ ...newInvoiceItem, price: Number(e.target.value) })}
                                            />
                                          </div>
                                          
                                          {newInvoiceItem.type === 'other' && (
                                            <div className="flex items-center gap-2">
                                              <label className="text-xs text-muted-foreground flex items-center gap-1">
                                                <input
                                                  type="checkbox"
                                                  checked={newInvoiceItem.includeInTotal !== false}
                                                  onChange={(e) => setNewInvoiceItem({ ...newInvoiceItem, includeInTotal: e.target.checked })}
                                                  className="w-4 h-4"
                                                />
                                                Contabilizar
                                              </label>
                                            </div>
                                          )}
                                          
                                          <Button 
                                            className="px-3"
                                            onClick={() => handleAddInvoiceItem(trip.id, inv.id)}
                                            disabled={newInvoiceItem.type === 'other' ? !newInvoiceItem.description : !newInvoiceItem.id}
                                          >
                                            <Plus className="w-4 h-4" />
                                          </Button>
                                        </div>
                                        
                                        {/* Discount Section - at the end */}
                                        <div className="flex gap-2 items-end pt-3 border-t bg-muted/30 -mx-3 -mb-3 p-3 rounded-b-lg">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium mb-2">Desconto na nota</p>
                                            <div className="flex gap-2 items-center">
                                              <div className="w-28">
                                                <Input
                                                  type="number"
                                                  step="0.01"
                                                  placeholder="0"
                                                  value={invoiceDiscount.discount || ''}
                                                  onChange={(e) => setInvoiceDiscount({ ...invoiceDiscount, discount: Number(e.target.value) })}
                                                />
                                              </div>
                                              <select
                                                className="h-10 px-3 rounded-md border bg-background"
                                                value={invoiceDiscount.discountType}
                                                onChange={(e) => setInvoiceDiscount({ ...invoiceDiscount, discountType: e.target.value as 'value' | 'percent' })}
                                              >
                                                <option value="percent">%</option>
                                                <option value="value">R$</option>
                                              </select>
                                              {invoiceDiscount.discount > 0 && (
                                                <span className="text-sm font-medium text-green-600">
                                                  = R$ {safeFixed(
                                                    invoiceDiscount.discountType === 'percent'
                                                      ? itemsTotal * (invoiceDiscount.discount / 100)
                                                      : invoiceDiscount.discount
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <Button 
                                            onClick={() => handleFinalizeInvoice(trip.id, inv.id)}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            <Check className="w-4 h-4 mr-1" />
                                            Finalizar Nota
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Invoice Button - only show if no invoice is being edited */}
                      {editingInvoice === null && (
                        <div className="border-2 border-dashed rounded-lg p-4">
                          {creatingInvoice === trip.id ? (
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground">Selecione o Fornecedor</label>
                                <select
                                  className="w-full h-10 px-3 rounded-md border bg-background"
                                  value={newInvoiceSupplierId}
                                  onChange={(e) => setNewInvoiceSupplierId(e.target.value)}
                                  autoFocus
                                >
                                  <option value="">Selecione...</option>
                                  {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                              <Button 
                                onClick={() => handleStartInvoice(trip.id, newInvoiceSupplierId)} 
                                disabled={!newInvoiceSupplierId}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Confirmar
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => {
                                  setCreatingInvoice(null);
                                  setNewInvoiceSupplierId('');
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => setCreatingInvoice(trip.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar Nota Fiscal
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Trip Actions */}
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => handleToggleStatus(trip.id)}
                      >
                        {trip.status === 'open' ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Marcar como Concluída
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-4 h-4 mr-1" />
                            Reabrir
                          </>
                        )}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteTrip(trip.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir Viagem
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
