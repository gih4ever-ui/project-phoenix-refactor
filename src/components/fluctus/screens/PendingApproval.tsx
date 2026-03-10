import { Clock, LogOut } from "lucide-react";
import { Card, Button } from "../ui";
import { useAuth } from "@/hooks/useAuth";

export const PendingApproval = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center space-y-6 p-8 border-t-4 border-t-warning">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-warning/20 p-4 rounded-full">
            <Clock className="text-warning-foreground" size={40} />
          </div>
          <h2 className="text-xl font-bold text-foreground mt-3">Aguardando Aprovação</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta <strong>{user?.email}</strong> foi criada com sucesso, mas precisa ser aprovada por um administrador antes de acessar o sistema.
          </p>
        </div>
        <Button
          onClick={signOut}
          variant="outline"
          className="flex items-center gap-2 mx-auto"
        >
          <LogOut size={16} />
          Sair
        </Button>
      </Card>
    </div>
  );
};
