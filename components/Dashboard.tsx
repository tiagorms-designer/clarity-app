import React, { useRef, useState } from 'react';
import { 
  AlertOctagon, 
  CheckCircle2, 
  FileText, 
  Search, 
  Bell, 
  MoreHorizontal,
  Calendar,
  BarChart3,
  ArrowUp,
  Upload,
  ShieldCheck,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { Document, RiskLevel, DocStatus } from '../types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  documents: Document[];
  onSelectDocument: (doc: Document) => void;
  onFileSelect: (file: File) => void;
}

type ChartPeriod = 'WEEK' | 'MONTH' | 'YEAR';

export const Dashboard: React.FC<DashboardProps> = ({ documents, onSelectDocument, onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('MONTH');
  const [isChartMenuOpen, setIsChartMenuOpen] = useState(false);
  
  // New Logic for KPIs
  const totalDocs = documents.length;
  const actionRequiredDocs = documents.filter(d => d.status === DocStatus.RISK_WARNING);
  const compliantDocs = documents.filter(d => d.status === DocStatus.COMPLIANT);
  const approvedDocs = documents.filter(d => d.status === DocStatus.APPROVED);
  
  // Sort for recent list
  const sortedDocs = [...documents]
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

  // Mock Data Generators based on Period
  const getChartData = () => {
      switch (chartPeriod) {
          case 'WEEK':
              return [
                  { name: 'Seg', count: 4 },
                  { name: 'Ter', count: 7 },
                  { name: 'Qua', count: 5 },
                  { name: 'Qui', count: 11 },
                  { name: 'Sex', count: 9 },
                  { name: 'Sáb', count: 2 },
                  { name: 'Dom', count: 0 },
              ];
          case 'YEAR':
              return [
                  { name: '2019', count: 120 },
                  { name: '2020', count: 350 },
                  { name: '2021', count: 410 },
                  { name: '2022', count: 580 },
                  { name: '2023', count: totalDocs + 80, active: true },
              ];
          case 'MONTH':
          default:
              return [
                  { name: 'Jan', count: 12 },
                  { name: 'Fev', count: 19 },
                  { name: 'Mar', count: 15 },
                  { name: 'Abr', count: 22 },
                  { name: 'Mai', count: 28 },
                  { name: 'Jun', count: totalDocs + 5, active: true },
                  { name: 'Jul', count: 0 },
              ];
      }
  };

  const chartData = getChartData();

  const handleQuickUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        onFileSelect(e.target.files[0]);
        // Reset input value to allow selecting the same file again if needed
        e.target.value = '';
    }
  };

  const StatCard = ({ label, value, icon: Icon, colorClass, subText }: any) => (
    <div className="bg-white rounded-3xl p-5 shadow-soft flex items-center gap-4 transition-transform hover:scale-[1.02]">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-secondary text-sm font-medium">{label}</p>
        <div className="flex items-baseline gap-2">
            <h3 className="text-dark text-2xl font-bold">{value}</h3>
            {subText && <span className="text-xs font-medium text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">{subText}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 w-full min-h-full flex flex-col gap-8">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".txt,.md,.json,.csv,.log,.pdf,.docx,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
      />
      
      {/* HEADER: Search & Profile */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-secondary text-sm font-medium">Pages / Dashboard</h2>
            <h1 className="text-dark text-3xl font-bold tracking-tight">Visão Geral</h1>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-full shadow-soft">
            <div className="flex items-center bg-background rounded-full px-4 py-2.5 w-64">
                <Search className="w-4 h-4 text-dark mr-2" />
                <input 
                    type="text" 
                    placeholder="Buscar documentos..." 
                    className="bg-transparent border-none outline-none text-sm text-dark placeholder-secondary w-full"
                />
            </div>
            <button className="p-2 text-secondary hover:text-primary transition-colors">
                <Bell className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-md">
                DS
            </div>
        </div>
      </header>

      {/* KPI CARDS - UPDATED REFERENCES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            label="Total Analisado" 
            value={totalDocs} 
            icon={BarChart3} 
            colorClass="bg-indigo-50 text-primary"
            subText="+12%"
        />
        <StatCard 
            label="Atenção Requerida" 
            value={actionRequiredDocs.length} 
            icon={AlertOctagon} 
            colorClass="bg-red-50 text-risk-high" 
        />
        <StatCard 
            label="Em Conformidade" 
            value={compliantDocs.length} 
            icon={ShieldCheck} 
            colorClass="bg-blue-50 text-blue-500" 
        />
        <StatCard 
            label="Aprovados" 
            value={approvedDocs.length} 
            icon={CheckCircle2} 
            colorClass="bg-emerald-50 text-risk-low"
            subText="Finalizados"
        />
      </div>

      {/* MIDDLE SECTION: Chart + Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-soft flex flex-col relative z-20">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-secondary" />
                        <span className="text-secondary text-sm font-medium">
                            {chartPeriod === 'WEEK' ? 'Esta semana' : chartPeriod === 'MONTH' ? 'Este mês' : 'Este ano'}
                        </span>
                    </div>
                    <h3 className="text-dark text-2xl font-bold">Volume de Análise</h3>
                </div>
                
                <div className="relative">
                    <button 
                        onClick={() => setIsChartMenuOpen(!isChartMenuOpen)}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isChartMenuOpen ? 'bg-indigo-50 text-primary' : 'bg-background text-secondary hover:text-primary'}`}
                    >
                        <BarChart3 className="w-5 h-5" />
                        {isChartMenuOpen && <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isChartMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 z-50">
                            <button 
                                onClick={() => { setChartPeriod('WEEK'); setIsChartMenuOpen(false); }}
                                className={`text-xs font-bold text-left px-3 py-2 rounded-lg transition-colors ${chartPeriod === 'WEEK' ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-50'}`}
                            >
                                Semanal
                            </button>
                            <button 
                                onClick={() => { setChartPeriod('MONTH'); setIsChartMenuOpen(false); }}
                                className={`text-xs font-bold text-left px-3 py-2 rounded-lg transition-colors ${chartPeriod === 'MONTH' ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-50'}`}
                            >
                                Mensal
                            </button>
                            <button 
                                onClick={() => { setChartPeriod('YEAR'); setIsChartMenuOpen(false); }}
                                className={`text-xs font-bold text-left px-3 py-2 rounded-lg transition-colors ${chartPeriod === 'YEAR' ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-50'}`}
                            >
                                Anual
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={40}>
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#A3AED0', fontSize: 12}} 
                            dy={10}
                        />
                        <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                        />
                        <Bar dataKey="count" radius={[10, 10, 10, 10]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={(entry as any).active ? '#6f52ed' : '#E9EDF7'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Promo / Action Card - UPDATED FOR QUICK UPLOAD CONTEXT */}
        <div className="bg-primary rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-center shadow-soft">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full translate-x-10 -translate-y-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-x-10 translate-y-10"></div>
            
            <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                    <Upload className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Análise Rápida</h3>
                <p className="text-indigo-100 text-sm mb-8 leading-relaxed">
                    Carregue um documento agora mesmo para identificar riscos e conformidade em segundos.
                </p>
                <button 
                    onClick={handleQuickUploadClick}
                    className="bg-white text-primary font-bold py-3 px-6 rounded-xl w-full hover:bg-indigo-50 transition-colors"
                >
                    Carregar Documento
                </button>
            </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Document List */}
      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-dark text-xl font-bold">Documentos Recentes</h3>
            <button className="w-8 h-8 flex items-center justify-center bg-background rounded-lg text-primary hover:bg-indigo-50">
                <MoreHorizontal className="w-5 h-5" />
            </button>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="text-left text-secondary text-sm border-b border-gray-100">
                        <th className="pb-4 pl-4 font-medium">Nome</th>
                        <th className="pb-4 font-medium">Status Operacional</th>
                        <th className="pb-4 font-medium">Data</th>
                        <th className="pb-4 font-medium text-right pr-4">Risco</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {sortedDocs.slice(0, 5).map(doc => (
                        <tr key={doc.id} onClick={() => onSelectDocument(doc)} className="group hover:bg-gray-50/50 transition-colors cursor-pointer border-b border-gray-50 last:border-none">
                            <td className="py-4 pl-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-primary group-hover:bg-white group-hover:shadow-sm transition-all">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-dark">{doc.title}</p>
                                        <p className="text-secondary text-xs">{doc.sender}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="py-4">
                                <div className="flex items-center gap-2">
                                    {doc.status === DocStatus.APPROVED ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            <span className="font-bold text-xs">Aprovado</span>
                                        </div>
                                    ) : doc.status === DocStatus.COMPLIANT ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                            <span className="font-bold text-xs">Conforme</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                                            <span className="font-bold text-xs">Atenção</span>
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="py-4 font-medium text-secondary">
                                {new Date(doc.receivedAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-4 pr-4 text-right">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold items-center gap-1 ${
                                    doc.overallRisk === RiskLevel.HIGH ? 'bg-red-50 text-risk-high' :
                                    doc.overallRisk === RiskLevel.MEDIUM ? 'bg-orange-50 text-risk-medium' :
                                    'bg-emerald-50 text-risk-low'
                                }`}>
                                    {doc.overallRisk === RiskLevel.HIGH && <AlertOctagon className="w-3 h-3" />}
                                    {doc.overallRisk === RiskLevel.MEDIUM && <AlertTriangle className="w-3 h-3" />}
                                    {doc.overallRisk === RiskLevel.LOW && <ShieldCheck className="w-3 h-3" />}
                                    {doc.overallRisk === 'HIGH' ? 'ALTO' : doc.overallRisk === 'MEDIUM' ? 'MÉDIO' : 'BAIXO'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};