import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, MessageSquare, Search, Box, LogOut, User } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setTab }) => {
  const { logout, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'nlq', label: 'NL Explorer', icon: MessageSquare },
    { id: 'search', label: 'Product Search', icon: Search },
    { id: 'explorer', label: 'Finished Goods', icon: Box },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 z-30 transition-colors duration-200">
      
      {/* Brand Header */}
      <div>
        <div className="p-6 flex items-center gap-3 border-b border-slate-200">
          <img src={logoImg} alt="WFX Logo" className="h-8 w-auto object-contain" />
          <div className="h-4 w-px bg-slate-200"></div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            ERP
          </span>
        </div>
 
        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition duration-150 ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/50 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-500' : 'text-slate-550'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session and Sign Out */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        
        {/* User Card */}
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-500">
            <User className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 rounded-lg text-sm font-medium transition duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

    </aside>
  );
};
