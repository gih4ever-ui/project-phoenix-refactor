import { useState } from "react";
import { Plus, Trash2, Truck, PiggyBank, TrendingUp, TrendingDown, Calendar, AlertTriangle, Check, Clock } from "lucide-react";
import { Card, Button, Input } from "../ui";
import { safeFixed } from "@/lib/utils";
import { DatabaseHook } from "@/hooks/useLocalData";

interface LogisticsFundProps {
  db: DatabaseHook;
}

export const LogisticsFund = ({ db }: LogisticsFundProps) => {
  const { data, addLogisticsDeposit, removeLogisticsDeposit, confirmLogisticsExpense } = db;
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

  // Get trips with logistics costs (both confirmed and pending)
  const tripsWithLogistics = shoppingTrips.filter(t => t.totalLogistics > 0);
  const confirmedTrips = tripsWithLogistics.filter(t => t.logisticsConfirmed === true);
  const pendingTrips = tripsWithLogistics.filter(t => t.status === 'completed' && !t.logisticsConfirmed);

  // Calculate pending amount (not yet deducted)
  const pendingAmount = pendingTrips.reduce((sum, t) => sum + t.totalLogistics, 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isNegative = logisticsFund.balance < 0;
  const amountNeeded = Math.abs(logisticsFund.balance);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Fundo de Logística</h2>
      
      {/* Negative Balance Alert */}
      {isNegative && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-destructive mt-0.5 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-destructive">Saldo Negativo!</h3>
            <p className="text-sm text-destructive/80">
              Você precisa depositar <span className="font-bold">R$ {safeFixed(amountNeeded)}</span> para cobrir os gastos confirmados.
            </p>
          </div>
        </div>
      )}

      {/* Pending Expenses Alert */}
      {pendingTrips.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <Clock className="text-warning mt-0.5 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-warning">Gastos Pendentes</h3>
            <p className="text-sm text-warning/80">
              Você tem <span className="font-bold">{pendingTrips.length}</span> viagem(ns) com gastos de logística aguardando confirmação.
              Total pendente: <span className="font-bold">R$ {safeFixed(pendingAmount)}</span>
            </p>
          </div>
        </div>
      )}
      
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Gasto (confirmado)</p>
              <p className="text-2xl font-bold text-destructive">R$ {safeFixed(logisticsFund.totalSpent)}</p>
            </div>
          </div>
        </Card>
        
        <Card className={`${logisticsFund.balance >= 0 ? 'bg-primary/10 border-primary/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${logisticsFund.balance >= 0 ? 'bg-primary/20' : 'bg-destructive/20'}`}>
              {logisticsFund.balance >= 0 ? (
                <TrendingUp className="text-primary" size={24} />
              ) : (
                <TrendingDown className="text-destructive" size={24} />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo</p>
              <p className={`text-2xl font-bold ${logisticsFund.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
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
            <Truck className="text-destructive" /> Gastos de Viagens
          </h3>
          
          <div className="bg-muted rounded-lg border border-border divide-y divide-border max-h-80 overflow-y-auto">
            {tripsWithLogistics.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground text-sm">
                Nenhuma viagem com gastos de logística.
              </p>
            ) : (
              tripsWithLogistics
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((trip) => {
                  const isConfirmed = trip.logisticsConfirmed === true;
                  const isPending = trip.status === 'completed' && !isConfirmed;
                  const isOpen = trip.status === 'open';
                  
                  return (
                    <div key={trip.id} className={`p-3 hover:bg-card transition-colors ${isConfirmed ? 'opacity-70' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{formatDate(trip.date)}</span>
                          {isConfirmed && (
                            <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check size={12} /> Confirmado
                            </span>
                          )}
                          {isPending && (
                            <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock size={12} /> Pendente
                            </span>
                          )}
                          {isOpen && (
                            <span className="text-xs bg-muted-foreground/20 text-muted-foreground px-2 py-0.5 rounded-full">
                              Viagem aberta
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isConfirmed ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {isConfirmed ? '-' : ''}R$ {safeFixed(trip.totalLogistics)}
                          </span>
                          {isPending && (
                            <Button
                              variant="danger"
                              onClick={() => confirmLogisticsExpense(trip.id)}
                              className="text-xs px-2 py-1 h-auto"
                            >
                              Confirmar Gasto
                            </Button>
                          )}
                        </div>
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
                  );
                })
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Viagens confirmadas:</span>
              <span className="font-bold text-destructive">{confirmedTrips.length} (R$ {safeFixed(logisticsFund.totalSpent)})</span>
            </div>
            {pendingTrips.length > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Aguardando confirmação:</span>
                <span className="font-bold text-warning">{pendingTrips.length} (R$ {safeFixed(pendingAmount)})</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
