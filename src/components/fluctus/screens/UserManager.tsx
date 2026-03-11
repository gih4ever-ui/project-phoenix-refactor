import { useEffect, useState } from "react";
import { Users, Check, X, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { Card, Button, Badge } from "../ui";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: "pending" | "approved" | "admin";
  permissions: string[];
}

const ALL_PERMISSIONS = [
  { id: "dashboard", label: "Visão Geral" },
  { id: "catalog", label: "Catálogo" },
  { id: "shopping", label: "Compras" },
  { id: "suppliers", label: "Fornecedores" },
  { id: "materials", label: "Insumos" },
  { id: "extras", label: "Embalagens" },
  { id: "products", label: "Produtos" },
  { id: "kits", label: "Kits" },
  { id: "clients", label: "Clientes" },
  { id: "promotions", label: "Promoções" },
  { id: "financial", label: "Custos Fixos" },
  { id: "logistics", label: "Fundo Logística" },
];

export const UserManager = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (!profiles || !roles) {
      setLoading(false);
      return;
    }

    const usersWithRoles: UserRow[] = await Promise.all(
      profiles.map(async (p) => {
        const role = roles.find((r) => r.user_id === p.id);
        const { data: perms } = await supabase.rpc("get_user_permissions", { _user_id: p.id });
        return {
          id: p.id,
          email: p.email || "",
          full_name: p.full_name || "",
          avatar_url: p.avatar_url || "",
          role: (role?.role || "pending") as UserRow["role"],
          permissions: (perms as string[]) || [],
        };
      })
    );

    setUsers(usersWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const approveUser = async (userId: string) => {
    const { error: roleErr } = await supabase
      .from("user_roles")
      .update({ role: "approved" })
      .eq("user_id", userId);

    if (roleErr) {
      toast.error("Erro ao aprovar usuário");
      return;
    }

    // Grant all permissions by default
    await supabase.rpc("grant_all_permissions", { _user_id: userId });
    toast.success("Usuário aprovado com todas as permissões!");
    fetchUsers();
  };

  const rejectUser = async (userId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: "pending" })
      .eq("user_id", userId);

    if (error) {
      toast.error("Erro ao rejeitar usuário");
      return;
    }

    // Remove all permissions
    await supabase.from("user_permissions").delete().eq("user_id", userId);
    toast.success("Acesso do usuário revogado");
    fetchUsers();
  };

  const togglePermission = async (userId: string, permission: string, hasIt: boolean) => {
    if (hasIt) {
      await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", userId)
        .eq("permission", permission);
    } else {
      await supabase
        .from("user_permissions")
        .insert({ user_id: userId, permission });
    }
    fetchUsers();
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge color="green">Admin</Badge>;
      case "approved":
        return <Badge color="blue">Aprovado</Badge>;
      default:
        return <Badge color="orange">Pendente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const pendingUsers = users.filter((u) => u.role === "pending");
  const activeUsers = users.filter((u) => u.role !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="text-primary" size={28} />
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <Card className="p-6 border-t-4 border-t-warning">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Aguardando Aprovação ({pendingUsers.length})
          </h2>
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {(u.full_name || u.email)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">{u.full_name || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approveUser(u.id)} className="gap-1">
                    <Check size={14} /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectUser(u.id)} className="gap-1 text-destructive">
                    <X size={14} /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active Users */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Usuários Ativos ({activeUsers.length})
        </h2>
        <div className="space-y-2">
          {activeUsers.map((u) => (
            <div key={u.id} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {(u.full_name || u.email)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-medium text-foreground">{u.full_name || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="ml-3">{roleBadge(u.role)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {u.permissions.length}/{ALL_PERMISSIONS.length} telas
                  </span>
                  {expandedUser === u.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {expandedUser === u.id && (
                <div className="px-4 pb-4 border-t border-border">
                  <p className="text-sm text-muted-foreground my-3">Permissões de acesso às telas:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {ALL_PERMISSIONS.map((perm) => {
                      const hasIt = u.permissions.includes(perm.id);
                      return (
                        <button
                          key={perm.id}
                          onClick={() => u.role !== "admin" && togglePermission(u.id, perm.id, hasIt)}
                          disabled={u.role === "admin"}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
                            hasIt
                              ? "bg-primary/10 border-primary/30 text-foreground"
                              : "bg-muted/30 border-border text-muted-foreground"
                          } ${u.role === "admin" ? "opacity-60 cursor-not-allowed" : "hover:bg-primary/20 cursor-pointer"}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            hasIt ? "bg-primary border-primary" : "border-muted-foreground"
                          }`}>
                            {hasIt && <Check size={10} className="text-primary-foreground" />}
                          </div>
                          {perm.label}
                        </button>
                      );
                    })}
                  </div>
                  {u.role !== "admin" && (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => rejectUser(u.id)} className="text-destructive">
                        Revogar Acesso
                      </Button>
                    </div>
                  )}
                  {u.role === "admin" && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <Shield size={12} /> Admins têm acesso total e não podem ser editados aqui.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
