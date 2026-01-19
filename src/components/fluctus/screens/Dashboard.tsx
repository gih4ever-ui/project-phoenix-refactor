import { useMemo, useRef } from "react";
import { Cake, Wand2, Download, Upload, Truck, AlertTriangle } from "lucide-react";
import { Card, Button, Badge } from "../ui";
import { safeFixed } from "@/lib/utils";
import { FluctusData } from "@/types/fluctus";

interface DashboardProps {
  data: FluctusData;
  seed: () => void;
  backup: () => void;
  restore: (file: File) => void;
}

export const Dashboard = ({ data, seed, backup, restore }: DashboardProps) => {
  const { products, shoppingTrips, clients } = data;
  const totalSpent = (shoppingTrips || []).reduce((acc, trip) => acc + (trip.grandTotal || 0), 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      restore(file);
      e.target.value = '';
    }
  };

  const upcomingBirthdays = useMemo(() => {
    if (!clients) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    return clients
      .filter((c) => c.birthDate)
      .map((c) => {
        const parts = c.birthDate!.split("-");
        const birthMonth = parseInt(parts[1], 10) - 1;
        const birthDay = parseInt(parts[2], 10);

        let nextBirthday = new Date(currentYear, birthMonth, birthDay);
        if (nextBirthday < today) {
          nextBirthday = new Date(currentYear + 1, birthMonth, birthDay);
        }

        const diffTime = nextBirthday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...c,
          nextBirthday,
          diffDays,
          displayDate: `${birthDay}/${String(birthMonth + 1).padStart(2, "0")}`,
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 5);
  }, [clients]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-2xl font-bold text-foreground">Visão Geral</h2>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={backup} variant="outline" className="text-xs gap-1">
            <Download size={14} /> Backup
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="text-xs gap-1">
            <Upload size={14} /> Restaurar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={seed} variant="ghost" className="text-xs gap-1">
            <Wand2 size={14} /> Dados Teste
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <p className="text-muted-foreground text-sm font-medium">Produtos Cadastrados</p>
          <p className="text-3xl font-bold text-foreground">{products.length}</p>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <p className="text-muted-foreground text-sm font-medium">Total Gasto (Compras)</p>
          <p className="text-3xl font-bold text-foreground">R$ {safeFixed(totalSpent)}</p>
        </Card>
        <Card className={`border-l-4 ${data.logisticsFund.balance >= 0 ? 'border-l-success' : 'border-l-destructive'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium flex items-center gap-1">
                <Truck size={14} /> Fundo Logística
              </p>
              <p className={`text-3xl font-bold ${data.logisticsFund.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                R$ {safeFixed(data.logisticsFund.balance)}
              </p>
            </div>
            {data.logisticsFund.balance < 0 && (
              <AlertTriangle className="text-destructive" size={24} />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Cake size={20} className="text-badge-pink" /> Próximos Aniversários
            </h3>
            <Badge color="pink" className="text-[10px]">
              CRM
            </Badge>
          </div>

          {upcomingBirthdays.length > 0 ? (
            <ul className="space-y-3">
              {upcomingBirthdays.map((client) => (
                <li
                  key={client.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-muted border border-border hover:border-badge-pink/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-card border border-badge-pink/20 text-badge-pink w-10 h-10 rounded-full flex flex-col items-center justify-center shadow-sm">
                      <span className="text-sm font-bold leading-none">
                        {client.displayDate.split("/")[0]}
                      </span>
                      <span className="text-[9px] font-bold uppercase leading-none mt-0.5">
                        {new Date(0, parseInt(client.displayDate.split("/")[1]) - 1)
                          .toLocaleString("pt-BR", { month: "short" })
                          .replace(".", "")}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.diffDays === 0 ? (
                          <span className="text-badge-pink font-bold animate-pulse">
                            É hoje! Parabéns! 🎉
                          </span>
                        ) : (
                          `Faltam ${client.diffDays} dias`
                        )}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/55${client.phone?.replace(/\D/g, "")}?text=Olá ${
                      client.name.split(" ")[0]
                    }! Vimos que seu aniversário está chegando e preparamos um presente especial para você! 🎁`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-success hover:bg-success/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="Enviar WhatsApp"
                  >
                    📱
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Cake size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum cliente cadastrado com data de nascimento.</p>
            </div>
          )}
        </Card>

        <Card className="h-full">
          <h3 className="font-bold text-foreground mb-4">Resumo Rápido</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Fornecedores</span>
              <span className="font-bold text-foreground">{data.suppliers.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Materiais</span>
              <span className="font-bold text-foreground">{data.materials.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Clientes</span>
              <span className="font-bold text-foreground">{data.clients.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Kits</span>
              <span className="font-bold text-foreground">{data.kits.length}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
