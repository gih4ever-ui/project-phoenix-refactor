import { useState, useEffect, useCallback, useRef } from 'react';
import { FluctusData, FixedCosts, LogisticsFund, LogisticsFundDeposit } from '@/types/fluctus';

const STORAGE_KEY = 'fluctus-data';

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
  shoppingTrips: [],
  logisticsFund: { deposits: [], totalDeposited: 0, totalSpent: 0, balance: 0 },
  promotions: []
};

// Migration function to ensure compatibility with older backups
const migrateData = (parsed: Partial<FluctusData>): FluctusData => {
  const migrated: FluctusData = {
    materials: parsed.materials || [],
    extras: parsed.extras || [],
    suppliers: parsed.suppliers || [],
    polos: parsed.polos || [],
    clients: parsed.clients || [],
    products: parsed.products || [],
    expenses: parsed.expenses || [],
    fixedCosts: parsed.fixedCosts || { total: 0, estimatedSales: 100, items: [] },
    kits: parsed.kits || [],
    shoppingTrips: parsed.shoppingTrips || [],
    logisticsFund: parsed.logisticsFund || { deposits: [], totalDeposited: 0, totalSpent: 0, balance: 0 },
    promotions: parsed.promotions || []
  };

  if (migrated.logisticsFund) {
    migrated.logisticsFund = {
      deposits: migrated.logisticsFund.deposits || [],
      totalDeposited: migrated.logisticsFund.totalDeposited || 0,
      totalSpent: migrated.logisticsFund.totalSpent || 0,
      balance: migrated.logisticsFund.balance ?? 0
    };
  }

  if (migrated.fixedCosts) {
    migrated.fixedCosts = {
      total: migrated.fixedCosts.total || 0,
      estimatedSales: migrated.fixedCosts.estimatedSales || 100,
      items: migrated.fixedCosts.items || []
    };
  }

  migrated.clients = migrated.clients.map(client => ({
    ...client,
    tags: client.tags || [],
    purchases: client.purchases || [],
    comments: client.comments || [],
    discounts: client.discounts || []
  }));

  migrated.shoppingTrips = migrated.shoppingTrips.map(trip => ({
    ...trip,
    logisticsConfirmed: trip.logisticsConfirmed ?? false
  }));

  return migrated;
};

const loadFromStorage = (): FluctusData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return migrateData(parsed);
    }
  } catch (e) {
    console.error('Erro ao carregar dados do localStorage:', e);
  }
  return INITIAL_DATA;
};

