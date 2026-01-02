import { MapPin } from "lucide-react";
import { Input } from "./Input";

interface AddressFormData {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface AddressFormProps {
  form: AddressFormData;
  setForm: (form: any) => void;
  loading?: boolean;
  fetchCep: () => void;
}

export const AddressForm = ({ form, setForm, loading, fetchCep }: AddressFormProps) => (
  <div className="bg-muted p-4 rounded-lg border border-border">
    <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase flex items-center gap-1 tracking-wider">
      <MapPin size={12} /> Endereço
    </h4>
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 md:col-span-3">
        <Input
          label="CEP"
          value={form.cep}
          onChange={(e) => setForm({ ...form, cep: e.target.value })}
          onBlur={fetchCep}
          placeholder="00000-000"
        />
        {loading && <span className="text-xs text-primary">Buscando...</span>}
      </div>
      <div className="col-span-12 md:col-span-9">
        <Input
          label="Rua"
          value={form.rua}
          onChange={(e) => setForm({ ...form, rua: e.target.value })}
        />
      </div>
      <div className="col-span-6 md:col-span-3">
        <Input
          label="Número"
          value={form.numero}
          onChange={(e) => setForm({ ...form, numero: e.target.value })}
        />
      </div>
      <div className="col-span-6 md:col-span-3">
        <Input
          label="Comp."
          value={form.complemento}
          onChange={(e) => setForm({ ...form, complemento: e.target.value })}
        />
      </div>
      <div className="col-span-12 md:col-span-6">
        <Input
          label="Bairro"
          value={form.bairro}
          onChange={(e) => setForm({ ...form, bairro: e.target.value })}
        />
      </div>
      <div className="col-span-9 md:col-span-9">
        <Input
          label="Cidade"
          value={form.cidade}
          onChange={(e) => setForm({ ...form, cidade: e.target.value })}
        />
      </div>
      <div className="col-span-3 md:col-span-3">
        <Input
          label="UF"
          value={form.estado}
          onChange={(e) => setForm({ ...form, estado: e.target.value })}
          maxLength={2}
        />
      </div>
    </div>
  </div>
);
