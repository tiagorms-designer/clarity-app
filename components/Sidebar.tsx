import React from 'react';
import { LayoutDashboard, Plus, FileText, Settings, Shield, LogOut, HelpCircle, ClipboardCheck, FolderOpen } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onChangeView(view)}
        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 mb-1 relative group
          ${isActive 
            ? 'bg-white text-primary shadow-sm ring-1 ring-gray-100' 
            : 'text-secondary hover:bg-gray-50 hover:text-dark'
          }`}
      >
        <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`} />
        {label}
        {isActive && (
             <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary"></div>
        )}
      </button>
    );
  };

  return (
    <div className="w-72 bg-white h-screen flex flex-col shrink-0 py-6 px-5 font-sans border-r border-transparent md:border-none shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-2 mb-6">
        <img 
            src="https://raw.githubusercontent.com/tiagorms-designer/clarity-assets/refs/heads/main/public%20/brand/logo.svg" 
            alt="Clarity Logo" 
            className="h-12 w-auto object-contain"
        />
      </div>

      {/* Primary CTA Button */}
      <div className="mb-8">
        <button 
            onClick={() => onChangeView('UPLOAD')}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-sm font-bold text-white shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0
            ${currentView === 'UPLOAD' 
                ? 'bg-primary ring-4 ring-indigo-100 shadow-indigo-200' 
                : 'bg-primary shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:bg-indigo-600'
            }`}
        >
            <div className="bg-white/20 p-1 rounded-lg">
                <Plus className="w-4 h-4" strokeWidth={3} />
            </div>
            Novo Documento
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-1.5">
        <div className="px-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Menu Principal</div>
        <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
        <NavItem view="LIBRARY" icon={FolderOpen} label="Biblioteca" />
        <NavItem view="AUDIT" icon={ClipboardCheck} label="Decisões Humanas" />
        
        {/* Visual spacers */}
        <div className="my-6 border-b border-gray-100/50 w-full mx-auto" />
        
        <div className="px-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Sistema</div>
        <button className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-medium text-secondary hover:text-dark hover:bg-gray-50 transition-colors">
            <Settings className="w-5 h-5 text-gray-400" />
            Configurações
        </button>
        <button className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-medium text-secondary hover:text-dark hover:bg-gray-50 transition-colors">
            <HelpCircle className="w-5 h-5 text-gray-400" />
            Central de Ajuda
        </button>
      </div>

      <div className="mt-auto pt-6 border-t border-gray-50">
        <button className="flex items-center gap-3 text-secondary hover:text-red-500 transition-colors text-sm font-medium px-2 group">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                 <LogOut className="w-4 h-4" />
            </div>
            Encerrar Sessão
        </button>
      </div>
    </div>
  );
};