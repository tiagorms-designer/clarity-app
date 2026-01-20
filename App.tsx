import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DocumentUpload } from './components/DocumentUpload';
import { DocumentViewer } from './components/DocumentViewer';
import { DocumentLibrary } from './components/DocumentLibrary';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Document, ViewState, RiskLevel, RemediationPlan, DocStatus } from './types';
import { MOCK_DOCUMENTS } from './constants';
import { ShieldCheck, Flag, CheckCircle2, FileText, AlertOctagon, ClipboardCheck, X, User, Calendar, FileType } from 'lucide-react';

// BUMP TO V2 to force reload of corrected mock data
const LOCAL_STORAGE_KEY = 'clarity-app-documents-v2';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  
  // Initialize state from localStorage if available, otherwise use mocks
  const [documents, setDocuments] = useState<Document[]>(() => {
    try {
      const savedDocs = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedDocs) {
        return JSON.parse(savedDocs);
      }
    } catch (error) {
      console.error('Failed to load documents from local storage:', error);
    }
    return MOCK_DOCUMENTS;
  });

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // Audit Modal State
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);

  // Save to localStorage whenever documents change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(documents));
    } catch (error) {
      console.error('Failed to save documents to local storage:', error);
    }
  }, [documents]);

  const activeDoc = documents.find(d => d.id === selectedDocId);

  const handleUpdateDocument = (updatedDoc: Document) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  const handleSelectDocument = (doc: Document) => {
    // WORKFLOW LOGIC:
    // If opening an "Inbox" document, move it to "In Analysis"
    if (doc.status === DocStatus.INBOX) {
        const updatedDoc = { ...doc, status: DocStatus.IN_ANALYSIS };
        handleUpdateDocument(updatedDoc);
    }
    
    setSelectedDocId(doc.id);
    setView('VIEWER');
  };

  const handleUploadComplete = (newDoc: Document) => {
    setDocuments(prev => [newDoc, ...prev]);
    setSelectedDocId(newDoc.id);
    setPendingFile(null);
    setView('VIEWER');
  };

  const handleQuickUpload = (file: File) => {
    setPendingFile(file);
    setView('UPLOAD');
  };

  const handleChangeView = (newView: ViewState) => {
    setView(newView);
    setSelectedDocId(null);
    setPendingFile(null);
  };

  // Helper to collect all decisions
  const getAllDecisions = () => {
    return documents.flatMap(d => d.history.map(h => {
        // Find associated plan details if available (crude match, ideally link by ID)
        const planDetails = d.highlights.find(high => high.remediation && h.action === 'PLAN_CREATED' && h.note?.includes(high.remediation.actionType))?.remediation;
        
        return {
            ...h,
            docTitle: d.title,
            docRisk: d.overallRisk,
            planDetails: planDetails,
            highlights: d.highlights // Pass highlights to context
        };
    })).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // Detail Modal Component
  const DecisionDetailModal = () => {
      if (!selectedDecision) return null;

      const plan: RemediationPlan | undefined = selectedDecision.planDetails;
      const isPlan = selectedDecision.action === 'PLAN_CREATED';
      const isValidation = selectedDecision.action === 'VALIDATE';

      // Filter relevant risks (High/Medium) for the checklist
      const relevantRisks = selectedDecision.highlights 
        ? selectedDecision.highlights.filter((h: any) => h.riskLevel === RiskLevel.HIGH || h.riskLevel === RiskLevel.MEDIUM)
        : [];

      return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-dark text-lg">Detalhes da Decisão</h3>
                      <button onClick={() => setSelectedDecision(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                          <X className="w-5 h-5 text-gray-500" />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      {/* Context */}
                      <div className="mb-6">
                          <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Documento</h4>
                          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <FileText className="w-5 h-5 text-primary" />
                              <span className="text-sm font-bold text-dark truncate">{selectedDecision.docTitle}</span>
                          </div>
                      </div>

                      {/* Action Type */}
                      <div className="mb-6">
                          <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Ação Realizada</h4>
                          <div className="flex items-center gap-2">
                             <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${
                                selectedDecision.action === 'VALIDATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                selectedDecision.action === 'FLAG' ? 'bg-red-50 text-red-700 border-red-100' :
                                'bg-indigo-50 text-indigo-700 border-indigo-100'
                            }`}>
                                {selectedDecision.action === 'VALIDATE' ? <ShieldCheck className="w-4 h-4" /> : 
                                 selectedDecision.action === 'FLAG' ? <Flag className="w-4 h-4" /> : 
                                 <CheckCircle2 className="w-4 h-4" />}
                                {selectedDecision.action === 'VALIDATE' ? 'Documento Validado' : 
                                 selectedDecision.action === 'FLAG' ? 'Risco Sinalizado' : 'Plano de Ação Criado'}
                            </span>
                          </div>
                      </div>

                      {/* VALIDATION CHECKLIST (New Feature) */}
                      {isValidation && relevantRisks.length > 0 && (
                          <div className="mb-6">
                              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                                  Riscos Verificados
                                  <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded text-[9px]">{relevantRisks.length}</span>
                              </h4>
                              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                  {relevantRisks.map((h: any) => (
                                      <div key={h.id} className="p-3 border-b border-gray-100 last:border-0 flex items-start gap-3 bg-gray-50/30">
                                          <div className="mt-0.5 text-emerald-500 bg-emerald-50 rounded-full p-0.5 shrink-0">
                                              <CheckCircle2 className="w-3.5 h-3.5" />
                                          </div>
                                          <div>
                                              <div className="flex items-center gap-2 mb-0.5">
                                                  <span className="text-xs font-bold text-dark">{h.category || 'Risco Operacional'}</span>
                                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                                                      h.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                  }`}>
                                                      {h.riskLevel === 'HIGH' ? 'Alto' : 'Médio'}
                                                  </span>
                                              </div>
                                              <p className="text-xs text-secondary leading-snug">{h.explanation}</p>
                                              {h.remediation && (
                                                <p className="text-[10px] text-emerald-600 mt-1.5 font-bold flex items-center gap-1">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    Plano: {h.remediation.actionType}
                                                </p>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                      
                      {/* Plan Details (If available) */}
                      {isPlan && plan ? (
                          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
                              <h4 className="text-xs font-bold text-dark mb-4 border-b border-gray-100 pb-2">Plano de Remediação</h4>
                              
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                      <span className="text-[10px] text-secondary font-bold uppercase block mb-1">Responsável</span>
                                      <div className="flex items-center gap-2 text-sm font-medium text-dark">
                                          <User className="w-3.5 h-3.5 text-gray-400" />
                                          {plan.assignee}
                                      </div>
                                  </div>
                                  <div>
                                      <span className="text-[10px] text-secondary font-bold uppercase block mb-1">Prazo</span>
                                      <div className="flex items-center gap-2 text-sm font-medium text-dark">
                                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                          {plan.deadline ? new Date(plan.deadline).toLocaleDateString('pt-BR') : 'N/A'}
                                      </div>
                                  </div>
                              </div>
                              
                              <div>
                                  <span className="text-[10px] text-secondary font-bold uppercase block mb-1">Instruções Técnicas</span>
                                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                      {plan.instructions}
                                  </p>
                              </div>
                          </div>
                      ) : (
                          <div className="mb-6">
                              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Nota / Justificativa</h4>
                              <p className="text-sm text-dark bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed italic">
                                  "{selectedDecision.note || 'Sem notas adicionais.'}"
                              </p>
                          </div>
                      )}

                      {/* Meta */}
                      <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-4">
                          <span>Registrado por: <strong>{selectedDecision.user}</strong></span>
                          <span>{new Date(selectedDecision.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen w-full bg-background font-sans text-dark overflow-hidden">
      <ApiKeyModal />
      <DecisionDetailModal />
      
      {/* Sidebar */}
      <div className={`shrink-0 transition-all duration-300 ${view === 'VIEWER' ? 'hidden md:block w-20 md:w-72' : 'w-72 hidden md:block'}`}>
        <Sidebar currentView={view} onChangeView={handleChangeView} />
      </div>

      <main className="flex-1 h-full overflow-hidden relative flex flex-col">
        {view === 'DASHBOARD' && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <Dashboard 
              documents={documents} 
              onSelectDocument={handleSelectDocument} 
              onFileSelect={handleQuickUpload}
            />
          </div>
        )}

        {view === 'LIBRARY' && (
          <DocumentLibrary 
            documents={documents}
            onSelectDocument={handleSelectDocument}
          />
        )}

        {view === 'UPLOAD' && (
           <div className="h-full overflow-y-auto flex flex-col">
              <header className="px-6 md:px-8 pt-8 pb-0">
                  <h2 className="text-secondary text-sm font-medium">Pages / Upload</h2>
                  <h1 className="text-dark text-3xl font-bold tracking-tight">Novo Documento</h1>
              </header>
              <div className="flex-1 px-6 md:px-8 py-8">
                  <div className="bg-white rounded-3xl p-8 shadow-soft h-full">
                     <DocumentUpload 
                        onUploadComplete={handleUploadComplete} 
                        initialFile={pendingFile}
                     />
                  </div>
              </div>
           </div>
        )}

        {view === 'VIEWER' && activeDoc && (
          <div className="h-full p-6 md:p-8 overflow-hidden flex flex-col">
             <div className="flex-1 bg-white rounded-3xl shadow-soft overflow-hidden border border-gray-100/50">
                <DocumentViewer 
                    document={activeDoc} 
                    onBack={() => { setView('LIBRARY'); setSelectedDocId(null); }}
                    onUpdateDocument={handleUpdateDocument}
                />
             </div>
          </div>
        )}
        
        {view === 'AUDIT' && (
            <div className="p-6 md:p-8 w-full h-full overflow-y-auto custom-scrollbar">
                <header className="mb-8 flex justify-between items-end">
                    <div>
                        <h2 className="text-secondary text-sm font-medium">Pages / Decisões</h2>
                        <h1 className="text-dark text-3xl font-bold tracking-tight">Central de Decisões Humanas</h1>
                    </div>
                    <div className="hidden md:block">
                        <span className="bg-white px-4 py-2 rounded-xl text-sm font-bold text-secondary shadow-sm border border-gray-100">
                            Total: {getAllDecisions().length} decisões
                        </span>
                    </div>
                </header>
                
                <div className="bg-white border-none rounded-3xl overflow-hidden shadow-soft">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-wider">Documento & Contexto</th>
                                    <th className="px-6 py-5 text-xs font-bold text-secondary uppercase tracking-wider">Ação Definida</th>
                                    <th className="px-6 py-5 text-xs font-bold text-secondary uppercase tracking-wider text-right">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {getAllDecisions().map(log => (
                                    <tr 
                                        key={log.id} 
                                        className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                                        onClick={() => setSelectedDecision(log)}
                                    >
                                        {/* Document Context */}
                                        <td className="px-8 py-6 align-top">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-lg bg-gray-50 text-secondary group-hover:bg-white group-hover:text-primary transition-colors">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-dark text-sm mb-1">{log.docTitle}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                            log.docRisk === RiskLevel.HIGH ? 'bg-red-50 text-red-600 border-red-100' :
                                                            log.docRisk === RiskLevel.MEDIUM ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        }`}>
                                                            {log.docRisk === RiskLevel.HIGH && <AlertOctagon className="w-3 h-3" />}
                                                            Risco {log.docRisk === 'HIGH' ? 'Alto' : log.docRisk === 'MEDIUM' ? 'Médio' : 'Baixo'}
                                                        </span>
                                                        <span className="text-[10px] text-secondary">
                                                            {new Date(log.timestamp).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Action Taken */}
                                        <td className="px-6 py-6 align-top">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold w-fit border ${
                                                    log.action === 'VALIDATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    log.action === 'FLAG' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                }`}>
                                                    {log.action === 'VALIDATE' ? <ShieldCheck className="w-3.5 h-3.5" /> : 
                                                    log.action === 'FLAG' ? <Flag className="w-3.5 h-3.5" /> : 
                                                    <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    
                                                    {log.action === 'VALIDATE' ? 'Validado' : 
                                                    log.action === 'FLAG' ? 'Sinalizado' : 'Plano de Ação'}
                                                </span>
                                                <span className="text-xs text-secondary pl-1">
                                                    Por {log.user}
                                                </span>
                                            </div>
                                        </td>

                                        {/* View Details Button */}
                                        <td className="px-6 py-6 align-middle text-right">
                                            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-dark hover:bg-gray-50 hover:border-primary/50 transition-all shadow-sm">
                                                Ver Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                
                                {getAllDecisions().length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <ClipboardCheck className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <h3 className="text-dark font-bold text-lg">Nenhuma decisão registrada</h3>
                                                <p className="text-secondary text-sm mt-2 max-w-md">
                                                    As ações de validação e sinalização de riscos nos documentos aparecerão aqui.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;