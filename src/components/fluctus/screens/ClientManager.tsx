import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, Save, Phone, MapPin, User, MessageSquare, ShoppingBag, Ticket, Clock, X, Star, ChevronDown, ChevronUp, Users2, Gift } from "lucide-react";
import { Card, Button, Input, SearchBar, Badge, AddressForm } from "../ui";
import { safeFixed, fetchCepData, SYSTEM_TAGS } from "@/lib/utils";
import { DatabaseHook } from "@/hooks/useLocalData";

interface ClientManagerProps {
  db: DatabaseHook;
}

const GENDER_OPTIONS = [
  { value: "homem_cis", label: "Homem Cis" },
  { value: "homem_trans", label: "Homem Trans" },
  { value: "mulher_cis", label: "Mulher Cis" },
  { value: "mulher_trans", label: "Mulher Trans" },
  { value: "nao_binarie", label: "Pessoa não Binárie" },
  { value: "outro", label: "Outro" },
];

export const ClientManager = ({ db }: ClientManagerProps) => {
  const { data, add, update, remove } = db;
  const { clients } = data;
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    cpf: "",
    birthDate: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    notes: "",
    rating: "new",
    gender: "mulher_cis",
    genderOther: "",
    tags: [] as string[],
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [activeClientTab, setActiveClientTab] = useState("profile");
  const [newComment, setNewComment] = useState("");
  const [newTag, setNewTag] = useState("");
  const [availableTags, setAvailableTags] = useState(SYSTEM_TAGS);

  const handleFetchCep = async () => {
    setLoadingCep(true);
    const cepData = await fetchCepData(form.cep);
    if (cepData) {
      setForm({ ...form, ...cepData });
    }
    setLoadingCep(false);
  };

  const handleSave = () => {
    if (!form.name) return;
    const existingClient = clients.find((c) => c.id === editingId);
    const comments = existingClient?.comments || [];
    const discounts = existingClient?.discounts || [];
    const purchases = existingClient?.purchases || [];
    const newClient = { 
      ...form, 
      purchases, 
      comments, 
      discounts,
      gender: form.gender === "outro" ? `outro:${form.genderOther}` : form.gender,
    };
    if (editingId) {
      update("clients", editingId, newClient);
      setEditingId(null);
    } else {
      add("clients", newClient);
    }
    setForm({
      name: "",
      phone: "",
      email: "",
      cpf: "",
      birthDate: "",
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      notes: "",
      rating: "new",
      gender: "mulher_cis",
      genderOther: "",
      tags: [],
    });
  };

  const handleToggleTag = (tag: string) => {
    const currentTags = form.tags || [];
    if (currentTags.includes(tag)) {
      setForm({ ...form, tags: currentTags.filter((t) => t !== tag) });
    } else {
      setForm({ ...form, tags: [...currentTags, tag] });
    }
  };

  const handleAddNewTag = () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      setAvailableTags([...availableTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    // Check if any client is using this tag
    const clientsUsingTag = clients.filter((c) => c.tags?.includes(tagToRemove));
    if (clientsUsingTag.length > 0) {
      alert(`Esta tag está sendo usada por ${clientsUsingTag.length} cliente(s). Remova a tag dos clientes primeiro.`);
      return;
    }
    setAvailableTags(availableTags.filter((t) => t !== tagToRemove));
    // Also remove from form if selected
    if (form.tags?.includes(tagToRemove)) {
      setForm({ ...form, tags: form.tags.filter((t) => t !== tagToRemove) });
    }
  };

  const handleAddComment = (clientId: number) => {
    if (!newComment.trim()) return;
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      const updatedComments = [
        { id: Date.now(), text: newComment, date: new Date().toISOString() },
        ...(client.comments || []),
      ];
      update("clients", clientId, { ...client, comments: updatedComments });
      setNewComment("");
    }
  };

  const toggleExpand = (id: number) => setExpandedCardId(expandedCardId === id ? null : id);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGenderLabel = (genderValue: string) => {
    if (genderValue?.startsWith("outro:")) {
      return genderValue.replace("outro:", "");
    }
    const option = GENDER_OPTIONS.find((o) => o.value === genderValue);
    return option?.label || genderValue;
  };

  const getGenderEmoji = (genderValue: string) => {
    if (genderValue === "homem_trans" || genderValue === "mulher_trans" || genderValue === "nao_binarie") {
      return "🏳️‍⚧️";
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Gestão de Clientes (CRM)</h2>

      <Card className={editingId ? "border-l-4 border-l-warning bg-warning/5" : ""}>
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          {editingId ? "Editando Cliente" : "Novo Cliente"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <Input
              label="Nome Completo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-sm font-medium text-muted-foreground block mb-1">Gênero</label>
            <select
              className="w-full border border-input rounded-lg p-2 text-sm bg-card text-foreground"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <Input
              label="WhatsApp"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>

        {/* Gender Other Field */}
        {form.gender === "outro" && (
          <div className="mb-4">
            <Input
              label="Especifique o gênero"
              value={form.genderOther}
              onChange={(e) => setForm({ ...form, genderOther: e.target.value })}
              placeholder="Como você se identifica?"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="CPF"
            value={form.cpf}
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
          />
          <Input
            label="Data Nasc."
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
          />
        </div>
        <AddressForm form={form} setForm={setForm} loading={loadingCep} fetchCep={handleFetchCep} />

        <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
          <label className="text-sm font-bold text-muted-foreground mb-2 block flex items-center gap-1">
            <Users2 size={14} /> Grupos & Etiquetas
          </label>
          <div className="flex gap-2 items-center mb-3">
            <input
              className="border border-input rounded-lg p-1.5 text-xs w-40 bg-card text-foreground"
              placeholder="Nova tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <Button
              onClick={handleAddNewTag}
              className="h-7 px-3 text-xs"
              variant="secondary"
            >
              Criar Tag
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-card rounded border border-border">
            {availableTags.map((tag) => {
              const isSelected = form.tags?.includes(tag);
              return (
                <div key={tag} className="relative group">
                  <button
                    onClick={() => handleToggleTag(tag)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all pr-6 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary"
                    }`}
                  >
                    {tag}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    title="Remover tag da lista"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {editingId && (
            <Button
              onClick={() => {
                setEditingId(null);
                setForm({
                  name: "",
                  phone: "",
                  email: "",
                  cpf: "",
                  birthDate: "",
                  cep: "",
                  rua: "",
                  numero: "",
                  complemento: "",
                  bairro: "",
                  cidade: "",
                  estado: "",
                  gender: "mulher_cis",
                  genderOther: "",
                  tags: [],
                  notes: "",
                  rating: "new",
                });
              }}
              variant="ghost"
            >
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} variant={editingId ? "warning" : "success"}>
            <Save size={18} /> {editingId ? "Atualizar Cliente" : "Salvar Cliente"}
          </Button>
        </div>
      </Card>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar cliente..." />

      <div className="flex flex-col gap-3">
        {filteredClients.map((c) => {
          const isExpanded = expandedCardId === c.id;
          let badgeColor = "bg-primary";
          if (c.rating === "gold") badgeColor = "bg-badge-gold";
          const genderEmoji = getGenderEmoji(c.gender || "");

          return (
            <Card
              key={c.id}
              className={`relative transition-all cursor-pointer hover:border-primary/30 ${
                isExpanded ? "ring-2 ring-primary/20" : ""
              } p-0 overflow-hidden`}
            >
              <div
                className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4"
                onClick={() => toggleExpand(c.id)}
              >
                <div className="flex-grow">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-primary-foreground ${badgeColor}`}
                    >
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-lg flex items-center gap-2">
                        {c.name}
                        {c.rating === "gold" && (
                          <Star size={14} className="text-badge-gold fill-current" />
                        )}
                        {genderEmoji && <span className="text-lg">{genderEmoji}</span>}
                      </h4>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone size={14} /> {c.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {c.cidade}/{c.estado}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted animate-fade-in cursor-default">
                  <div className="flex border-b border-border bg-card">
                    <button
                      onClick={() => setActiveClientTab("profile")}
                      className={`flex-1 p-2 text-xs font-bold uppercase flex justify-center items-center gap-2 ${
                        activeClientTab === "profile"
                          ? "text-primary border-b-2 border-primary bg-primary/5"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <User size={14} /> Perfil
                    </button>
                    <button
                      onClick={() => setActiveClientTab("history")}
                      className={`flex-1 p-2 text-xs font-bold uppercase flex justify-center items-center gap-2 ${
                        activeClientTab === "history"
                          ? "text-primary border-b-2 border-primary bg-primary/5"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <MessageSquare size={14} /> Histórico
                    </button>
                    <button
                      onClick={() => setActiveClientTab("purchases")}
                      className={`flex-1 p-2 text-xs font-bold uppercase flex justify-center items-center gap-2 ${
                        activeClientTab === "purchases"
                          ? "text-primary border-b-2 border-primary bg-primary/5"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <ShoppingBag size={14} /> Compras
                    </button>
                    <button
                      onClick={() => setActiveClientTab("promotions")}
                      className={`flex-1 p-2 text-xs font-bold uppercase flex justify-center items-center gap-2 ${
                        activeClientTab === "promotions"
                          ? "text-primary border-b-2 border-primary bg-primary/5"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Gift size={14} /> Promoções
                    </button>
                  </div>

                  <div className="p-5">
                    {activeClientTab === "profile" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <p className="font-bold text-muted-foreground text-[10px] uppercase">
                            Dados Pessoais
                          </p>
                          <div className="bg-card p-3 rounded border border-border text-sm space-y-1">
                            <p>
                              <span className="text-muted-foreground">CPF:</span> {c.cpf || "-"}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Email:</span> {c.email || "-"}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Nascimento:</span>{" "}
                              {c.birthDate
                                ? new Date(c.birthDate).toLocaleDateString("pt-BR")
                                : "-"}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Gênero:</span>{" "}
                              {getGenderLabel(c.gender || "")}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold text-muted-foreground text-[10px] uppercase">
                            Endereço & Tags
                          </p>
                          <div className="bg-card p-3 rounded border border-border text-sm space-y-1">
                            <p>
                              {c.rua}, {c.numero} {c.complemento}
                            </p>
                            <p>
                              {c.bairro} - CEP: {c.cep}
                            </p>
                            <div className="pt-2 border-t mt-2">
                              <div className="flex gap-1 flex-wrap">
                                {c.tags && c.tags.length > 0 ? (
                                  c.tags.map((t) => (
                                    <Badge key={t} color="orange">
                                      {t}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    Sem tags
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeClientTab === "history" && (
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <input
                            className="flex-1 border border-input rounded-lg p-2 text-sm outline-none bg-card text-foreground"
                            placeholder="Nova nota..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddComment(c.id);
                            }}
                          />
                          <Button onClick={() => handleAddComment(c.id)} className="h-9 px-3">
                            <Plus size={16} />
                          </Button>
                        </div>
                        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                          {c.comments && c.comments.length > 0 ? (
                            c.comments.map((comment) => (
                              <div
                                key={comment.id}
                                className="flex gap-3 text-sm group bg-card p-2 rounded border border-border"
                              >
                                <div className="flex flex-col items-center pt-1">
                                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                                </div>
                                <div>
                                  <p className="text-foreground">{comment.text}</p>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                    <Clock size={10} />{" "}
                                    {new Date(comment.date).toLocaleString("pt-BR")}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground italic text-center text-xs py-4">
                              Nenhuma anotação no histórico.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {activeClientTab === "purchases" && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhuma compra registrada.</p>
                      </div>
                    )}

                    {activeClientTab === "promotions" && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Gift size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium mb-1">Promoções do Cliente</p>
                        <p className="text-xs">
                          Em breve você poderá gerenciar promoções individuais e por perfil aqui.
                        </p>
                        {c.discounts && c.discounts.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {c.discounts.map((d) => (
                              <div key={d.id} className="bg-card p-3 rounded border border-border text-left">
                                <div className="flex items-center justify-between">
                                  <Badge color={d.used ? "red" : "green"}>
                                    {d.used ? "Usado" : "Disponível"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Válido até: {new Date(d.validUntil).toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                                <p className="font-semibold text-foreground mt-2">{d.code}</p>
                                <p className="text-sm text-muted-foreground">{d.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6 p-3 bg-muted">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        const genderValue = c.gender || "mulher_cis";
                        const isOther = genderValue.startsWith("outro:");
                        setForm({
                          ...(c as any),
                          gender: isOther ? "outro" : genderValue,
                          genderOther: isOther ? genderValue.replace("outro:", "") : "",
                        });
                        setEditingId(c.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      variant="ghost"
                      className="text-primary hover:bg-primary/10 h-8 text-xs"
                    >
                      <Pencil size={14} /> Editar Dados
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove("clients", c.id);
                      }}
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 h-8 text-xs"
                    >
                      <Trash2 size={14} /> Excluir Cliente
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};