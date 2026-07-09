import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { NLQuery } from './pages/NLQuery';
import { ProductSearch } from './pages/ProductSearch';
import { FinishedGoodsExplorer } from './pages/FinishedGoodsExplorer';
import { Auth } from './pages/Auth';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => {
    return localStorage.getItem('currentTab') || 'dashboard';
  });

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
        <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-500 animate-spin" />
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
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-200">
      {/* Sidebar Nav */}
      <Sidebar currentTab={currentTab} setTab={setCurrentTab} />

      {/* Main content scroll workspace container */}
      <main className="flex-1 ml-64 min-h-screen p-8 overflow-y-auto relative">


        <div className="max-w-7xl mx-auto">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};
export default App;
