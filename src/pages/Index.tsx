import { useState } from "react";
import {
  LayoutDashboard, Package, Truck, Store, Users, Wallet, Tag, Box, Grid, Gift, LogOut, ArrowDown, ArrowUp, ListFilter, ShoppingCart
} from "lucide-react";
import { useLocalData } from "@/hooks/useLocalData";
import { ViewType } from "@/types/fluctus";
import {
  LoginScreen, Dashboard, SupplierManager, MaterialManager, ExtrasManager,
  FixedCosts, ClientManager, Catalog, ProductPricing
} from "@/components/fluctus/screens";
import ShoppingManager from "@/components/fluctus/screens/ShoppingManager";

const menuItems = [
  { id: "dashboard" as ViewType, label: "Visão Geral", icon: LayoutDashboard },
  { id: "catalog" as ViewType, label: "Catálogo", icon: Grid },
  { id: "shopping" as ViewType, label: "Compras", icon: ShoppingCart },
  { id: "suppliers" as ViewType, label: "Fornecedores", icon: Store },
  { id: "materials" as ViewType, label: "Insumos", icon: Package },
  { id: "extras" as ViewType, label: "Embalagens", icon: Gift },
  { id: "products" as ViewType, label: "Produtos", icon: Tag },
  { id: "kits" as ViewType, label: "Kits", icon: Box },
  { id: "clients" as ViewType, label: "Clientes", icon: Users },
  { id: "financial" as ViewType, label: "Custos Fixos", icon: Wallet },
];

const Index = () => {
  const [view, setView] = useState<ViewType>("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const db = useLocalData();

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderContent = () => {
    switch (view) {
      case "dashboard":
        return <Dashboard data={db.data} seed={db.seed} backup={db.backup} restore={db.restore} />;
      case "catalog":
        return <Catalog db={db} />;
      case "shopping":
        return <ShoppingManager db={db} />;
      case "suppliers":
        return <SupplierManager db={db} />;
      case "materials":
        return <MaterialManager db={db} />;
      case "extras":
        return <ExtrasManager db={db} />;
      case "products":
        return <ProductPricing db={db} />;
      case "kits":
        return <Catalog db={db} />;
      case "clients":
        return <ClientManager db={db} />;
      case "financial":
        return <FixedCosts db={db} />;
      default:
        return <Dashboard data={db.data} seed={db.seed} backup={db.backup} restore={db.restore} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar Desktop */}
      <aside
        className={`bg-sidebar text-sidebar-foreground flex-col transition-all duration-300 hidden md:flex ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-sidebar-muted/20">
          {isSidebarOpen && (
            <span className="font-bold text-lg tracking-tight">
              Fluctus<span className="text-sidebar-accent">.sys</span>
            </span>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-sidebar-muted/20 rounded-lg"
          >
            {isSidebarOpen ? (
              <ArrowDown className="rotate-90" size={20} />
            ) : (
              <ArrowUp className="rotate-90" size={20} />
            )}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-sm font-medium ${
                view === item.id
                  ? "bg-sidebar-accent text-white shadow-lg"
                  : "text-sidebar-muted hover:bg-sidebar-muted/20 hover:text-sidebar-foreground"
              }`}
              title={!isSidebarOpen ? item.label : ""}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-muted/20">
          <button
            onClick={() => setIsLoggedIn(false)}
            className="flex items-center gap-3 text-destructive hover:text-destructive/80 text-sm font-medium w-full p-2 hover:bg-sidebar-muted/20 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden bg-card border-b border-border p-4 flex justify-between items-center">
          <span className="font-bold text-lg text-foreground">Fluctus</span>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-muted rounded">
              <ListFilter size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background scroll-smooth custom-scrollbar">
          <div className="max-w-6xl mx-auto animate-fade-in">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default Index;
