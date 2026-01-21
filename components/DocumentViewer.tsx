import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Bot, AlertTriangle, FileCheck, Printer, Eye, FileText as FileTextIcon, History, ChevronRight, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Document, RiskLevel, RemediationPlan, Highlight, DocStatus } from '../types';
import { ActionPanel } from './ActionPanel';

interface DocumentViewerProps {
  document: Document;
  onBack: () => void;
  onUpdateDocument: (doc: Document) => void;
}

// Configuration for virtual pagination
const CHARS_PER_PAGE = 2500; // Increased to reduce unnecessary splitting on large monitors

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onBack, onUpdateDocument }) => {
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'DIGITAL' | 'ORIGINAL'>('DIGITAL');
  
  // New States for UI UX improvements
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  
  const selectedHighlight = document.highlights.find(h => h.id === selectedHighlightId) || null;

  // Filter Logic
  const filteredHighlights = useMemo(() => {
      if (riskFilter === 'ALL') return document.highlights;
      return document.highlights.filter(h => h.riskLevel === riskFilter);
  }, [document.highlights, riskFilter]);

  // Auto-expand panel when a highlight is selected
  useEffect(() => {
      if (selectedHighlightId) {
          setIsPanelExpanded(true);
      }
  }, [selectedHighlightId]);

  // Scroll to highlight when selected (Only works in Digital Mode)
  useEffect(() => {
    if (selectedHighlightId && viewMode === 'DIGITAL') {
      // Small timeout to allow render cycle to complete
      setTimeout(() => {
        const textElement = window.document.getElementById(`highlight-${selectedHighlightId}`);
        if (textElement) {
          textElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [selectedHighlightId, viewMode]);

  const getRiskBadgeStyles = (level: RiskLevel) => {
    switch (level) {
        case RiskLevel.HIGH: return 'bg-red-50 text-red-600 border border-red-100';
        case RiskLevel.MEDIUM: return 'bg-orange-50 text-orange-600 border border-orange-100';
        case RiskLevel.LOW: return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        default: return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const translateRisk = (level: RiskLevel) => {
      switch (level) {
          case RiskLevel.HIGH: return 'RISCO ALTO';
          case RiskLevel.MEDIUM: return 'RISCO MÉDIO';
          case RiskLevel.LOW: return 'RISCO BAIXO';
          default: return 'NEUTRO';
      }
  };

  // Helper to find text index ignoring whitespace differences
  const findSnippetIndex = (content: string, snippet: string) => {
      const exactIdx = content.indexOf(snippet);
      if (exactIdx !== -1) return exactIdx;

      const cleanSnippet = snippet.replace(/\s+/g, '');
      if (!cleanSnippet) return -1;

      let snippetIdx = 0;
      let startIdx = -1;

      for (let i = 0; i < content.length; i++) {
          const char = content[i];
          if (/\s/.test(char)) continue; 

          if (char === cleanSnippet[snippetIdx]) {
              if (snippetIdx === 0) startIdx = i; 
              snippetIdx++;
              if (snippetIdx === cleanSnippet.length) return startIdx; 
          } else {
              if (startIdx !== -1) {
                 snippetIdx = 0;
                 startIdx = -1;
              }
          }
      }
      return -1;
  };

  // --- Virtual Pagination Logic ---
  const pages = useMemo(() => {
      if (!document || !document.content) return [{ text: '', startIndex: 0 }];
      
      const content = document.content;

      // 1. Detect Explicit Page Markers (from PDF Upload)
      // Matches "--- Página X ---"
      const pageMarkerRegex = /--- Página \d+ ---\n?/g;
      
      if (content.match(pageMarkerRegex)) {
          const pagesArr: { text: string, startIndex: number }[] = [];
          let match;
          
          // Use regex loop to find all markers
          while ((match = pageMarkerRegex.exec(content)) !== null) {
              const startOfPageContent = match.index + match[0].length;
              
              // Find the start of the next marker to define the end of this page
              const nextRegex = /--- Página \d+ ---\n?/g;
              nextRegex.lastIndex = startOfPageContent;
              const nextMatch = nextRegex.exec(content);
              
              const endOfPageContent = nextMatch ? nextMatch.index : content.length;
              const pageText = content.substring(startOfPageContent, endOfPageContent);
              
              // Only add valid pages
              if (pageText.length > 0 || pagesArr.length === 0) {
                   pagesArr.push({ text: pageText, startIndex: startOfPageContent });
              }
          }
          
          if (pagesArr.length > 0) return pagesArr;
      }
      
      // 2. Fallback: Character Count Pagination (for DOCX/TXT)
      const paragraphs = content.split('\n');
      const pagesArr: { text: string, startIndex: number }[] = [];
      
      let currentPageText = '';
      let currentPageStartIndex = 0;
      let currentLength = 0;
      let globalIndexTracker = 0;

      paragraphs.forEach((para, index) => {
          // Add extra newline to mimic split join
          const paraWithNewline = para + '\n';
          
          // Check if adding this paragraph exceeds page limit
          // BUT ensure at least one paragraph is added if it's huge
          if ((currentLength + para.length) > CHARS_PER_PAGE && currentPageText.length > 0) {
              pagesArr.push({ text: currentPageText, startIndex: currentPageStartIndex });
              currentPageText = '';
              currentPageStartIndex = globalIndexTracker;
              currentLength = 0;
          }

          currentPageText += paraWithNewline;
          currentLength += paraWithNewline.length;
          globalIndexTracker += paraWithNewline.length;
      });

      if (currentPageText.length > 0) {
          pagesArr.push({ text: currentPageText, startIndex: currentPageStartIndex });
      }

      return pagesArr;
  }, [document.content]);


  // --- Render Single Page Content ---
  const renderPageContent = (pageText: string, pageStartIndex: number) => {
    const highlightsWithIndices = document.highlights.map(h => {
        const exactIndex = findSnippetIndex(document.content, h.textSnippet);
        if (exactIndex !== -1 && exactIndex >= pageStartIndex && exactIndex < (pageStartIndex + pageText.length)) {
             const localIndex = exactIndex - pageStartIndex;
             return { ...h, localIndex, length: h.textSnippet.length };
        }
        return null;
    })
    .filter(Boolean)
    // @ts-ignore
    .sort((a, b) => a.localIndex - b.localIndex);

    const lines = pageText.split('\n');
    let currentLocalIndex = 0;
    const renderedHighlightIds = new Set<string>();

    return lines.map((line, lineIdx) => {
      const lineStart = currentLocalIndex;
      const lineEnd = currentLocalIndex + line.length;
      currentLocalIndex += line.length + 1; // +1 for newline

      if (line.trim() === '') return <br key={lineIdx} className="mb-4" />;

      // Improved formatting detection
      let className = "mb-3 text-gray-700 leading-relaxed text-[15px] text-justify break-words"; 
      let cleanLine = line;
      
      if (line.startsWith('# ')) {
          className = "text-3xl font-bold mt-8 mb-6 text-gray-900 border-b border-gray-200 pb-2 tracking-tight";
          cleanLine = line.replace('# ', '');
      } else if (line.startsWith('## ')) {
          className = "text-xl font-bold mt-6 mb-4 text-gray-800 tracking-tight";
          cleanLine = line.replace('## ', '');
      } else if (line.startsWith('### ')) {
          className = "text-lg font-semibold mt-5 mb-3 text-gray-800";
          cleanLine = line.replace('### ', '');
      } else if (line.trim().match(/^\d+\./)) {
           className += " ml-4 pl-2 font-medium text-gray-800"; 
      } else if (line.trim().startsWith('- ')) {
           className = "ml-4 pl-2 list-disc list-outside mb-2 text-gray-700 leading-7 text-[15px]";
      } else if (line.trim().startsWith('> ')) {
            className = "pl-4 border-l-4 border-gray-200 text-gray-500 italic mb-4";
            cleanLine = line.replace('> ', '');
      }

      // @ts-ignore
      const relevantHighlights = highlightsWithIndices.filter(h => 
        h.localIndex < lineEnd && (h.localIndex + h.length) > lineStart
      );

      if (relevantHighlights.length === 0) {
          return <p key={lineIdx} className={className}>{cleanLine}</p>;
      }

      const parts = [];
      let cursorInLine = 0; 

      relevantHighlights.forEach((h, hIdx) => {
          const highlightStartInLine = Math.max(0, h.localIndex - lineStart);
          const highlightEndInLine = Math.min(line.length, (h.localIndex + h.length) - lineStart);
          
          if (highlightStartInLine > cursorInLine) {
              parts.push(<span key={`pre-${hIdx}`}>{line.substring(cursorInLine, highlightStartInLine)}</span>);
          }

          const matchedText = line.substring(highlightStartInLine, highlightEndInLine);
          const isSelected = selectedHighlightId === h.id;
          const hasRemediation = !!h.remediation;

          const isFirstOccurrence = !renderedHighlightIds.has(h.id);
          if (isFirstOccurrence) renderedHighlightIds.add(h.id);

          let highlightClass = `rounded-[2px] px-0.5 mx-0.5 cursor-pointer transition-all duration-200 font-semibold inline-block `;
          if (isSelected) {
              highlightClass += 'ring-2 ring-primary ring-offset-2 z-10 relative shadow-sm ';
              highlightClass += h.riskLevel === 'HIGH' ? 'bg-red-200 text-red-900' : 'bg-orange-200 text-orange-900';
          } else if (hasRemediation) {
              highlightClass += 'bg-emerald-100/50 text-emerald-900 border-b-2 border-emerald-400 opacity-70';
          } else {
              highlightClass += 'border-b-2 hover:opacity-100 opacity-90 ';
              highlightClass += h.riskLevel === 'HIGH' ? 'bg-red-50 border-red-300 hover:bg-red-100' : 
                                h.riskLevel === 'MEDIUM' ? 'bg-orange-50 border-orange-300 hover:bg-orange-100' : 'bg-emerald-50 border-emerald-300';
          }

          parts.push(
              <mark
                id={isFirstOccurrence ? `highlight-${h.id}` : undefined}
                key={`${h.id}-${hIdx}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHighlightId(h.id);
                }}
                className={highlightClass}
              >
                  {matchedText}
              </mark>
          );
          cursorInLine = highlightEndInLine;
      });

      if (cursorInLine < line.length) {
          parts.push(<span key={`end`}>{line.substring(cursorInLine)}</span>);
      }

      return <p key={lineIdx} className={className}>{parts}</p>;
    });
  };

  const handleSaveRemediation = (highlightId: string, plan: RemediationPlan) => {
      const updatedHighlights = document.highlights.map(h => {
          if (h.id === highlightId) {
              return { ...h, remediation: plan };
          }
          return h;
      });

      // WORKFLOW LOGIC:
      let newStatus = document.status;
      if (newStatus === DocStatus.IN_ANALYSIS || newStatus === DocStatus.INBOX) {
          newStatus = DocStatus.IN_PLANNING;
      }

      const updatedDoc = {
          ...document,
          status: newStatus,
          highlights: updatedHighlights,
          history: [
              {
                  id: `log-${Date.now()}`,
                  user: 'Você',
                  action: 'PLAN_CREATED' as any,
                  timestamp: new Date().toISOString(),
                  note: `Ação registrada: ${plan.actionType} - ${plan.assignee}`
              },
              ...document.history
          ]
      };
      
      onUpdateDocument(updatedDoc);
  };

  const handleGlobalAction = (action: 'VALIDATE' | 'FLAG', note: string) => {
    const newLog = {
      id: `log-${Date.now()}`,
      user: 'Você',
      action,
      timestamp: new Date().toISOString(),
      note
    };

    const updatedDoc: Document = {
      ...document,
      history: [newLog, ...document.history],
      status: action === 'VALIDATE' ? DocStatus.APPROVED : DocStatus.IN_PLANNING 
    };
    onUpdateDocument(updatedDoc);
  };

  return (
    <div className="h-full flex flex-col bg-[#F4F7FE]">
      {/* Header */}
      <header className="h-20 flex items-center px-6 md:px-8 justify-between shrink-0 bg-transparent z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="group flex items-center justify-center p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-all text-secondary hover:text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-dark text-lg md:text-xl leading-tight truncate max-w-md">{document.title}</h1>
            <div className="flex items-center gap-2 text-xs text-secondary font-medium mt-1">
              <span>{document.sender || 'Upload Externo'}</span>
              <span className="text-[8px]">•</span>
              <span>{new Date(document.receivedAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="hidden md:flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 mr-2">
                <button 
                    onClick={() => setViewMode('DIGITAL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                        viewMode === 'DIGITAL' 
                        ? 'bg-primary text-white shadow-md' 
                        : 'text-secondary hover:bg-gray-50'
                    }`}
                >
                    <FileTextIcon className="w-3.5 h-3.5" />
                    Digital (IA)
                </button>
                <button 
                    onClick={() => setViewMode('ORIGINAL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                        viewMode === 'ORIGINAL' 
                        ? 'bg-dark text-white shadow-md' 
                        : 'text-secondary hover:bg-gray-50'
                    }`}
                >
                    <Eye className="w-3.5 h-3.5" />
                    Original
                </button>
            </div>
            
            <div className={`hidden md:flex px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase items-center gap-2 ${getRiskBadgeStyles(document.overallRisk)}`}>
                {document.overallRisk === RiskLevel.HIGH && <AlertTriangle className="w-4 h-4" />}
                {translateRisk(document.overallRisk)}
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6 px-6 md:px-8 pb-8">
        
        {/* Left: Document View */}
        <div 
            className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center bg-gray-200/50 rounded-3xl border border-gray-100/50 relative group shadow-inner py-8"
            onClick={() => {
                // Keep panel selection logic
            }}
        >
          {viewMode === 'DIGITAL' ? (
              <div className="w-full max-w-[210mm] space-y-8 pb-20">
                {pages.map((page, index) => (
                    <div key={index} className="bg-white shadow-xl shadow-gray-300/40 min-h-[297mm] p-[20mm] relative animate-in fade-in duration-500">
                            {/* Page Header */}
                            <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-4">
                                <div>
                                    {index === 0 ? (
                                        <>
                                            <h1 className="text-2xl font-bold text-gray-900 mb-1">{document.title}</h1>
                                            <div className="text-xs text-gray-400">
                                                ID: #{document.id.slice(-6).toUpperCase()} • {new Date().toLocaleDateString('pt-BR')}
                                            </div>
                                        </>
                                    ) : (
                                         <div className="text-xs text-gray-300 font-bold uppercase tracking-widest">
                                            {document.title.substring(0, 30)}...
                                         </div>
                                    )}
                                </div>
                                <div className="text-xs font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded">
                                    Pág. {index + 1}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="font-sans text-gray-800">
                                {renderPageContent(page.text, page.startIndex)}
                            </div>

                            {/* Page Footer */}
                            <div className="absolute bottom-6 left-0 w-full px-[20mm] flex justify-between items-end border-t border-gray-100 pt-4 mt-auto">
                                <div className="text-[9px] text-gray-400 uppercase tracking-widest font-bold flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                    Clarity AI • Leitura Inteligente
                                </div>
                                <div className="text-[10px] text-gray-400 font-medium">{index + 1} / {pages.length}</div>
                            </div>
                    </div>
                ))}
              </div>
          ) : (
             <div className="w-full h-full p-6">
                 <div className="w-full h-full bg-gray-800 rounded-2xl overflow-hidden shadow-2xl relative">
                    {document.fileUrl ? (
                        <iframe 
                            src={document.fileUrl} 
                            className="w-full h-full border-none"
                            title="Documento Original"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-white/50 p-8 text-center">
                            <AlertTriangle className="w-16 h-16 mb-4 opacity-30" />
                            <h3 className="font-bold text-lg text-white">Visualização Indisponível</h3>
                        </div>
                    )}
                 </div>
             </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="w-full lg:w-[400px] shrink-0 flex flex-col overflow-hidden bg-white rounded-3xl shadow-soft border border-gray-100 relative">
            
            {/* LIST SECTION */}
            <div className={`flex flex-col transition-all duration-300 ease-in-out ${
                (isPanelExpanded && selectedHighlightId) ? 'h-14 overflow-hidden border-b-0' : 'h-full'
            }`}>
                <div 
                    className={`shrink-0 p-4 border-b border-gray-100 bg-white z-10 flex flex-col gap-3 transition-all cursor-pointer ${
                        (isPanelExpanded && selectedHighlightId) ? 'hover:bg-gray-50' : ''
                    }`}
                    onClick={() => {
                        if (isPanelExpanded && selectedHighlightId) {
                            setIsPanelExpanded(false);
                        }
                    }}
                >
                     <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                             {isPanelExpanded && selectedHighlightId ? (
                                <>
                                    <ChevronDown className="w-4 h-4" />
                                    Expandir Lista
                                </>
                             ) : (
                                "Riscos Identificados"
                             )}
                        </h3>
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {filteredHighlights.length}
                        </span>
                    </div>

                    {!(isPanelExpanded && selectedHighlightId) && (
                        <div className="flex p-1 bg-gray-50 rounded-lg">
                            {[
                                { id: 'ALL', label: 'Todos' },
                                { id: RiskLevel.HIGH, label: 'Alto' },
                                { id: RiskLevel.MEDIUM, label: 'Médio' },
                                { id: RiskLevel.LOW, label: 'Baixo' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={(e) => { e.stopPropagation(); setRiskFilter(tab.id as any); }}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                                        riskFilter === tab.id 
                                        ? 'bg-white text-dark shadow-sm' 
                                        : 'text-secondary hover:text-dark'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`overflow-y-auto custom-scrollbar p-3 space-y-3 bg-gray-50/30 flex-1 transition-opacity duration-200 ${
                    (isPanelExpanded && selectedHighlightId) ? 'opacity-0' : 'opacity-100'
                }`}>
                     {filteredHighlights.length === 0 && (
                         <div className="p-8 text-center text-secondary">
                            <Bot className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Nenhum risco encontrado para este filtro.</p>
                         </div>
                    )}

                    {filteredHighlights.map(highlight => {
                        const isSelected = selectedHighlightId === highlight.id;
                        const hasRemediation = !!highlight.remediation;

                        return (
                            <div 
                                id={`card-${highlight.id}`}
                                key={highlight.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedHighlightId(highlight.id);
                                    if (viewMode !== 'DIGITAL') setViewMode('DIGITAL');
                                }}
                                className={`cursor-pointer p-4 rounded-xl border transition-all duration-300 relative group
                                    ${isSelected 
                                        ? 'bg-white border-primary shadow-lg ring-1 ring-primary/10 z-10' 
                                        : 'bg-white border-gray-100 hover:border-primary/30 hover:shadow-md'
                                    }
                                    ${hasRemediation && !isSelected ? 'opacity-60 bg-emerald-50/30 border-emerald-100' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${getRiskBadgeStyles(highlight.riskLevel)}`}>
                                        {translateRisk(highlight.riskLevel)}
                                    </span>
                                    
                                    <div className="flex items-center gap-2">
                                        {hasRemediation && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                <FileCheck className="w-3.5 h-3.5" />
                                                <span>Tratado</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <p className="text-dark text-xs font-bold leading-relaxed mb-2">
                                    {highlight.explanation}
                                </p>
                                
                                <div className="text-[10px] text-secondary font-serif italic truncate opacity-80 border-l-2 border-gray-200 pl-2">
                                    "{highlight.textSnippet}"
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ACTION PANEL SECTION */}
            <div className={`absolute bottom-0 left-0 w-full bg-white transition-all duration-300 ease-in-out shadow-[0_-5px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 z-20 flex flex-col ${
                (isPanelExpanded && selectedHighlightId) ? 'h-[calc(100%-56px)] rounded-t-2xl' : selectedHighlightId ? 'h-14 overflow-hidden cursor-pointer hover:bg-gray-50' : 'h-0 opacity-0 pointer-events-none'
            }`}>
                 {!isPanelExpanded && selectedHighlightId && (
                     <div 
                        className="flex items-center justify-between p-4 h-full"
                        onClick={() => setIsPanelExpanded(true)}
                     >
                         <p className="text-xs font-bold text-primary flex items-center gap-2">
                             <ChevronUp className="w-4 h-4" />
                             Continuar Edição
                         </p>
                         <span className="text-[10px] text-secondary font-medium">1 Ação Selecionada</span>
                     </div>
                 )}

                 <div className={`flex-1 flex flex-col h-full ${!isPanelExpanded ? 'hidden' : ''}`}>
                    <ActionPanel 
                        document={document} 
                        selectedHighlight={selectedHighlight}
                        onSaveRemediation={handleSaveRemediation}
                        onGlobalAction={handleGlobalAction}
                        onClose={() => {
                            setSelectedHighlightId(null);
                            setIsPanelExpanded(false);
                        }}
                        onToggleMinimize={() => setIsPanelExpanded(false)}
                    />
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};