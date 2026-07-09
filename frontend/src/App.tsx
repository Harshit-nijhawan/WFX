import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { NLQuery } from './pages/NLQuery';
import { ProductSearch } from './pages/ProductSearch';
import { FinishedGoodsExplorer } from './pages/FinishedGoodsExplorer';
import { Auth } from './pages/Auth';
import { Loader2, Menu } from 'lucide-react';
import logoImg from './assets/logo.png';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => {
    return localStorage.getItem('currentTab') || 'dashboard';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  useEffect(() => {
    localStorage.setItem('currentTab', currentTab);
  }, [currentTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-400">Loading session details...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'nlq':
        return <NLQuery />;
      case 'search':
        return <ProductSearch />;
      case 'explorer':
        return <FinishedGoodsExplorer />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row transition-colors duration-200">
      {/* Sidebar Nav */}
      <Sidebar 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-35 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Main Area Wrapper */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Top Header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-20">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-650 transition"
            title="Open Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <img src={logoImg} alt="WFX Logo" className="h-6.5 w-auto object-contain" />
          <div className="w-9"></div> {/* balance spacer */}
        </div>

        {/* Main content scroll workspace container */}
        <main className="flex-1 ml-0 lg:ml-64 p-5 md:p-8 overflow-y-auto relative bg-background">
          <div className="max-w-7xl mx-auto">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};
export default App;