export const useLocalData = (initialData?: FluctusData) => {
  const [data, setData] = useState<FluctusData>(() => initialData || loadFromStorage());
  const isFirstRender = useRef(true);

  // Auto-save to localStorage on every change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }, [data]);

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

  const addLogisticsDeposit = (deposit: Omit<LogisticsFundDeposit, 'id'>) => {
    setData(prev => {
      const newDeposit = { ...deposit, id: Date.now() };
      const newDeposits = [...prev.logisticsFund.deposits, newDeposit];
      const totalDeposited = newDeposits.reduce((sum, d) => sum + d.value, 0);
      const totalSpent = prev.shoppingTrips
        .filter(t => t.logisticsConfirmed === true)
        .reduce((sum, t) => sum + t.totalLogistics, 0);
      return {
        ...prev,
        logisticsFund: {
          deposits: newDeposits,
          totalDeposited,
          totalSpent,
          balance: totalDeposited - totalSpent
        }
      };
    });
  };

  const removeLogisticsDeposit = (id: number) => {
    setData(prev => {
      const newDeposits = prev.logisticsFund.deposits.filter(d => d.id !== id);
      const totalDeposited = newDeposits.reduce((sum, d) => sum + d.value, 0);
      const totalSpent = prev.shoppingTrips
        .filter(t => t.logisticsConfirmed === true)
        .reduce((sum, t) => sum + t.totalLogistics, 0);
      return {
        ...prev,
        logisticsFund: {
          deposits: newDeposits,
          totalDeposited,
          totalSpent,
          balance: totalDeposited - totalSpent
        }
      };
    });
  };

  const recalculateLogisticsFund = () => {
    setData(prev => {
      const totalDeposited = prev.logisticsFund.deposits.reduce((sum, d) => sum + d.value, 0);
      const totalSpent = prev.shoppingTrips
        .filter(t => t.logisticsConfirmed === true)
        .reduce((sum, t) => sum + t.totalLogistics, 0);
      return {
        ...prev,
        logisticsFund: {
          ...prev.logisticsFund,
          totalDeposited,
          totalSpent,
          balance: totalDeposited - totalSpent
        }
      };
    });
  };

  const confirmLogisticsExpense = (tripId: number) => {
    setData(prev => {
      const updatedTrips = prev.shoppingTrips.map(t =>
        t.id === tripId ? { ...t, logisticsConfirmed: true } : t
      );
      const totalDeposited = prev.logisticsFund.deposits.reduce((sum, d) => sum + d.value, 0);
      const totalSpent = updatedTrips
        .filter(t => t.logisticsConfirmed === true)
        .reduce((sum, t) => sum + t.totalLogistics, 0);
      return {
        ...prev,
        shoppingTrips: updatedTrips,
        logisticsFund: {
          ...prev.logisticsFund,
          totalDeposited,
          totalSpent,
          balance: totalDeposited - totalSpent
        }
      };
    });
  };

  const unconfirmLogisticsExpense = (tripId: number) => {
    setData(prev => {
      const updatedTrips = prev.shoppingTrips.map(t =>
        t.id === tripId ? { ...t, logisticsConfirmed: false } : t
      );
      const totalDeposited = prev.logisticsFund.deposits.reduce((sum, d) => sum + d.value, 0);
      const totalSpent = updatedTrips
        .filter(t => t.logisticsConfirmed === true)
        .reduce((sum, t) => sum + t.totalLogistics, 0);
      return {
        ...prev,
        shoppingTrips: updatedTrips,
        logisticsFund: {
          ...prev.logisticsFund,
          totalDeposited,
          totalSpent,
          balance: totalDeposited - totalSpent
        }
      };
    });
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
      { id: matId1, name: 'Suplex Poliamida', buyUnit: 'kg', useUnit: 'm', yield: 3.5, composition: '80% Poliamida, 20% Elastano', quotes: [{ id: now + 7, supplierId: supId1, price: 45.50, obs: 'Preço à vista' }] },
      { id: matId2, name: 'Elástico 30mm', buyUnit: 'rolo', useUnit: 'm', yield: 50, composition: '100% Poliéster', quotes: [{ id: now + 9, supplierId: supId2, price: 25.00, obs: 'Rolo fechado' }] }
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
      platformFee: 0,
      margin: 100,
      finalPrice: 69.90,
      totalCost: 24.55,
      suggestedPrice: 65.00,
      realMargin: 60.5,
      materialCost: 8.55,
      extrasCost: 1.00,
      fixedCostPerUnit: 5.00,
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
      fixedCosts: { total: 2500, estimatedSales: 500, items: [{ id: 1, name: 'Aluguel', value: 1500 }] },
      logisticsFund: { 
        deposits: [{ id: 1, date: '2025-11-01', value: 50, description: 'Depósito inicial' }], 
        totalDeposited: 50, 
        totalSpent: 71.50, 
        balance: -21.50 
      },
      promotions: []
    };

    setData(prev => ({ ...prev, ...newData }));
  };

  const backup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluctus-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const restore = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const migrated = migrateData(parsed);
        setData(migrated);
      } catch (error) {
        console.error("Erro ao restaurar: arquivo inválido.");
      }
    };
    reader.readAsText(file);
  };

  return { data, add, update, remove, updateFixedCosts, addLogisticsDeposit, removeLogisticsDeposit, recalculateLogisticsFund, confirmLogisticsExpense, unconfirmLogisticsExpense, seed, backup, restore };
};

export type DatabaseHook = ReturnType<typeof useLocalData>;
