import React, { useState } from 'react';
import { Search, Filter, FileText, ChevronRight, AlertOctagon, CheckCircle2, Clock, ShieldCheck, AlertTriangle, Calendar } from 'lucide-react';
import { Document, RiskLevel, DocStatus } from '../types';

interface DocumentLibraryProps {
  documents: Document[];
  onSelectDocument: (doc: Document) => void;
}

type DateFilterType = 'ALL' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_YEAR';

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ documents, onSelectDocument }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'ALL'>('ALL');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (doc.sender && doc.sender.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    const matchesRisk = riskFilter === 'ALL' || doc.overallRisk === riskFilter;
    
    // Date Filtering Logic
    let matchesDate = true;
    const docDate = new Date(doc.receivedAt);
    const now = new Date();
    
    if (dateFilter === 'LAST_7_DAYS') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        matchesDate = docDate >= sevenDaysAgo;
    } else if (dateFilter === 'LAST_30_DAYS') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        matchesDate = docDate >= thirtyDaysAgo;
    } else if (dateFilter === 'THIS_YEAR') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        matchesDate = docDate >= startOfYear;
    }

    return matchesSearch && matchesStatus && matchesRisk && matchesDate;
  });

  // Sort by date descending
  const sortedDocs = filteredDocs.sort((a, b) => 
    new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );

  return (
    <div className="p-6 md:p-8 w-full h-full overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
        <div>
            <h2 className="text-secondary text-sm font-medium">Pages / Arquivos</h2>
            <h1 className="text-dark text-3xl font-bold tracking-tight">Biblioteca de Documentos</h1>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl text-sm font-bold text-secondary shadow-sm border border-gray-100">
            {sortedDocs.length} {sortedDocs.length === 1 ? 'documento encontrado' : 'documentos encontrados'}
        </div>
      </header>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-soft mb-6 shrink-0 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-100 rounded-xl leading-5 bg-background text-dark placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm"
                placeholder="Buscar por nome, fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {/* Period Filter */}
            <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-gray-100 shrink-0">
                <Calendar className="w-4 h-4 text-secondary" />
                <span className="text-xs font-bold text-secondary uppercase mr-1">Período:</span>
                <select 
                    className="bg-transparent text-sm font-medium text-dark focus:outline-none cursor-pointer"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                >
                    <option value="ALL">Todo Período</option>
                    <option value="LAST_7_DAYS">Últimos 7 dias</option>
                    <option value="LAST_30_DAYS">Últimos 30 dias</option>
                    <option value="THIS_YEAR">Este Ano</option>
                </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-gray-100 shrink-0">
                <Filter className="w-4 h-4 text-secondary" />
                <span className="text-xs font-bold text-secondary uppercase mr-1">Status:</span>
                <select 
                    className="bg-transparent text-sm font-medium text-dark focus:outline-none cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                    <option value="ALL">Todos</option>
                    <option value={DocStatus.RISK_WARNING}>Atenção Requerida</option>
                    <option value={DocStatus.COMPLIANT}>Conforme</option>
                    <option value={DocStatus.APPROVED}>Aprovado</option>
                </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-gray-100 shrink-0">
                <AlertOctagon className="w-4 h-4 text-secondary" />
                <span className="text-xs font-bold text-secondary uppercase mr-1">Risco:</span>
                <select 
                    className="bg-transparent text-sm font-medium text-dark focus:outline-none cursor-pointer"
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value as any)}
                >
                    <option value="ALL">Todos</option>
                    <option value={RiskLevel.HIGH}>Alto</option>
                    <option value={RiskLevel.MEDIUM}>Médio</option>
                    <option value={RiskLevel.LOW}>Baixo</option>
                </select>
            </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl shadow-soft flex-1 overflow-hidden border border-gray-100/50 flex flex-col">
        <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full">
                <thead className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm">
                    <tr className="text-left">
                        <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Documento</th>
                        <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Recebido em</th>
                        <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Nível de Risco</th>
                        <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {sortedDocs.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-secondary">
                                <div className="flex flex-col items-center">
                                    <FileText className="w-12 h-12 text-gray-200 mb-3" />
                                    <p className="text-sm font-medium">Nenhum documento encontrado com os filtros atuais.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        sortedDocs.map((doc) => (
                            <tr 
                                key={doc.id} 
                                onClick={() => onSelectDocument(doc)}
                                className="group hover:bg-indigo-50/30 transition-colors cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-dark text-sm mb-0.5 truncate max-w-[200px] md:max-w-xs">{doc.title}</p>
                                            <p className="text-xs text-secondary">{doc.sender || 'Desconhecido'}</p>
                                        </div>
                                    </div>
                                </td>
                                
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-secondary font-medium">
                                        <Clock className="w-4 h-4 opacity-70" />
                                        {new Date(doc.receivedAt).toLocaleDateString('pt-BR')}
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    {/* STATUS BADGE - UPDATED (NO ICONS) */}
                                    {doc.status === DocStatus.APPROVED ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 w-fit">
                                            <span className="font-bold text-xs">Aprovado</span>
                                        </div>
                                    ) : doc.status === DocStatus.COMPLIANT ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 w-fit">
                                            <span className="font-bold text-xs">Conforme</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100 w-fit">
                                            <span className="font-bold text-xs">Atenção</span>
                                        </div>
                                    )}
                                </td>

                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold items-center gap-1.5 ${
                                        doc.overallRisk === RiskLevel.HIGH ? 'bg-red-50 text-risk-high border border-red-100' :
                                        doc.overallRisk === RiskLevel.MEDIUM ? 'bg-orange-50 text-risk-medium border border-orange-100' :
                                        'bg-emerald-50 text-risk-low border border-emerald-100'
                                    }`}>
                                        {doc.overallRisk === RiskLevel.HIGH && <AlertOctagon className="w-3.5 h-3.5" />}
                                        {doc.overallRisk === RiskLevel.MEDIUM && <AlertTriangle className="w-3.5 h-3.5" />}
                                        {doc.overallRisk === RiskLevel.LOW && <ShieldCheck className="w-3.5 h-3.5" />}
                                        {doc.overallRisk === 'HIGH' ? 'ALTO' : doc.overallRisk === 'MEDIUM' ? 'MÉDIO' : 'BAIXO'}
                                    </span>
                                </td>

                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 rounded-full text-gray-400 hover:text-primary hover:bg-indigo-50 transition-all">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Footer / Pagination Placeholder */}
        <div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-between items-center text-xs text-secondary font-medium">
            <span>Mostrando {sortedDocs.length} de {documents.length} registros</span>
            <div className="flex gap-2 opacity-50 cursor-not-allowed">
                <span>Anterior</span>
                <span>•</span>
                <span>Próximo</span>
            </div>
        </div>
      </div>
    </div>
  );
};