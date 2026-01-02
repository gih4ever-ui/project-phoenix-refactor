import { useState } from 'react';
import { FluctusData, FixedCosts } from '@/types/fluctus';

const INITIAL_DATA: FluctusData = {
  materials: [],
  extras: [],
  suppliers: [],
  polos: [],
  clients: [],
  products: [],
  expenses: [],
  fixedCosts: { total: 0, estimatedSales: 100, items: [] },
  kits: [],
  shoppingTrips: []
};

export const useLocalData = (initialData: FluctusData = INITIAL_DATA) => {
  const [data, setData] = useState<FluctusData>(initialData);

  const add = (collection: keyof Omit<FluctusData, 'fixedCosts' | 'expenses'>, item: any) => {
    setData(prev => ({
      ...prev,
      [collection]: [...(prev[collection] as any[]), { ...item, id: Date.now() }]
    }));
  };

  const update = (collection: keyof Omit<FluctusData, 'fixedCosts' | 'expenses'>, id: number, updates: any) => {
    setData(prev => ({
      ...prev,
      [collection]: (prev[collection] as any[]).map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  };

  const remove = (collection: keyof Omit<FluctusData, 'fixedCosts' | 'expenses'>, id: number) => {
    setData(prev => ({
      ...prev,
      [collection]: (prev[collection] as any[]).filter(item => item.id !== id)
    }));
  };

  const updateFixedCosts = (newCosts: Partial<FixedCosts>) => {
    setData(prev => ({ ...prev, fixedCosts: { ...prev.fixedCosts, ...newCosts } }));
  };

  const seed = () => {
    const now = Date.now();
    const poloId1 = now + 1;
    const supId1 = now + 3;
    const supId2 = now + 4;
    const matId1 = now + 5;
    const matId2 = now + 6;
    const prodId1 = now + 200;

    const materialsData = [
      { id: matId1, name: 'Suplex Poliamida', buyUnit: 'kg', useUnit: 'm', yield: 3.5, quotes: [{ id: now + 7, supplierId: supId1, price: 45.50, obs: 'Preço à vista' }] },
      { id: matId2, name: 'Elástico 30mm', buyUnit: 'rolo', useUnit: 'm', yield: 50, quotes: [{ id: now + 9, supplierId: supId2, price: 25.00, obs: 'Rolo fechado' }] }
    ];

    const extrasData = [
      { id: now + 90, name: 'Caixa Padrão', buyUnit: 'un', useUnit: 'un', yield: 1, price: 1.50, quotes: [{ id: now + 94, supplierId: supId2, price: 1.50, obs: 'Padrão' }] },
      { id: now + 91, name: 'Tag da Marca', buyUnit: 'milheiro', useUnit: 'un', yield: 1000, price: 0.30, quotes: [{ id: now + 95, supplierId: supId2, price: 300.00, obs: 'Milheiro' }] }
    ];

    const product1 = {
      id: prodId1,
      name: "Sunga Boxer Clássica",
      description: "Modelo tradicional",
      laborCost: 15.00,
      tax: 4,
      commission: 0,
      margin: 100,
      finalPrice: 69.90,
      totalCost: 24.55,
      suggestedPrice: 65.00,
      realMargin: 60.5,
      variationTypes: [
        { id: 1, name: 'Cor', options: ['Preta', 'Azul'] },
        { id: 2, name: 'Tamanho', options: ['P', 'M', 'G'] }
      ],
      variations: [
        { id: 10, name: 'Preta - P', combination: ['Preta', 'P'], active: true },
        { id: 11, name: 'Preta - M', combination: ['Preta', 'M'], active: true },
        { id: 12, name: 'Preta - G', combination: ['Preta', 'G'], active: true },
        { id: 13, name: 'Azul - P', combination: ['Azul', 'P'], active: true },
        { id: 14, name: 'Azul - M', combination: ['Azul', 'M'], active: false }
      ],
      materials: [{ id: now + 201, materialId: matId1, quantity: 0.3 }, { id: now + 202, materialId: matId2, quantity: 0.7 }],
      selectedExtras: [{ id: now + 203, extraId: now + 91, quantity: 1 }]
    };

    const kit1 = {
      id: now + 300,
      name: "Kit Pai e Filho Verão",
      items: [{ id: prodId1, qty: 2 }],
      kitExtras: [{ id: now + 90, qty: 1 }],
      discount: 5,
      finalPrice: 129.90,
      totalProductionCost: 50.60,
      displayPrice: 129.90,
      margin: 61.0,
      rawTotal: 139.80
    };

    const clientsData = [{
      id: now + 10,
      name: 'João da Silva',
      phone: '21999991234',
      email: 'joao@teste.com',
      cpf: '123.456.789-00',
      birthDate: new Date().toISOString().split('T')[0],
      cep: '20000-000',
      rua: 'Rua Teste',
      numero: '123',
      bairro: 'Centro',
      cidade: 'Rio',
      estado: 'RJ',
      tags: ['VIP'],
      purchases: []
    }];

    const trip1 = {
      id: now + 600,
      date: '2025-12-05',
      status: 'completed' as const,
      logistics: [
        { id: 1, type: 'transport' as const, desc: 'Uber Ida', value: 25.00 },
        { id: 2, type: 'food' as const, desc: 'Lanche', value: 18.50 },
        { id: 3, type: 'transport' as const, desc: 'Uber Volta', value: 28.00 }
      ],
      invoices: [
        {
          id: 101,
          supplierId: supId1,
          discount: 10.00,
          discountValue: 10.00,
          discountType: 'value' as const,
          items: [
            { id: matId1, type: 'material' as const, qty: 20, price: 44.00 }
          ]
        }
      ],
      totalLogistics: 71.50,
      totalGoods: 870.00,
      grandTotal: 941.50
    };

    const newData: FluctusData = {
      polos: [{ id: poloId1, name: 'Polo Brás', cep: '03001000', rua: 'Rua Miller', numero: '500', bairro: 'Brás', cidade: 'São Paulo', estado: 'SP' }],
      suppliers: [
        { id: supId1, name: 'Têxtil Santos', contact: 'Carlos', phone: '11999998888', poloId: poloId1, cep: '03001000', rua: 'Rua Miller', numero: '500', bairro: 'Brás', cidade: 'São Paulo', estado: 'SP' },
        { id: supId2, name: 'Aviamentos Silva', contact: 'Ana', phone: '21988887777', cep: '25685100', rua: 'Rua Teresa', numero: '150', bairro: 'Alto da Serra', cidade: 'Petrópolis', estado: 'RJ' }
      ],
      materials: materialsData,
      extras: extrasData,
      products: [product1],
      kits: [kit1],
      clients: clientsData,
      expenses: [],
      shoppingTrips: [trip1],
      fixedCosts: { total: 2500, estimatedSales: 500, items: [{ id: 1, name: 'Aluguel', value: 1500 }] }
    };

    setData(prev => ({ ...prev, ...newData }));
    alert("Dados de teste gerados!");
  };

  return { data, add, update, remove, updateFixedCosts, seed };
};

export type DatabaseHook = ReturnType<typeof useLocalData>;
