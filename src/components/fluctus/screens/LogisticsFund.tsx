import { useState } from "react";
import { Plus, Trash2, Truck, PiggyBank, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Card, Button, Input } from "../ui";
import { safeFixed } from "@/lib/utils";
import { DatabaseHook } from "@/hooks/useLocalData";

interface LogisticsFundProps {
  db: DatabaseHook;
}

export const LogisticsFund = ({ db }: LogisticsFundProps) => {
  const { data, addLogisticsDeposit, removeLogisticsDeposit } = db;
  const { logisticsFund, shoppingTrips } = data;
  
  const [newDeposit, setNewDeposit] = useState({ value: "", description: "" });

  const handleAddDeposit = () => {
    if (!newDeposit.value) return;
    const value = parseFloat(newDeposit.value);
    if (value <= 0) return;
    
    addLogisticsDeposit({
      date: new Date().toISOString().split('T')[0],
      value,
      description: newDeposit.description || undefined
    });
    setNewDeposit({ value: "", description: "" });
  };

  // Get completed trips with logistics costs
  const completedTrips = shoppingTrips.filter(t => t.status === 'completed' && t.totalLogistics > 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Fundo de Logística</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-success/10 border-success/30">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-success/20">
              <PiggyBank className="text-success" size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Depositado</p>
              <p className="text-2xl font-bold text-success">R$ {safeFixed(logisticsFund.totalDeposited)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/20">
              <Truck className="text-destructive" size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Gasto</p>
              <p className="text-2xl font-bold text-destructive">R$ {safeFixed(logisticsFund.totalSpent)}</p>
            </div>
          </div>
        </Card>
        
        <Card className={`${logisticsFund.balance >= 0 ? 'bg-primary/10 border-primary/30' : 'bg-warning/10 border-warning/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${logisticsFund.balance >= 0 ? 'bg-primary/20' : 'bg-warning/20'}`}>
              {logisticsFund.balance >= 0 ? (
                <TrendingUp className="text-primary" size={24} />
              ) : (
                <TrendingDown className="text-warning" size={24} />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo</p>
              <p className={`text-2xl font-bold ${logisticsFund.balance >= 0 ? 'text-primary' : 'text-warning'}`}>
                R$ {safeFixed(logisticsFund.balance)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposits Section */}
        <Card>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <PiggyBank className="text-success" /> Depósitos
          </h3>
          
          <div className="flex gap-2 mb-4 items-end">
            <div className="w-32">
              <Input
                label="Valor (R$)"
                type="number"
                placeholder="50.00"
                value={newDeposit.value}
                onChange={(e) => setNewDeposit({ ...newDeposit, value: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Descrição (opcional)"
                placeholder="Ex: Reserva mensal"
                value={newDeposit.description}
                onChange={(e) => setNewDeposit({ ...newDeposit, description: e.target.value })}
              />
            </div>
            <Button onClick={handleAddDeposit} variant="success">
              <Plus size={18} />
            </Button>
          </div>
          
          <div className="bg-muted rounded-lg border border-border divide-y divide-border max-h-64 overflow-y-auto">
            {logisticsFund.deposits.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground text-sm">
                Nenhum depósito registrado.
              </p>
            ) : (
              logisticsFund.deposits
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((deposit) => (
                  <div key={deposit.id} className="p-3 flex justify-between items-center hover:bg-card transition-colors">
                    <div className="flex items-center gap-3">
                      <Calendar size={14} className="text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">R$ {safeFixed(deposit.value)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(deposit.date)}
                          {deposit.description && ` • ${deposit.description}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLogisticsDeposit(deposit.id)}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
            )}
          </div>
        </Card>

        {/* Expenses Section (from shopping trips) */}
        <Card>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Truck className="text-destructive" /> Gastos (Viagens de Compras)
          </h3>
          
          <div className="bg-muted rounded-lg border border-border divide-y divide-border max-h-80 overflow-y-auto">
            {completedTrips.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground text-sm">
                Nenhuma viagem com gastos de logística.
              </p>
            ) : (
              completedTrips
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((trip) => (
                  <div key={trip.id} className="p-3 hover:bg-card transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{formatDate(trip.date)}</span>
                      </div>
                      <span className="font-bold text-destructive">-R$ {safeFixed(trip.totalLogistics)}</span>
                    </div>
                    <div className="pl-6 space-y-1">
                      {trip.logistics.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                          <span>{item.desc} ({item.type === 'transport' ? 'Transporte' : 'Alimentação'})</span>
                          <span>R$ {safeFixed(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Total de Viagens:</span>
            <span className="font-bold text-foreground">{completedTrips.length}</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
