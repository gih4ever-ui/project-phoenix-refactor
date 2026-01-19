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
  materialCost: number; // Custo calculado dos materiais
  extrasCost: number; // Custo calculado dos extras
  fixedCostPerUnit: number; // Custo fixo rateado por unidade
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
  promotionId: number;
  code: string;
  description: string;
  validUntil: string;
  dateGiven: string;
  used: boolean;
  usedAt?: string;
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

// Promotion Types based on common e-commerce patterns
export type PromotionType = 
  | 'take_x_pay_y'      // Leve X, pague Y
  | 'time_coupon'       // Cupom com limite de tempo
  | 'free_shipping'     // Frete grátis com valor mínimo
  | 'cross_selling'     // Desconto ao adicionar outro produto
  | 'seasonal'          // Promoção sazonal
  | 'progressive'       // Desconto progressivo (mais compra = mais desconto)
  | 'first_purchase'    // Desconto primeira compra
  | 'percentage'        // Desconto simples em %
  | 'fixed_value';      // Desconto valor fixo

export interface Promotion {
  id: number;
  name: string;
  type: PromotionType;
  description: string;
  code?: string; // Código do cupom (opcional)
  
  // Discount values
  discountPercent?: number;
  discountValue?: number;
  
  // Take X Pay Y specific
  takeQuantity?: number;
  payQuantity?: number;
  
  // Free shipping specific
  minOrderValue?: number;
  
  // Progressive discount tiers
  progressiveTiers?: { minQty: number; discount: number }[];
  
  // Cross selling specific
  requiredProductId?: number;
  discountProductId?: number;
  
  // Targeting
  targetType: 'all' | 'tags' | 'individual'; // Who can use
  targetTags?: string[]; // If targetType is 'tags'
  targetClientIds?: number[]; // If targetType is 'individual'
  
  // Validity
  startDate: string;
  endDate: string;
  active: boolean;
  
  // Usage limits
  maxUsesTotal?: number; // Total uses allowed
  maxUsesPerClient?: number; // Uses per client
  
  // Stats
  totalGiven: number; // Total clients who received
  totalUsed: number; // Total uses
  
  createdAt: string;
}

export interface LogisticsItem {
  id: number;
  type: 'transport' | 'food';
  desc: string;
  value: number;
}

export interface InvoiceItem {
  id: number;
  type: 'material' | 'extra' | 'other';
  qty: number;
  price: number;
  description?: string; // For 'other' type items
  includeInTotal?: boolean; // Whether to include in cost calculations (default true)
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
  logisticsConfirmed?: boolean; // Whether the logistics cost has been deducted from the fund
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

export interface LogisticsFundDeposit {
  id: number;
  date: string;
  value: number;
  description?: string;
}

export interface LogisticsFund {
  deposits: LogisticsFundDeposit[];
  totalDeposited: number;
  totalSpent: number; // Calculated from completed shopping trips
  balance: number;
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
  logisticsFund: LogisticsFund;
  promotions: Promotion[];
}

export type ViewType = 
  | 'dashboard' 
  | 'catalog' 
  | 'shopping'
  | 'journey' 
  | 'suppliers' 
  | 'materials' 
  | 'extras' 
  | 'products' 
  | 'kits' 
  | 'clients' 
  | 'financial'
  | 'logistics'
  | 'promotions';
