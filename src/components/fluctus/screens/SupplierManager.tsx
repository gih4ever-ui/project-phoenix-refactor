import { useState } from "react";
import { Plus, Trash2, Pencil, Star, Sparkles, X, Save, MapPin } from "lucide-react";
import { Card, Button, Input, SearchBar, Badge, AddressForm } from "../ui";
import { safeFixed, fetchCepData } from "@/lib/utils";
import { DatabaseHook } from "@/hooks/useLocalData";

interface SupplierManagerProps {
  db: DatabaseHook;
}

export const SupplierManager = ({ db }: SupplierManagerProps) => {
  const { data, add, update, remove } = db;
  const { suppliers, polos } = data;
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    phone: "",
    poloId: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  });
  const [loadingCep, setLoadingCep] = useState(false);

  // Polo form
  const [newPoloName, setNewPoloName] = useState("");
  const [editingPoloId, setEditingPoloId] = useState<number | null>(null);
  const [poloForm, setPoloForm] = useState({
    name: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  });
  const [loadingPoloCep, setLoadingPoloCep] = useState(false);

  const handleFetchCep = async () => {
    setLoadingCep(true);
    const cepData = await fetchCepData(form.cep);
    if (cepData) {
      setForm({ ...form, ...cepData });
    }
    setLoadingCep(false);
  };

  const handleFetchPoloCep = async () => {
    setLoadingPoloCep(true);
    const cepData = await fetchCepData(poloForm.cep);
    if (cepData) {
      setPoloForm({ ...poloForm, ...cepData });
    }
    setLoadingPoloCep(false);
  };

  const handleSave = () => {
    if (!form.name) return;
    if (editingId) {
      update("suppliers", editingId, form);
      setEditingId(null);
    } else {
      add("suppliers", form);
    }
    setForm({
      name: "",
      contact: "",
      phone: "",
      poloId: "",
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
    });
  };

  const handleEdit = (supplier: any) => {
    setForm(supplier);
    setEditingId(supplier.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSavePolo = () => {
    if (!poloForm.name) return;
    if (editingPoloId) {
      update("polos", editingPoloId, poloForm);
      setEditingPoloId(null);
    } else {
      add("polos", poloForm);
    }
    setPoloForm({
      name: "",
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
    });
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Fornecedores & Polos</h2>

      {/* Polo Management */}
      <Card className="border-l-4 border-l-success">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-success" /> Polos de Compra
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            label="Nome do Polo"
            value={poloForm.name}
            onChange={(e) => setPoloForm({ ...poloForm, name: e.target.value })}
            placeholder="Ex: Polo Brás"
          />
          <div className="flex items-end gap-2">
            <Button onClick={handleSavePolo} variant="success">
              <Plus size={18} /> Adicionar Polo
            </Button>
          </div>
        </div>
        <AddressForm
          form={poloForm}
          setForm={setPoloForm}
          loading={loadingPoloCep}
          fetchCep={handleFetchPoloCep}
        />
        <div className="flex flex-wrap gap-2 mt-4">
          {polos.map((polo) => (
            <Badge key={polo.id} color="green" className="flex items-center gap-2 py-2 px-3">
              <MapPin size={12} />
              {polo.name}
              <button
                onClick={() => remove("polos", polo.id)}
                className="ml-1 hover:text-destructive"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      </Card>

      {/* Supplier Form */}
      <Card className={editingId ? "border-l-4 border-l-warning bg-warning/5" : ""}>
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          {editingId ? "Editando Fornecedor" : "Novo Fornecedor"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            label="Nome/Razão Social"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Contato"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <Input
            label="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="mb-4">
          <label className="text-sm font-medium text-muted-foreground block mb-1">
            Polo de Compra
          </label>
          <select
            className="w-full md:w-64 border border-input rounded-lg p-2 text-sm bg-card text-foreground"
            value={form.poloId}
            onChange={(e) => setForm({ ...form, poloId: e.target.value })}
          >
            <option value="">Avulso (Sem Polo)</option>
            {polos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <AddressForm form={form} setForm={setForm} loading={loadingCep} fetchCep={handleFetchCep} />
        <div className="mt-4 flex justify-end gap-2">
          {editingId && (
            <Button
              onClick={() => {
                setEditingId(null);
                setForm({
                  name: "",
                  contact: "",
                  phone: "",
                  poloId: "",
                  cep: "",
                  rua: "",
                  numero: "",
                  complemento: "",
                  bairro: "",
                  cidade: "",
                  estado: "",
                });
              }}
              variant="ghost"
            >
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} variant={editingId ? "warning" : "success"}>
            <Save size={18} /> {editingId ? "Atualizar" : "Salvar"}
          </Button>
        </div>
      </Card>

      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar fornecedor..."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSuppliers.map((s) => (
          <Card key={s.id} className="border-l-4 border-l-primary">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-foreground text-lg">{s.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {s.contact} • {s.phone}
                </p>
                {s.cidade && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.cidade}/{s.estado}
                  </p>
                )}
                {s.poloId && (
                  <Badge color="green" className="mt-2">
                    <MapPin size={10} className="mr-1" />
                    {polos.find((p) => p.id == s.poloId)?.name}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(s)}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => remove("suppliers", s.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
