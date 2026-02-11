import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Safe value conversion
export const safeVal = (val: any): number => Number(val) || 0;

// Safe fixed decimal formatting
export const safeFixed = (val: any, digits: number = 2): string => safeVal(val).toFixed(digits);

// Safe ceiling - always round UP to avoid zero costs (e.g., 0.001 -> 0.01)
export const safeCeil = (val: any, digits: number = 2): number => {
  const num = safeVal(val);
  const multiplier = Math.pow(10, digits);
  return Math.ceil(num * multiplier) / multiplier;
};

// Format currency in BRL
export const formatCurrency = (val: any): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(safeVal(val));
};

// ===== Centralized Cost Calculation Functions =====

import type { Material, Extra, Product, Kit } from '@/types/fluctus';

/** Get the active price for a material: selectedQuoteId > cheapest quote > base price */
export const getMaterialPrice = (mat: Material): number => {
  if (mat.selectedQuoteId) {
    const selectedQuote = mat.quotes.find((q) => q.id === mat.selectedQuoteId);
    if (selectedQuote) return selectedQuote.price;
  }
  const sortedQuotes = [...mat.quotes].sort((a, b) => a.price - b.price);
  return sortedQuotes[0]?.price || mat.price || 0;
};

/** Get the active price for an extra: selectedQuoteId > cheapest quote > base price */
export const getExtraPrice = (ext: Extra): number => {
  if (ext.selectedQuoteId) {
    const selectedQuote = ext.quotes.find((q) => q.id === ext.selectedQuoteId);
    if (selectedQuote) return selectedQuote.price;
  }
  const sortedQuotes = [...ext.quotes].sort((a, b) => a.price - b.price);
  return sortedQuotes[0]?.price || ext.price || 0;
};

/** Get unit cost (price / yield), always rounded UP */
export const getUnitCost = (price: number, yieldVal: number): number => {
  return safeCeil(price / (yieldVal || 1));
};

/** Calculate the total extras cost for a product */
export const calcProductExtrasCost = (
  product: { selectedExtras?: { extraId: number | string; quantity: number }[] },
  extrasData: Extra[]
): number => {
  if (!product?.selectedExtras) return 0;
  return product.selectedExtras.reduce((acc, item) => {
    const ext = extrasData.find((e) => e.id == item.extraId);
    if (!ext) return acc;
    const price = getExtraPrice(ext);
    const unitCost = getUnitCost(price, ext.yield || 1);
    return acc + unitCost * item.quantity;
  }, 0);
};

/** Calculate the total materials cost for a product */
export const calcProductMaterialsCost = (
  productMaterials: { materialId: number | string; quantity: number }[],
  materialsData: Material[]
): number => {
  return productMaterials.reduce((sum, pm) => {
    const mat = materialsData.find((m) => m.id == pm.materialId);
    if (!mat) return sum;
    const price = getMaterialPrice(mat);
    const unitCost = getUnitCost(price, mat.yield || 1);
    return sum + unitCost * pm.quantity;
  }, 0);
};

/** Calculate kit financials: production cost, profit, margin */
export const calcKitFinancials = (
  kit: { items?: { id: number; qty: number; withoutPackaging?: boolean }[]; kitExtras?: { id: number; qty: number }[]; finalPrice?: number },
  productsData: Product[],
  extrasData: Extra[]
): { totalCost: number; profit: number; margin: number } => {
  let totalCost = 0;

  (kit.items || []).forEach((item) => {
    const prod = productsData.find((p) => p.id == item.id);
    if (prod) {
      let prodCost = Number(prod.totalCost) || 0;
      if (item.withoutPackaging) {
        prodCost -= calcProductExtrasCost(prod, extrasData);
      }
      totalCost += prodCost * item.qty;
    }
  });

  (kit.kitExtras || []).forEach((item) => {
    const ext = extrasData.find((e) => e.id == item.id);
    if (ext) {
      const price = getExtraPrice(ext);
      const unitCost = getUnitCost(price, ext.yield || 1);
      totalCost += unitCost * item.qty;
    }
  });

  const revenue = Number(kit.finalPrice) || 0;
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { totalCost, profit, margin };
};

// System tags for clients
export const SYSTEM_TAGS = [
  "VIP", "Atacado", "Revenda", "Influencer", "Amigo", "Black Friday", "Novo", "Problemático"
];

// Fetch CEP data
export const fetchCepData = async (cep: string) => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length < 8) return null;
  
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (!data.erro) {
      return {
        rua: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf,
        cep: cleanCep
      };
    }
  } catch (e) {
    console.error('Erro ao buscar CEP:', e);
  }
  return null;
};
