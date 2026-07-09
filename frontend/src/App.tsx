import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { NLQuery } from './pages/NLQuery';
import { ProductSearch } from './pages/ProductSearch';
import { FinishedGoodsExplorer } from './pages/FinishedGoodsExplorer';
import { Auth } from './pages/Auth';
import { Loader2, Sun, Moon } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true; // Default to dark mode for rich aesthetics
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

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
        {/* Top Right Theme Toggle */}
        <div className="absolute top-8 right-8 z-20">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg shadow-sm transition-all duration-150 flex items-center gap-2 text-xs font-medium"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-500" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>

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
