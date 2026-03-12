import { useState } from "react";
import { TrendingUp, Mail, Lock, User, Loader2, ArrowLeft } from "lucide-react";
import { Card, Button } from "../ui";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "login" | "signup" | "forgot";

export const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { toast } = useToast();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu email para confirmar a conta. Após confirmação, um administrador precisará aprovar seu acesso.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({
          title: "Erro ao entrar com Google",
          description: String(error),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center space-y-6 p-8 border-t-4 border-t-primary">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary/10 p-4 rounded-full">
            <TrendingUp className="text-primary" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-3">Fluctus Gestão</h1>
          <p className="text-sm text-muted-foreground">
            {authMode === "login" && "Acesse sua conta"}
            {authMode === "signup" && "Crie sua conta"}
            {authMode === "forgot" && "Recuperar senha"}
          </p>
        </div>

        {authMode === "forgot" ? (
          forgotSent ? (
            <div className="space-y-4">
              <div className="bg-success/10 text-success p-4 rounded-lg">
                <p className="font-medium">Email enviado com sucesso!</p>
                <p className="text-sm mt-1">Verifique sua caixa de entrada e siga as instruções.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => { setAuthMode("login"); setForgotSent(false); }}
                className="w-full"
              >
                <ArrowLeft size={16} />
                Voltar para o login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-left">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="email"
                  placeholder="Email cadastrado"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 flex justify-center text-sm font-bold"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Enviar link de recuperação"}
              </Button>

              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="w-full text-sm text-primary font-medium hover:underline flex items-center justify-center gap-1"
              >
                <ArrowLeft size={14} />
                Voltar para o login
              </button>
            </form>
          )
        ) : (
          <>
            <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
              {authMode === "signup" && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={authMode === "signup"}
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {authMode === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAuthMode("forgot")}
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 flex justify-center text-sm font-bold"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : authMode === "login" ? "Entrar" : "Criar Conta"}
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-input bg-background hover:bg-muted text-foreground text-sm font-medium transition-colors disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Entrar com Google
                </>
              )}
            </button>

            <p className="text-xs text-muted-foreground">
              {authMode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
              <button
                onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                className="text-primary font-medium hover:underline"
              >
                {authMode === "login" ? "Criar conta" : "Fazer login"}
              </button>
            </p>
          </>
        )}
      </Card>
    </div>
  );
};
