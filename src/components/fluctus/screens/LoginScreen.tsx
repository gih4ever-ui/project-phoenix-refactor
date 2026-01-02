import { TrendingUp, Database } from "lucide-react";
import { Card, Button } from "../ui";

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md text-center space-y-8 p-10 border-t-4 border-t-primary">
      <div className="flex flex-col items-center gap-2">
        <div className="bg-primary/10 p-4 rounded-full">
          <TrendingUp className="text-primary" size={48} />
        </div>
        <h1 className="text-3xl font-bold text-foreground mt-4">Fluctus Gestão</h1>
        <p className="text-muted-foreground">Sistema de controle para confecção de sungas</p>
      </div>
      <div className="space-y-4">
        <Button
          onClick={onLogin}
          variant="primary"
          className="w-full py-3 flex justify-center text-base font-bold shadow-lg"
        >
          Acessar Sistema (Modo Local)
        </Button>
        <div className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
          <Database size={12} /> Dados salvos na memória
        </div>
      </div>
    </Card>
  </div>
);
