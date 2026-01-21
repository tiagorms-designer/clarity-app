import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Upload, Loader2, AlertCircle, CheckCircle2, Shield, FileText, AlertTriangle } from 'lucide-react';
import { analyzeDocumentWithGemini } from '../services/geminiService';
import { Document, DocStatus, RiskLevel } from '../types';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import * as mammothLib from 'mammoth';

interface DocumentUploadProps {
  onUploadComplete: (doc: Document) => void;
  initialFile?: File | null;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete, initialFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Pronto para documentos');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0); // 0: Idle, 1: Reading, 2: AI Analysis, 3: Done
  
  const processedFileRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuração Global do Worker (Executada uma vez)
  useEffect(() => {
    try {
        const pdfjs = (pdfjsLib as any).default || pdfjsLib;
        
        // Forçamos a versão exata que está no importmap para evitar conflitos
        if (pdfjs && !pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs';
            console.log(`PDF Worker configured explicitly for v5.4.530`);
        }
    } catch (e) {
        console.warn("Falha ao configurar PDF Worker globalmente:", e);
    }
  }, []);

  const readPdfContent = async (file: File): Promise<string> => {
    try {
        const pdfjs = (pdfjsLib as any).default || pdfjsLib;
        
        // Reforça configuração do worker antes de ler
        if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
             pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs';
        }

        const arrayBuffer = await file.arrayBuffer();
        
        // Tenta carregar o documento
        const loadingTask = pdfjs.getDocument({ 
            data: new Uint8Array(arrayBuffer),
            cMapUrl: `https://unpkg.com/pdfjs-dist@5.4.530/cmaps/`,
            cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');
                
                // Adiciona marcadores de página robustos para o DocumentViewer
                if (pageText.trim().length > 0) {
                     fullText += `--- Página ${i} ---\n${pageText}\n\n`;
                }
            } catch (pageError) {
                console.warn(`Erro ao ler página ${i}:`, pageError);
            }
        }
        
        if (fullText.trim().length < 50) {
            throw new Error("O PDF parece ser uma imagem digitalizada (scan) ou está vazio. Esta versão do Clarity processa apenas PDFs com texto selecionável.");
        }

        return fullText;
    } catch (e: any) {
        console.error("Erro Crítico PDF:", e);
        if (e.name === 'PasswordException') throw new Error("O arquivo PDF está protegido por senha.");
        if (e.message.includes("imagem digitalizada")) throw e;
        if (e.message.includes("Worker")) throw new Error("Erro de compatibilidade do navegador com o leitor de PDF (Worker). Tente atualizar a página.");
        
        throw new Error("Falha técnica ao ler PDF. Tente converter para Word ou TXT.");
    }
  };

  const readDocxContent = async (file: File): Promise<string> => {
    try {
        const mammoth = (mammothLib as any).default || mammothLib;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        
        if (!result.value || result.value.trim().length === 0) {
            throw new Error("O documento Word parece estar vazio.");
        }
        return result.value;
    } catch (e: any) {
        console.error("Erro DOCX:", e);
        throw new Error("Não foi possível ler o arquivo Word. Verifique se não está corrompido.");
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return readPdfContent(file);
    } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')
    ) {
        return readDocxContent(file);
    } else {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result;
                if (typeof result === 'string' && result.trim().length > 0) {
                    resolve(result);
                } else {
                    reject(new Error("Arquivo de texto vazio ou formato inválido."));
                }
            };
            reader.onerror = () => reject(new Error("Erro de leitura do sistema."));
            reader.readAsText(file);
        });
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProgressStep(1);
    setErrorMessage(null);
    setStatusMessage(`Lendo ${file.name}...`);

    try {
      // 1. Leitura
      const rawText = await readFileContent(file);

      // 2. Sanitização
      // Remove caracteres nulos e excesso de espaços que podem quebrar o JSON da IA
      const cleanText = rawText.replace(/\0/g, '').replace(/\s\s+/g, ' ').slice(0, 80000); // Aumentei limite seguro

      if (cleanText.length < 50) {
          throw new Error("Conteúdo insuficiente para análise. O documento precisa ter texto legível.");
      }

      setProgressStep(2);
      setStatusMessage('Enviando para Inteligência Artificial...');
      
      // 3. Análise
      const analysis = await analyzeDocumentWithGemini(cleanText);

      setProgressStep(3);
      setStatusMessage('Finalizando processamento...');
      
      const fileUrl = URL.createObjectURL(file);

      const initialStatus = (analysis.overallRisk === RiskLevel.HIGH || analysis.overallRisk === RiskLevel.MEDIUM)
         ? DocStatus.INBOX
         : DocStatus.COMPLIANT;

      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        title: file.name,
        sender: analysis.sender || 'Upload Externo',
        receivedAt: new Date().toISOString(),
        status: initialStatus,
        content: rawText, // Mantém formatação original para visualização
        fileUrl: fileUrl,
        fileType: file.type,
        overallRisk: analysis.overallRisk,
        summary: analysis.summary,
        highlights: analysis.highlights,
        history: []
      };

      setTimeout(() => {
        onUploadComplete(newDoc);
        setIsProcessing(false);
        setProgressStep(0);
      }, 800);

    } catch (error: any) {
      console.error("Fluxo de Processamento Falhou:", error);
      // Exibe a mensagem de erro real (que agora vem detalhada do geminiService)
      setErrorMessage(error.message || 'Erro desconhecido ao processar documento.');
      setStatusMessage('Processamento interrompido.');
      setIsProcessing(false);
      setProgressStep(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    if (initialFile && !isProcessing && processedFileRef.current !== initialFile.name) {
        processedFileRef.current = initialFile.name;
        processFile(initialFile);
    }
  }, [initialFile]);

  const FileTypeBadge = ({ label, ext }: { label: string, ext: string }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-xs font-medium text-secondary">
        <span className="bg-white border border-gray-200 px-1.5 rounded text-[10px] uppercase font-bold tracking-wider">{ext}</span>
        {label}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col justify-center pb-20">
        <div className="text-center mb-10">
            <h2 className="text-dark font-bold text-3xl mb-3 tracking-tight">O que vamos analisar hoje?</h2>
            <p className="text-secondary max-w-lg mx-auto text-sm leading-relaxed">
                Carregue contratos, aditivos, relatórios operacionais ou faturas. 
                Nossa IA identificará riscos, inconsistências e prazos automaticamente.
            </p>
        </div>
      
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`
            relative group cursor-pointer
            border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all duration-300 ease-out
            min-h-[400px] flex flex-col items-center justify-center overflow-hidden
            ${isDragging 
                ? 'border-primary bg-indigo-50/20' 
                : 'border-gray-200 hover:border-primary/50 bg-white shadow-soft hover:shadow-xl hover:shadow-indigo-500/5'
            }
            ${isProcessing ? 'pointer-events-none' : ''}
            `}
        >
            <input 
                ref={fileInputRef}
                type="file" 
                accept=".txt,.md,.json,.csv,.log,.pdf,.docx,.jpg,.jpeg,.png,.webp" 
                className="hidden"
                onChange={handleFileSelect}
                disabled={isProcessing}
            />

            {/* Background Decoration */}
            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-50/0 via-transparent to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

            {isProcessing ? (
                <div className="relative z-10 w-full max-w-md mx-auto">
                    {/* Stepper Animation */}
                    <div className="mb-12 relative">
                         <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg relative mb-6">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                         </div>
                         <h3 className="text-xl font-bold text-dark mb-2">{statusMessage}</h3>
                         <p className="text-sm text-secondary">Isso leva apenas alguns segundos.</p>
                    </div>

                    <div className="relative w-full">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full z-0"></div>
                        <div className="absolute top-1/2 left-0 h-1 bg-primary transition-all duration-700 -translate-y-1/2 rounded-full z-0" style={{ width: `${(progressStep / 3) * 100}%` }}></div>

                        {/* Steps */}
                        <div className="flex justify-between items-center relative z-10">
                            {[1, 2, 3].map((step) => (
                                <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                                    progressStep >= step ? 'bg-primary border-primary text-white shadow-lg shadow-indigo-500/30' : 'bg-white border-gray-200 text-gray-300'
                                }`}>
                                    {progressStep > step ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{step}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-secondary mt-3 px-1">
                        <span>Extração</span>
                        <span>Análise IA</span>
                        <span>Conclusão</span>
                    </div>
                </div>
            ) : (
                <div className="relative z-10 flex flex-col items-center">
                    <div className={`
                        w-24 h-24 rounded-3xl mb-8 flex items-center justify-center transition-all duration-300
                        ${isDragging ? 'bg-primary text-white scale-105 shadow-xl shadow-indigo-500/40' : 'bg-indigo-50 text-primary group-hover:bg-primary group-hover:text-white group-hover:-translate-y-2 group-hover:shadow-lg group-hover:shadow-indigo-500/30'}
                    `}>
                        <Upload className="w-10 h-10" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-dark mb-3">
                    {isDragging ? 'Solte para começar a mágica' : 'Clique ou arraste seu arquivo'}
                    </h3>
                    
                    <button className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all mb-8 group-hover:scale-105 active:scale-95">
                        Selecionar do Computador
                    </button>

                    <div className="flex flex-wrap justify-center gap-3">
                        <FileTypeBadge label="PDF Texto" ext="PDF" />
                        <FileTypeBadge label="Word" ext="DOCX" />
                        <FileTypeBadge label="Texto" ext="TXT" />
                    </div>
                </div>
            )}
        </div>

        {errorMessage && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-700 animate-in slide-in-from-bottom-2 shadow-sm">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-sm">Não foi possível processar</p>
                    <p className="text-xs opacity-90 leading-snug">{errorMessage}</p>
                </div>
                <button 
                    onClick={() => { setErrorMessage(null); setIsProcessing(false); setProgressStep(0); }}
                    className="text-xs font-bold underline hover:text-red-900"
                >
                    Tentar Novamente
                </button>
            </div>
        )}
      
        {/* Security Footer */}
        <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm text-[10px] text-secondary font-medium uppercase tracking-wide">
                <Shield className="w-3 h-3 text-emerald-500" />
                <span>Ambiente Seguro • Criptografia Ponta a Ponta</span>
            </div>
        </div>
    </div>
  );
};