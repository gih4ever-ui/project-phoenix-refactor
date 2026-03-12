import { useEffect, useState } from "react";
import { Lock, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { Card, Button } from "../ui";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if this is a recovery session
  useEffect(() => {
    const hash = window.location.hash;
    const type = new URLSearchParams(hash.slice(1)).get("type");
    if (type !== "recovery") {
      setError("Link de recuperação inválido ou expirado. Solicite um novo link.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (newPassword.length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("As senhas não coincidem");
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Senha redefinida!",
        description: "Sua senha foi atualizada com sucesso. Você já pode fazer login.",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center space-y-6 p-8 border-t-4 border-t-destructive">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            <p className="font-medium">{error}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="w-full"
          >
            <ArrowLeft size={16} />
            Voltar para o login
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center space-y-6 p-8 border-t-4 border-t-success">
          <CheckCircle className="mx-auto text-success" size={64} />
          <h2 className="text-2xl font-bold text-foreground">Senha redefinida!</h2>
          <p className="text-muted-foreground">
            Sua senha foi atualizada com sucesso. Você já pode fazer login com a nova senha.
          </p>
          <Button
            variant="primary"
            onClick={() => window.location.href = "/"}
            className="w-full"
          >
            Ir para o login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center space-y-6 p-8 border-t-4 border-t-primary">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary/10 p-4 rounded-full">
            <Lock className="text-primary" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-3">Redefinir Senha</h1>
          <p className="text-sm text-muted-foreground">
            Digite sua nova senha abaixo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="password"
              placeholder="Nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 flex justify-center text-sm font-bold"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Redefinir Senha"}
          </Button>
        </form>
      </Card>
    </div>
  );
};
