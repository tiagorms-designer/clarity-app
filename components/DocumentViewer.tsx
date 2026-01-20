import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Bot, AlertTriangle, FileCheck, Printer, Eye, FileText as FileTextIcon, History, ChevronRight } from 'lucide-react';
import { Document, RiskLevel, RemediationPlan, Highlight, DocStatus } from '../types';
import { ActionPanel } from './ActionPanel';

interface DocumentViewerProps {
  document: Document;
  onBack: () => void;
  onUpdateDocument: (doc: Document) => void;
}

// Configuration for virtual pagination
const CHARS_PER_PAGE = 1800; // Approximate characters per page for splitting

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onBack, onUpdateDocument }) => {
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'DIGITAL' | 'ORIGINAL'>('DIGITAL');
  
  const selectedHighlight = document.highlights.find(h => h.id === selectedHighlightId) || null;

  // Scroll to highlight when selected (Only works in Digital Mode)
  useEffect(() => {
    if (selectedHighlightId && viewMode === 'DIGITAL') {
      // Small timeout to allow render cycle to complete (especially if switching views)
      setTimeout(() => {
        const textElement = window.document.getElementById(`highlight-${selectedHighlightId}`);
        if (textElement) {
          textElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Auto-scroll sidebar logic
        const cardElement = window.document.getElementById(`card-${selectedHighlightId}`);
        if (cardElement) {
          cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  // This is crucial because LLMs often replace newlines with spaces in their JSON output
  const findSnippetIndex = (content: string, snippet: string) => {
      // 1. Try exact match first (fastest)
      const exactIdx = content.indexOf(snippet);
      if (exactIdx !== -1) return exactIdx;

      // 2. Fuzzy match: match characters ignoring all whitespace
      const cleanSnippet = snippet.replace(/\s+/g, '');
      if (!cleanSnippet) return -1;

      let snippetIdx = 0;
      let startIdx = -1;

      for (let i = 0; i < content.length; i++) {
          const char = content[i];
          if (/\s/.test(char)) continue; // Skip document whitespace

          if (char === cleanSnippet[snippetIdx]) {
              if (snippetIdx === 0) startIdx = i; // Mark potential start
              snippetIdx++;
              if (snippetIdx === cleanSnippet.length) return startIdx; // Found full match
          } else {
              // Mismatch, reset. 
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
      const paragraphs = content.split('\n');
      const pagesArr: { text: string, startIndex: number }[] = [];
      
      let currentPageText = '';
      let currentPageStartIndex = 0;
      let currentLength = 0;
      let globalIndexTracker = 0;

      paragraphs.forEach((para, index) => {
          if ((currentLength + para.length) > CHARS_PER_PAGE && currentPageText.length > 0) {
              pagesArr.push({ text: currentPageText, startIndex: currentPageStartIndex });
              currentPageText = '';
              currentPageStartIndex = globalIndexTracker;
              currentLength = 0;
          }

          currentPageText += para + '\n';
          currentLength += para.length + 1; // +1 for newline
          globalIndexTracker += para.length + 1;
      });

      if (currentPageText.length > 0) {
          pagesArr.push({ text: currentPageText, startIndex: currentPageStartIndex });
      }

      return pagesArr;
  }, [document.content]);


  // --- Render Single Page Content ---
  const renderPageContent = (pageText: string, pageStartIndex: number) => {
    // 1. Identify highlights locations relative to this page
    const highlightsWithIndices = document.highlights.map(h => {
        // Use robust finding logic instead of simple indexOf
        const exactIndex = findSnippetIndex(document.content, h.textSnippet);
        
        // Check if this highlight falls inside THIS page's range
        if (exactIndex !== -1 && exactIndex >= pageStartIndex && exactIndex < (pageStartIndex + pageText.length)) {
             // Calculate local index relative to this page
             const localIndex = exactIndex - pageStartIndex;
             return { ...h, localIndex, length: h.textSnippet.length };
        }
        return null;
    })
    .filter(Boolean)
    // @ts-ignore
    .sort((a, b) => a.localIndex - b.localIndex);

    // 2. Split page content by newlines for rendering
    const lines = pageText.split('\n');
    let currentLocalIndex = 0;

    // Track which highlights have already been rendered (to avoid duplicate IDs if split across lines)
    const renderedHighlightIds = new Set<string>();

    return lines.map((line, lineIdx) => {
      const lineStart = currentLocalIndex;
      const lineEnd = currentLocalIndex + line.length;
      
      // Update local index for next iteration
      currentLocalIndex += line.length + 1; // +1 for newline

      if (line.trim() === '') return <br key={lineIdx} className="mb-2" />;

      // Styling - Updated for better Markdown-like appearance
      let className = "mb-4 text-gray-700 leading-7 text-[15px]"; // Default paragraph style
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
           className += " ml-5 pl-2 font-medium text-gray-800"; 
      } else if (line.trim().startsWith('- ')) {
           className = "ml-5 pl-2 list-disc list-outside mb-2 text-gray-700 leading-7 text-[15px] display-list-item";
      } else if (line.trim().startsWith('> ')) {
            className = "pl-4 border-l-4 border-gray-200 text-gray-500 italic mb-4";
            cleanLine = line.replace('> ', '');
      }

      // Find relevant highlights for this specific line
      // @ts-ignore
      const relevantHighlights = highlightsWithIndices.filter(h => 
        // Logic handles partial highlights in lines:
        // Starts before line end AND ends after line start
        h.localIndex < lineEnd && (h.localIndex + h.length) > lineStart
      );

      if (relevantHighlights.length === 0) {
          return <p key={lineIdx} className={className}>{cleanLine}</p>;
      }

      // Construct line with highlights
      const parts = [];
      let cursorInLine = 0; // Relative to the start of this line

      relevantHighlights.forEach((h, hIdx) => {
          // Intersection logic relative to line
          const highlightStartInLine = Math.max(0, h.localIndex - lineStart);
          const highlightEndInLine = Math.min(line.length, (h.localIndex + h.length) - lineStart);
          
          // Text before highlight
          if (highlightStartInLine > cursorInLine) {
              parts.push(<span key={`pre-${hIdx}`}>{line.substring(cursorInLine, highlightStartInLine)}</span>);
          }

          // The highlight text
          const matchedText = line.substring(highlightStartInLine, highlightEndInLine);
          const isSelected = selectedHighlightId === h.id;
          const hasRemediation = !!h.remediation;

          // Only assign the ID to the FIRST occurrence of the highlight to make anchoring precise
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

      // Text after last highlight
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

      const updatedDoc = {
          ...document,
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
      // Logic update: Validate now sets to APPROVED, Flag sets to RISK_WARNING
      status: action === 'VALIDATE' ? DocStatus.APPROVED : DocStatus.RISK_WARNING
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
            {/* View Toggle */}
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
        
        {/* Left: Document View (Dual Mode) */}
        <div 
            className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center bg-gray-200/50 rounded-3xl border border-gray-100/50 relative group shadow-inner py-8"
            onClick={() => setSelectedHighlightId(null)}
        >
          {viewMode === 'DIGITAL' ? (
              <>
                 <div className="w-full max-w-[210mm] space-y-8 pb-20">
                    
                    {pages.map((page, index) => (
                        <div key={index} className="bg-white shadow-xl shadow-gray-300/40 min-h-[297mm] p-[20mm] relative animate-in fade-in duration-500">
                             {/* Page Header */}
                             {index === 0 && (
                                 <div className="mb-12 border-b-2 border-dark pb-6">
                                     <div className="flex justify-between items-start">
                                         <div>
                                             <h1 className="text-2xl font-bold text-gray-900 mb-2">{document.title}</h1>
                                             <div className="text-sm text-gray-500">
                                                 Documento ID: #{document.id.slice(-6).toUpperCase()} <br/>
                                                 Gerado em: {new Date().toLocaleDateString('pt-BR')}
                                             </div>
                                         </div>
                                         <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                             <FileCheck className="w-6 h-6 text-primary" />
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {/* Content */}
                             <div className="font-sans text-gray-800">
                                 {renderPageContent(page.text, page.startIndex)}
                             </div>

                             {/* Page Footer */}
                             <div className="absolute bottom-6 left-0 w-full px-[20mm] flex justify-between items-end border-t border-gray-100 pt-4">
                                 <div className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Confidencial • Uso Interno</div>
                                 <div className="text-[10px] text-gray-400 font-medium">Página {index + 1} de {pages.length}</div>
                             </div>
                        </div>
                    ))}
                 </div>
              </>
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
                            <p className="max-w-md mt-2 text-sm opacity-70">
                                Este é um documento de exemplo gerado pelo sistema. <br/>
                                Faça o upload de um arquivo real (PDF) para ver o visualizador nativo funcionando.
                            </p>
                        </div>
                    )}
                 </div>
             </div>
          )}
        </div>

        {/* Right: Risk Cards Sidebar & Action Panel */}
        <div className="w-full lg:w-[400px] shrink-0 flex flex-col overflow-hidden bg-white rounded-3xl shadow-soft border border-gray-100">
            
            {/* 1. Risk Cards List (Upper Part) */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-gray-50/30 ${selectedHighlightId ? 'h-[40%] border-b border-gray-100' : 'h-[50%] border-b border-gray-200'}`}>
                <div className="px-1 pb-2 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Riscos Identificados</h3>
                    <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {document.highlights.length}
                    </span>
                </div>

                {document.highlights.length === 0 && (
                     <div className="p-8 text-center text-secondary">
                        <Bot className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Nenhum risco detectado.</p>
                     </div>
                )}

                {document.highlights.map(highlight => {
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
                                    {/* Category Tag */}
                                    {highlight.category && !hasRemediation && (
                                        <span className="text-[10px] font-bold text-secondary/70 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                            {highlight.category}
                                        </span>
                                    )}

                                    {/* Remediation Status */}
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

            {/* 2. Action Panel OR Audit Log (Bottom Part) */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
                <ActionPanel 
                    document={document} 
                    selectedHighlight={selectedHighlight}
                    onSaveRemediation={handleSaveRemediation}
                    onGlobalAction={handleGlobalAction}
                    onClose={() => setSelectedHighlightId(null)}
                />
            </div>
        </div>
      </div>
    </div>
  );
};