import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

export const ApiKeyModal = () => {
    // Prefer VITE_GEMINI_API_KEY if available, otherwise fall back to API_KEY injected via define
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (apiKey) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-red-100">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4 text-amber-500 mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-center text-slate-900 mb-2">Chave da API Necessária</h2>
                <p className="text-center text-slate-500 text-sm mb-6">
                    Para usar os recursos de Análise de Risco Inteligente, o Clarity precisa de uma Chave de API Google Gemini válida.
                </p>
                
                <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-600 mb-6 font-mono break-all border border-slate-100">
                    API_KEY está ausente no ambiente.
                </div>

                <p className="text-xs text-center text-slate-400 mb-4">
                   Configure a variável de ambiente API_KEY na Vercel ou no arquivo .env.
                </p>
            </div>
        </div>
    );
};