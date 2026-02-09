import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Save, MapPin, Store, Building2 } from "lucide-react";
import { Card, Button, Input, SearchBar, Badge, AddressForm, ConfirmDialog } from "../ui";
import { fetchCepData } from "@/lib/utils";
import { DatabaseHook } from "@/hooks/useLocalData";

interface SupplierManagerProps {
  db: DatabaseHook;
}

type TabType = "suppliers" | "polos";

export const SupplierManager = ({ db }: SupplierManagerProps) => {
  const { data, add, update, remove } = db;
  const { suppliers, polos } = data;
  const [activeTab, setActiveTab] = useState<TabType>("suppliers");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null; type: 'supplier' | 'polo' }>({ open: false, id: null, type: 'supplier' });
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

  // Auto-fill address when polo is selected
  useEffect(() => {
    if (form.poloId && !editingId) {
      const selectedPolo = polos.find((p) => String(p.id) === String(form.poloId));
      if (selectedPolo) {
        setForm((prev) => ({
          ...prev,
          cep: selectedPolo.cep || "",
          rua: selectedPolo.rua || "",
          numero: selectedPolo.numero || "",
          complemento: selectedPolo.complemento || "",
          bairro: selectedPolo.bairro || "",
          cidade: selectedPolo.cidade || "",
          estado: selectedPolo.estado || "",
        }));
      }
    }
  }, [form.poloId]);

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

  const handleCancel = () => {
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

  const handleEditPolo = (polo: any) => {
    setPoloForm(polo);
    setEditingPoloId(polo.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelPolo = () => {
    setEditingPoloId(null);
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

  const filteredPolos = polos.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Fornecedores & Polos</h2>

      {/* Tab Switcher */}
      <div className="flex bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "suppliers"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Store size={18} />
          Fornecedores
        </button>
        <button
          onClick={() => setActiveTab("polos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "polos"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 size={18} />
          Polos de Compra
        </button>
      </div>

      {/* Suppliers Tab */}
      {activeTab === "suppliers" && (
        <>
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
              {form.poloId && (
                <p className="text-xs text-muted-foreground mt-1">
                  O endereço será preenchido automaticamente com base no polo selecionado. Você pode editá-lo se necessário.
                </p>
              )}
            </div>
            <AddressForm form={form} setForm={setForm} loading={loadingCep} fetchCep={handleFetchCep} />
            <div className="mt-4 flex justify-end gap-2">
              {editingId && (
                <Button onClick={handleCancel} variant="ghost">
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
                      onClick={() => setDeleteConfirm({ open: true, id: s.id, type: 'supplier' })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            {filteredSuppliers.length === 0 && (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
                <Store size={48} className="mx-auto mb-4 opacity-30" />
                <p>Nenhum fornecedor cadastrado.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Polos Tab */}
      {activeTab === "polos" && (
        <>
          {/* Polo Form */}
          <Card className={editingPoloId ? "border-l-4 border-l-warning bg-warning/5" : "border-l-4 border-l-success"}>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-success" />
              {editingPoloId ? "Editando Polo" : "Novo Polo de Compra"}
            </h3>
            <div className="mb-4">
              <Input
                label="Nome do Polo"
                value={poloForm.name}
                onChange={(e) => setPoloForm({ ...poloForm, name: e.target.value })}
                placeholder="Ex: Polo Brás, Polo 25 de Março"
              />
            </div>
            <AddressForm
              form={poloForm}
              setForm={setPoloForm}
              loading={loadingPoloCep}
              fetchCep={handleFetchPoloCep}
            />
            <div className="mt-4 flex justify-end gap-2">
              {editingPoloId && (
                <Button onClick={handleCancelPolo} variant="ghost">
                  Cancelar
                </Button>
              )}
              <Button onClick={handleSavePolo} variant={editingPoloId ? "warning" : "success"}>
                <Save size={18} /> {editingPoloId ? "Atualizar Polo" : "Salvar Polo"}
              </Button>
            </div>
          </Card>

          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar polo..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPolos.map((polo) => (
              <Card key={polo.id} className="border-l-4 border-l-success">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-foreground text-lg flex items-center gap-2">
                      <MapPin size={16} className="text-success" />
                      {polo.name}
                    </h4>
                    {polo.rua && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {polo.rua}, {polo.numero} {polo.complemento && `- ${polo.complemento}`}
                      </p>
                    )}
                    {polo.cidade && (
                      <p className="text-xs text-muted-foreground">
                        {polo.bairro} - {polo.cidade}/{polo.estado} - CEP: {polo.cep}
                      </p>
                    )}
                    {/* Show suppliers count */}
                    {(() => {
                      const suppliersInPolo = suppliers.filter((s) => s.poloId == polo.id);
                      return suppliersInPolo.length > 0 ? (
                        <Badge color="blue" className="mt-2">
                          {suppliersInPolo.length} fornecedor(es)
                        </Badge>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPolo(polo)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => {
                        const suppliersInPolo = suppliers.filter((s) => s.poloId == polo.id);
                        if (suppliersInPolo.length > 0) {
                          toast.warning(`Este polo possui ${suppliersInPolo.length} fornecedor(es) vinculado(s). Remova os fornecedores primeiro.`);
                          return;
                        }
                        setDeleteConfirm({ open: true, id: polo.id, type: 'polo' });
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            {filteredPolos.length === 0 && (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
                <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                <p>Nenhum polo cadastrado.</p>
              </div>
            )}
          </div>
        </>
      )}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, id: open ? deleteConfirm.id : null, type: deleteConfirm.type })}
        title={deleteConfirm.type === 'supplier' ? "Excluir Fornecedor" : "Excluir Polo"}
        description={`Tem certeza que deseja excluir ${deleteConfirm.type === 'supplier' ? 'este fornecedor' : 'este polo'}? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          if (deleteConfirm.id) {
            remove(deleteConfirm.type === 'supplier' ? 'suppliers' : 'polos', deleteConfirm.id);
          }
          setDeleteConfirm({ open: false, id: null, type: 'supplier' });
        }}
      />
    </div>
  );
};