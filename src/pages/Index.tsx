import { useState } from "react";
import {
  LayoutDashboard, Package, Truck, Store, Users, Wallet, Tag, Box, Grid, Gift, LogOut, ArrowDown, ArrowUp, Menu, ShoppingCart, Percent, X
} from "lucide-react";
import { useLocalData } from "@/hooks/useLocalData";
import { ViewType } from "@/types/fluctus";
import {
  LoginScreen, Dashboard, SupplierManager, MaterialManager, ExtrasManager,
  FixedCosts, LogisticsFund, ClientManager, Catalog, ProductPricing, KitManager, ShoppingManager, PromotionsManager
} from "@/components/fluctus/screens";

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
  { id: "promotions" as ViewType, label: "Promoções", icon: Percent },
  { id: "financial" as ViewType, label: "Custos Fixos", icon: Wallet },
  { id: "logistics" as ViewType, label: "Fundo Logística", icon: Truck },
];

const Index = () => {
  const [view, setView] = useState<ViewType>("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const db = useLocalData();

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const handleMobileNav = (id: ViewType) => {
    setView(id);
    setIsMobileMenuOpen(false);
  };

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
        return <KitManager db={db} />;
      case "clients":
        return <ClientManager db={db} />;
      case "promotions":
        return <PromotionsManager db={db} />;
      case "financial":
        return <FixedCosts db={db} />;
      case "logistics":
        return <LogisticsFund db={db} />;
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
        {/* Mobile Header */}
        <header className="md:hidden bg-card border-b border-border p-4 flex justify-between items-center">
          <span className="font-bold text-lg text-foreground">Fluctus</span>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-muted rounded"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="md:hidden fixed right-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground z-50 flex flex-col animate-fade-in shadow-2xl">
              <div className="p-4 flex items-center justify-between border-b border-sidebar-muted/20">
                <span className="font-bold text-lg tracking-tight">
                  Fluctus<span className="text-sidebar-accent">.sys</span>
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-sidebar-muted/20 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNav(item.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-sm font-medium ${
                      view === item.id
                        ? "bg-sidebar-accent text-white shadow-lg"
                        : "text-sidebar-muted hover:bg-sidebar-muted/20 hover:text-sidebar-foreground"
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="p-4 border-t border-sidebar-muted/20">
                <button
                  onClick={() => {
                    setIsLoggedIn(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 text-destructive hover:text-destructive/80 text-sm font-medium w-full p-2 hover:bg-sidebar-muted/20 rounded-lg transition-colors"
                >
                  <LogOut size={20} />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background scroll-smooth custom-scrollbar">
          <div className="max-w-6xl mx-auto animate-fade-in">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default Index;
