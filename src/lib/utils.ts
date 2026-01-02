import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Safe value conversion
export const safeVal = (val: any): number => Number(val) || 0;

// Safe fixed decimal formatting
export const safeFixed = (val: any, digits: number = 2): string => safeVal(val).toFixed(digits);

// Format currency in BRL
export const formatCurrency = (val: any): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(safeVal(val));
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
