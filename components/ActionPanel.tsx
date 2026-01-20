import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Calendar, User, FileText, CheckCircle2, Save, X, ArrowRight, ClipboardList, Clock, ArrowLeft, ChevronRight, Edit3, Loader2, Bot, Circle, AlertOctagon, ListTodo, ChevronDown } from 'lucide-react';
import { Document, Highlight, RiskLevel, RemediationPlan, DocStatus } from '../types';
import { getRemediationSuggestion } from '../services/geminiService';

interface ActionPanelProps {
  document: Document;
  selectedHighlight: Highlight | null;
  onSaveRemediation: (highlightId: string, plan: RemediationPlan) => void;
  onGlobalAction: (action: 'VALIDATE' | 'FLAG', note: string) => void;
  onClose?: () => void;
  onToggleMinimize?: () => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({ 
  document, 
  selectedHighlight, 
  onSaveRemediation,
  onGlobalAction,
  onClose,
  onToggleMinimize
}) => {
  // Form State
  const [actionType, setActionType] = useState<RemediationPlan['actionType']>('REVISION');
  const [priority, setPriority] = useState<RemediationPlan['priority']>('HIGH');
  const [assignee, setAssignee] = useState('');
  const [deadline, setDeadline] = useState('');
  const [instructions, setInstructions] = useState('');
  
  // UI State
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Helper to determine smart defaults based on risk context
  const applySmartDefaults = (highlight: Highlight) => {
    // 1. Suggest Priority based on Risk Level
    let suggestedPriority: RemediationPlan['priority'] = 'MEDIUM';
    if (highlight.riskLevel === 'HIGH') suggestedPriority = 'HIGH';
    if (highlight.riskLevel === 'LOW') suggestedPriority = 'LOW';
    setPriority(suggestedPriority);

    // 2. Suggest Action Type based on Category keywords
    const cat = highlight.category.toLowerCase();
    let suggestedAction: RemediationPlan['actionType'] = 'REVISION'; // Default
    if (cat.includes('manutenção') || cat.includes('físico') || cat.includes('operacional') || cat.includes('segurança')) {
        suggestedAction = 'MAINTENANCE';
    } else if (cat.includes('treinamento') || cat.includes('rh') || cat.includes('equipe')) {
        suggestedAction = 'TRAINING';
    } else if (cat.includes('risco') || cat.includes('financeiro') || cat.includes('negócio')) {
        suggestedAction = 'ACCEPT_RISK';
    }
    setActionType(suggestedAction);

    // 3. Suggest Deadline
    const today = new Date();
    // Removed unreachable 'CRITICAL' check as suggestedPriority logic above only produces HIGH, MEDIUM, or LOW
    const daysToAdd = suggestedPriority === 'HIGH' ? 5 : suggestedPriority === 'MEDIUM' ? 10 : 30;
    today.setDate(today.getDate() + daysToAdd);
    setDeadline(today.toISOString().split('T')[0]);
  };

  // Reset form when selection changes
  useEffect(() => {
    setShowSuccess(false);
    setIsEditing(false); // Default to viewing mode if exists
    setCurrentStep(1); 
    
    if (selectedHighlight?.remediation) {
        const plan = selectedHighlight.remediation;
        setActionType(plan.actionType);
        setPriority(plan.priority);
        setAssignee(plan.assignee);
        setDeadline(plan.deadline || '');
        setInstructions(plan.instructions);
    } else if (selectedHighlight) {
        // Apply Smart Defaults for new actions
        setAssignee('');
        setInstructions('');
        applySmartDefaults(selectedHighlight);
    }
  }, [selectedHighlight]);

  const handleNextStep = () => {
      if (currentStep < 3) setCurrentStep(c => c + 1);
  };

  const handlePrevStep = () => {
      if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  const handleGenerateAISuggestion = async () => {
      if (!selectedHighlight) return;
      setIsGeneratingAI(true);
      try {
          const suggestion = await getRemediationSuggestion(
              selectedHighlight.textSnippet,
              selectedHighlight.explanation,
              selectedHighlight.category
          );
          setInstructions(prev => prev ? prev + "\n\n" + suggestion : suggestion);
      } catch (error) {
          console.error("Error generating suggestion", error);
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleSaveRemediation = () => {
    if (!selectedHighlight) return;
    setIsSubmitting(true);
    
    const plan: RemediationPlan = {
        actionType,
        priority,
        assignee: assignee || 'Não atribuído',
        deadline,
        instructions,
        status: 'PENDING'
    };

    setTimeout(() => {
        onSaveRemediation(selectedHighlight.id, plan);
        setIsSubmitting(false);
        setShowSuccess(true);
        setIsEditing(false); // Lock it after saving
    }, 600);
  };

  const getLabelForAction = (type: string) => {
      const map: Record<string, string> = {
          'REVISION': 'Revisão Jurídica',
          'MAINTENANCE': 'Manutenção',
          'TRAINING': 'Treinamento',
          'ACCEPT_RISK': 'Aceite de Risco'
      };
      return map[type] || type;
  };

  const getPriorityLabel = (p: string) => {
      const map: Record<string, string> = { 'CRITICAL': 'Crítica', 'HIGH': 'Alta', 'MEDIUM': 'Média', 'LOW': 'Baixa' };
      return map[p] || p;
  };

  // --- STATE 1: ACTION PLAN / CHECKLIST (When nothing selected) ---
  if (!selectedHighlight) {
    // NEW: Check if document is already finalized (Approved)
    if (document.status === DocStatus.APPROVED) {
        return (
            <div className="flex flex-col h-full bg-white items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-soft border border-emerald-100">
                    <ShieldCheck className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-dark mb-2">Documento Finalizado</h3>
                <p className="text-sm text-secondary mb-8 max-w-[280px] leading-relaxed">
                    Parabéns! Todas as pendências foram tratadas e o documento encontra-se <span className="text-emerald-600 font-bold">Aprovado</span>.
                </p>
                
                <div className="w-full bg-gray-50 rounded-2xl p-5 border border-gray-100 text-left">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200 text-primary font-bold shadow-sm">
                             <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary uppercase tracking-wider">Validado por</p>
                            <p className="text-sm font-bold text-dark">Você</p>
                        </div>
                     </div>
                     <div className="h-px bg-gray-200 w-full mb-4"></div>
                     <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                        <CheckCircle2 className="w-4 h-4" />
                        Conformidade Verificada
                     </div>
                </div>
            </div>
        );
    }

    const risks = document.highlights.filter(h => h.riskLevel !== 'LOW' && h.riskLevel !== 'NEUTRAL');
    const resolvedCount = risks.filter(h => !!h.remediation).length;
    const progress = risks.length > 0 ? (resolvedCount / risks.length) * 100 : 100;

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold text-dark flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-primary" />
                        Checklist de Pendências
                    </h3>
                    <p className="text-[10px] text-secondary mt-1 font-medium">
                        Resumo das ações definidas para o documento.
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-dark">{resolvedCount}/{risks.length}</span>
                    <span className="text-[9px] text-secondary uppercase">Concluídos</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-gray-50">
                <div 
                    className="h-full bg-emerald-500 transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%` }}
                />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {risks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
                        <p className="text-sm font-bold text-dark">Tudo Limpo!</p>
                        <p className="text-xs text-secondary mt-1 max-w-[200px]">
                            Não foram detectados riscos críticos ou altos neste documento.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {risks.map((risk) => {
                            const isResolved = !!risk.remediation;
                            return (
                                <div key={risk.id} className="p-4 flex gap-3 hover:bg-gray-50 transition-colors group cursor-default items-center">
                                    <div className="shrink-0">
                                        {isResolved ? (
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-dashed flex items-center justify-center text-gray-300">
                                                <Circle className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {isResolved ? (
                                             // VIEW FOR RESOLVED ITEMS (Show Solution)
                                             <>
                                                <p className="text-xs font-bold text-dark truncate">
                                                    {getLabelForAction(risk.remediation!.actionType)}
                                                </p>
                                                <p className="text-[10px] text-secondary flex items-center gap-1 mt-0.5 truncate">
                                                    <User className="w-3 h-3" />
                                                    {risk.remediation!.assignee}
                                                </p>
                                             </>
                                        ) : (
                                            // VIEW FOR PENDING ITEMS (Show Task)
                                            <>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-xs font-bold text-secondary uppercase tracking-wider truncate">
                                                        {risk.category || 'Geral'}
                                                    </p>
                                                    <span className={`w-2 h-2 rounded-full ${risk.riskLevel === 'HIGH' ? 'bg-red-400' : 'bg-orange-400'}`}></span>
                                                </div>
                                                <p className="text-[10px] text-dark font-medium">
                                                    Aguardando definição de plano
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    {!isResolved && (
                                        <div className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-1 rounded">
                                            PENDENTE
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                 <button 
                    onClick={() => onGlobalAction('VALIDATE', 'Documento validado após verificação do plano de ação.')}
                    disabled={resolvedCount < risks.length}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-md
                        ${resolvedCount < risks.length 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                            : 'bg-primary text-white hover:bg-indigo-600 hover:shadow-lg shadow-indigo-100'
                        }
                    `}
                >
                    <ShieldCheck className="w-4 h-4" />
                    Finalizar Documento
                </button>
                {resolvedCount < risks.length && (
                    <p className="text-[10px] text-center text-red-400 mt-2 font-medium">
                        Resolva todas as pendências para finalizar.
                    </p>
                )}
            </div>
        </div>
    );
  }

  // --- STATE 2: Success Message ---
  if (showSuccess) {
      return (
          <div className="flex flex-col h-full items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 bg-white">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-emerald-100">
                  <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-dark mb-2">Ação Registrada!</h3>
              <p className="text-xs text-secondary mb-8 max-w-[240px]">
                  O plano foi salvo com sucesso e o risco foi marcado como tratado.
              </p>
              <button 
                  onClick={() => {
                      setShowSuccess(false);
                      // Goes to View Mode because selectedHighlight still exists and isEditing is false
                  }}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-100"
              >
                  Visualizar Plano
                  <ArrowRight className="w-4 h-4" />
              </button>
          </div>
      );
  }

  // --- STATE 3: READ-ONLY VIEW (Existing Plan) ---
  if (selectedHighlight.remediation && !isEditing) {
      const plan = selectedHighlight.remediation;
      return (
          <div className="flex flex-col h-full bg-white animate-in slide-in-from-right-4 duration-300">
               <div className="p-5 border-b border-gray-100 bg-emerald-50/50">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Ação Definida
                        </h3>
                        <div className="flex items-center gap-1">
                             {onToggleMinimize && (
                                <button onClick={onToggleMinimize} className="p-1 text-emerald-700/60 hover:text-emerald-900 rounded-full hover:bg-emerald-100/50 transition-colors" title="Minimizar Painel">
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            )}
                            <button onClick={onClose} className="p-1 text-emerald-700/60 hover:text-emerald-900 rounded-full hover:bg-emerald-100/50 transition-colors" title="Fechar Seleção">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-emerald-600/70">
                        Este risco já possui um plano de mitigação registrado.
                    </p>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Summary Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8"></div>
                        
                        <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Tipo de Intervenção</h4>
                        <p className="text-dark font-bold text-lg mb-4 leading-tight">
                            {getLabelForAction(plan.actionType)}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <h4 className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Prioridade</h4>
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                                    plan.priority === 'CRITICAL' ? 'bg-red-50 text-red-600' : 
                                    plan.priority === 'HIGH' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                    {getPriorityLabel(plan.priority)}
                                </span>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Prazo</h4>
                                <div className="flex items-center gap-1.5 text-sm font-medium text-dark">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    {plan.deadline ? new Date(plan.deadline).toLocaleDateString('pt-BR') : 'Sem data'}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Responsável</h4>
                            <div className="flex items-center gap-2 text-sm font-medium text-dark">
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                    <User className="w-3.5 h-3.5" />
                                </div>
                                {plan.assignee}
                            </div>
                        </div>
                    </div>

                    {/* Instructions Block - IMPROVED FORMATTING */}
                    <div>
                        <h4 className="text-xs font-bold text-dark mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-secondary" />
                            Instruções / Justificativa
                        </h4>
                        <div className="bg-gray-50 rounded-xl p-4 text-sm text-secondary leading-relaxed border border-gray-100 whitespace-pre-wrap font-medium">
                            {plan.instructions || <span className="italic opacity-50">Nenhuma instrução adicional registrada.</span>}
                        </div>
                    </div>
               </div>

               {/* Footer Actions */}
               <div className="p-4 border-t border-gray-100 bg-white flex gap-3">
                   <button 
                        onClick={() => setIsEditing(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-gray-200 text-dark text-sm font-bold hover:bg-gray-50 transition-colors"
                   >
                        <Edit3 className="w-4 h-4" />
                        Editar Plano
                   </button>
               </div>
          </div>
      );
  }

  // --- STATE 4: WIZARD FORM (Editing or New) ---
  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-bottom-4 duration-300">
      
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-dark flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {isEditing ? 'Editar Ação' : 'Definir Ação'}
            </h3>
            <div className="flex items-center gap-1">
                {onToggleMinimize && (
                    <button onClick={onToggleMinimize} className="p-1 text-gray-400 hover:text-dark rounded-full hover:bg-gray-200 transition-colors" title="Minimizar Painel">
                        <ChevronDown className="w-4 h-4" />
                    </button>
                )}
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-dark rounded-full hover:bg-gray-200 transition-colors" title="Fechar Seleção">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-2">
             {[1, 2, 3].map(step => (
                 <div key={step} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step <= currentStep ? 'bg-primary' : 'bg-gray-200'}`} />
             ))}
        </div>
        <div className="flex justify-between mt-1 text-[10px] font-bold text-secondary uppercase tracking-wider">
            <span>Definição</span>
            <span>Responsável</span>
            <span>Detalhes</span>
        </div>
      </div>

      {/* Steps Content */}
      <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        
        {/* STEP 1: Definition */}
        {currentStep === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 flex items-start gap-2 text-xs text-indigo-800">
                    <Bot className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Sugeri uma intervenção e prioridade com base na análise do risco. Você pode ajustar abaixo.</p>
                </div>

                <div>
                    <label className="text-xs font-bold text-dark mb-2 block">Qual a intervenção necessária?</label>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { id: 'REVISION', label: 'Revisão Jurídica Contratual' },
                            { id: 'MAINTENANCE', label: 'Manutenção / Reparo Físico' },
                            { id: 'TRAINING', label: 'Treinamento de Equipe' },
                            { id: 'ACCEPT_RISK', label: 'Aceite de Risco Operacional' }
                        ].map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setActionType(type.id as any)}
                                className={`text-xs py-3 px-4 rounded-xl border text-left font-bold transition-all flex justify-between items-center group ${
                                    actionType === type.id 
                                    ? 'bg-primary text-white border-primary shadow-md shadow-indigo-500/20' 
                                    : 'bg-white text-secondary border-gray-200 hover:border-primary/50 hover:text-primary'
                                }`}
                            >
                                {type.label}
                                {actionType === type.id && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-dark mb-2 block">Nível de Prioridade</label>
                    <div className="flex gap-2">
                        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                             <button
                                key={lvl}
                                onClick={() => setPriority(lvl as any)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                    priority === lvl 
                                    ? 'bg-dark text-white border-dark' 
                                    : 'bg-white text-secondary border-gray-200 hover:border-gray-300'
                                }`}
                             >
                                {lvl === 'CRITICAL' ? 'Crítica' : lvl === 'HIGH' ? 'Alta' : lvl === 'MEDIUM' ? 'Média' : 'Baixa'}
                             </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* STEP 2: Logistics/Responsavel */}
        {currentStep === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
                 <div>
                    <label className="text-xs font-bold text-dark mb-2 block">Quem será o responsável?</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Nome, Cargo ou Departamento..."
                            value={assignee}
                            autoFocus
                            onChange={(e) => setAssignee(e.target.value)}
                            className="w-full text-sm p-3 pl-10 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-primary placeholder-gray-400 font-medium shadow-sm transition-all focus:ring-4 focus:ring-primary/10"
                        />
                        <User className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                    <p className="text-[10px] text-secondary mt-1.5 ml-1">
                        Esta pessoa será notificada sobre a pendência.
                    </p>
                </div>

                <div>
                    <label className="text-xs font-bold text-dark mb-2 block">Prazo Limite Sugerido</label>
                    <div className="relative">
                        <input 
                            type="date" 
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full text-sm p-3 pl-10 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-primary font-medium text-dark shadow-sm uppercase transition-all focus:ring-4 focus:ring-primary/10"
                        />
                        <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                    <p className="text-[10px] text-secondary mt-1.5 ml-1">
                        Data calculada automaticamente com base na prioridade.
                    </p>
                </div>
            </div>
        )}

        {/* STEP 3: Details */}
        {currentStep === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300 h-full flex flex-col">
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-dark block">Instruções e Justificativa</label>
                        <button 
                            onClick={handleGenerateAISuggestion}
                            disabled={isGeneratingAI}
                            className="text-[10px] flex items-center gap-1.5 bg-indigo-50 text-primary font-bold hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                            Pedir sugestão para Clary
                        </button>
                    </div>
                    
                    <textarea 
                        className="w-full flex-1 min-h-[200px] text-sm p-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-primary resize-none leading-relaxed placeholder-gray-400 font-medium shadow-sm transition-all focus:ring-4 focus:ring-primary/10"
                        placeholder="Descreva detalhadamente o que deve ser feito..."
                        value={instructions}
                        autoFocus={!isGeneratingAI}
                        onChange={(e) => setInstructions(e.target.value)}
                    />
                </div>
            </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 bg-white flex gap-3">
        {isEditing && (
            <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-3 rounded-xl border border-gray-200 text-secondary font-bold hover:bg-gray-50 transition-colors"
                title="Cancelar Edição"
            >
                <X className="w-5 h-5" />
            </button>
        )}

        {currentStep > 1 && (
            <button 
                onClick={handlePrevStep}
                className="px-4 py-3 rounded-xl bg-gray-50 text-dark font-bold hover:bg-gray-100 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
        )}
        
        <button 
            onClick={currentStep === 3 ? handleSaveRemediation : handleNextStep}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
        >
            {isSubmitting ? 'Salvando...' : currentStep === 3 ? (
                <>
                    <Save className="w-4 h-4" />
                    {isEditing ? 'Atualizar Plano' : 'Salvar Ação'}
                </>
            ) : (
                <>
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                </>
            )}
        </button>
      </div>
    </div>
  );
};