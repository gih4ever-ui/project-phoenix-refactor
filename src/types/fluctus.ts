// Fluctus System Types

export interface Quote {
  id: number;
  supplierId: number | string;
  price: number;
  obs?: string;
}

export interface Material {
  id: number;
  name: string;
  buyUnit: string;
  useUnit: string;
  yield: number;
  composition?: string;
  price?: number;
  quotes: Quote[];
  selectedQuoteId?: number; // Which quote to use for pricing calculations
  createdAt?: Date;
}

export interface Extra {
  id: number;
  name: string;
  buyUnit: string;
  useUnit: string;
  yield: number;
  price?: number;
  quotes: Quote[];
  selectedQuoteId?: number; // Which quote to use for pricing calculations
  createdAt?: Date;
}

export interface Supplier {
  id: number;
  name: string;
  contact?: string;
  phone?: string;
  poloId?: number | string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

export interface Polo {
  id: number;
  name: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

export interface VariationType {
  id: number;
  name: string;
  options: string[];
}

export interface Variation {
  id: number;
  name: string;
  combination: string[];
  active: boolean;
  // Override materials/extras for this specific variation (inherits from product base if empty)
  materials?: ProductMaterial[];
  selectedExtras?: ProductExtra[];
}

export interface ProductMaterial {
  id: number;
  materialId: number | string;
  quantity: number;
}

export interface ProductExtra {
  id: number;
  extraId: number | string;
  quantity: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  laborCost: number;
  tax: number;
  commission: number;
  platformFee: number; // Taxa do sistema/site (%)
  margin: number;
  finalPrice: number;
  totalCost: number;
  suggestedPrice: number;
  realMargin: number;
  variationTypes: VariationType[];
  variations: Variation[];
  materials: ProductMaterial[];
  selectedExtras: ProductExtra[];
}

export interface KitItem {
  id: number;
  qty: number;
  withoutPackaging?: boolean;
}

export interface KitExtra {
  id: number;
  qty: number;
}

export interface Kit {
  id: number;
  name: string;
  items: KitItem[];
  kitExtras: KitExtra[];
  discount: number;
  finalPrice: number;
  totalProductionCost: number;
  displayPrice: number;
  margin: number;
  rawTotal: number;
}

export interface ClientComment {
  id: number;
  text: string;
  date: string;
}

export interface ClientDiscount {
  id: number;
  code: string;
  description: string;
  validUntil: string;
  dateGiven: string;
  used: boolean;
}

export interface Client {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  cpf?: string;
  birthDate?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  notes?: string;
  rating?: string;
  gender?: string;
  tags: string[];
  purchases: any[];
  comments?: ClientComment[];
  discounts?: ClientDiscount[];
}

export interface LogisticsItem {
  id: number;
  type: 'transport' | 'food';
  desc: string;
  value: number;
}

export interface InvoiceItem {
  id: number;
  type: 'material' | 'extra';
  qty: number;
  price: number;
}

export interface Invoice {
  id: number;
  supplierId: number | string;
  discount: number;
  discountValue: number;
  discountType: 'value' | 'percent';
  items: InvoiceItem[];
}

export interface ShoppingTrip {
  id: number;
  date: string;
  status: 'open' | 'completed';
  logistics: LogisticsItem[];
  invoices: Invoice[];
  totalLogistics: number;
  totalGoods: number;
  grandTotal: number;
}

export interface FixedCostItem {
  id: number;
  name: string;
  value: number;
}

export interface FixedCosts {
  total: number;
  estimatedSales: number;
  items: FixedCostItem[];
}

export interface FluctusData {
  materials: Material[];
  extras: Extra[];
  suppliers: Supplier[];
  polos: Polo[];
  clients: Client[];
  products: Product[];
  expenses: any[];
  fixedCosts: FixedCosts;
  kits: Kit[];
  shoppingTrips: ShoppingTrip[];
}

export type ViewType = 
  | 'dashboard' 
  | 'catalog' 
  | 'journey' 
  | 'suppliers' 
  | 'materials' 
  | 'extras' 
  | 'products' 
  | 'kits' 
  | 'clients' 
  | 'financial';
