import { useEffect, useState } from "react";
import { Users, Check, X, Shield, ChevronDown, ChevronUp, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, Button, Badge } from "../ui";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const callAdminApi = async (body: Record<string, unknown>) => {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke("admin-users", {
    body,
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (res.error) throw res.error;
  return res.data;
};

export const UserManager = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [formData, setFormData] = useState({ email: "", full_name: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreateUser = async () => {
    if (!formData.email) {
      toast.error("E-mail é obrigatório");
      return;
    }
    setSubmitting(true);
    try {
      await callAdminApi({
        action: "create",
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password || undefined,
      });
      toast.success("Usuário criado com sucesso!");
      setShowCreateDialog(false);
      setFormData({ email: "", full_name: "", password: "" });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await callAdminApi({
        action: "update",
        user_id: editingUser.id,
        full_name: formData.full_name,
        email: formData.email,
      });
      toast.success("Usuário atualizado!");
      setEditingUser(null);
      setFormData({ email: "", full_name: "", password: "" });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setSubmitting(true);
    try {
      await callAdminApi({ action: "delete", user_id: deleteUser.id });
      toast.success("Usuário removido!");
      setDeleteUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (u: UserRow) => {
    setFormData({ email: u.email, full_name: u.full_name, password: "" });
    setEditingUser(u);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-primary" size={28} />
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
        </div>
        <Button onClick={() => { setFormData({ email: "", full_name: "", password: "" }); setShowCreateDialog(true); }} className="gap-2">
          <Plus size={16} /> Novo Usuário
        </Button>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <Card className="p-6 border-t-4 border-t-warning">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Aguardando Aprovação ({pendingUsers.length})
          </h2>
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {(u.full_name || u.email)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{u.full_name || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => approveUser(u.id)} className="gap-1 text-sm px-3 py-1.5">
                    <Check size={14} /> Aprovar
                  </Button>
                  <Button variant="outline" onClick={() => setDeleteUser(u)} className="gap-1 text-sm px-3 py-1.5 text-destructive">
                    <Trash2 size={14} /> Remover
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
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {(u.full_name || u.email)[0]?.toUpperCase()}
                  </div>
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
                      <Button variant="outline" onClick={() => openEdit(u)} className="gap-1 text-sm px-3 py-1.5">
                        <Pencil size={14} /> Editar
                      </Button>
                      <Button variant="outline" onClick={() => rejectUser(u.id)} className="text-sm px-3 py-1.5">
                        Revogar Acesso
                      </Button>
                      <Button variant="outline" onClick={() => setDeleteUser(u)} className="text-destructive text-sm px-3 py-1.5 gap-1">
                        <Trash2 size={14} /> Remover
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

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome</Label>
              <Input id="create-name" placeholder="Nome completo" value={formData.full_name} onChange={(e) => setFormData(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">E-mail *</Label>
              <Input id="create-email" type="email" placeholder="email@exemplo.com" value={formData.email} onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-pass">Senha (opcional)</Label>
              <Input id="create-pass" type="password" placeholder="Deixe vazio para o usuário definir" value={formData.password} onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Se não definir, o usuário precisará usar "Esqueci minha senha".</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
              <Button onClick={handleCreateUser} disabled={submitting}>
                {submitting ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" value={formData.full_name} onChange={(e) => setFormData(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input id="edit-email" type="email" value={formData.email} onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button onClick={handleEditUser} disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
        title="Remover Usuário"
        message={`Tem certeza que deseja remover ${deleteUser?.full_name || deleteUser?.email}? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
};
