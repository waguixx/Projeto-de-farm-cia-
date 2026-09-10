import React from "react";
import { X, ShieldCheck, HelpCircle, AlertTriangle, Stethoscope } from "lucide-react";

interface GenericFaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GenericFaqModal: React.FC<GenericFaqModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="faq-modal"
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-800 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-teal-200" />
            <h3 className="text-base font-bold tracking-tight">
              Dúvidas Frequentes sobre Sintomas e SUS
            </h3>
          </div>
          <button
            id="btn-close-faq-modal"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/50 rounded-xl border border-teal-200 dark:border-teal-800/60">
            <h4 className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Como a Farmácia Clara avalia os sintomas?
            </h4>
            <p className="text-xs text-teal-900 dark:text-teal-300 leading-relaxed">
              Baseamo-nos nos Protocolos Clínicos e Diretrizes Terapêuticas (PCDT) do Ministério da Saúde, nas diretrizes da ANVISA e na Relação Nacional de Medicamentos Essenciais (RENAME) para sugerir remédios indicados para queixas comuns.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              1. Como retirar remédios de graça no SUS?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Basta comparecer à farmácia da Unidade Básica de Saúde (UBS / Posto de Saúde) mais próxima portando seu documento oficial com foto, Cartão Nacional do SUS (ou CPF) e a receita médica. Vários analgésicos, antitérmicos e anti-inflamatórios são 100% gratuitos.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              2. O que são os Sinais de Alerta?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Alguns sintomas não devem ser tratados em casa com automedicação (como falta de ar súbita, rigidez na nuca, dor no peito, febre persistente por mais de 3 dias ou sangue nas fezes). Nesses casos, o app avisa para procurar uma UPA 24h ou Pronto-Socorro imediatamente.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              3. Posso pedir ajuda ao farmacêutico no balcão?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Sim! Todo farmacêutico é legalmente habilitado pelo Conselho Federal de Farmácia (CFF) para prestar Atenção Farmacêutica, esclarecer interações e orientar a posologia adequada de Medicamentos Isentos de Prescrição (MIPs). O app inclusive fornece uma frase pronta para você falar no balcão.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            id="btn-close-faq-footer"
            onClick={onClose}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
