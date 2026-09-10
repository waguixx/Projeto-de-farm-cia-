import React, { useState } from "react";
import { MessageCircle, Check, Copy, Share2 } from "lucide-react";
import { MedicineAnalysis, SymptomAnalysis } from "../types";

export type ShareContent =
  | { type: "medicine"; data: MedicineAnalysis }
  | { type: "symptom"; data: SymptomAnalysis };

interface ShareWhatsAppButtonProps {
  content: ShareContent;
  variant?: "full-card" | "button" | "header-button";
  className?: string;
}

export const ShareWhatsAppButton: React.FC<ShareWhatsAppButtonProps> = ({
  content,
  variant = "full-card",
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const generateShareText = (): string => {
    if (content.type === "medicine") {
      const med = content.data;
      let text = `📋 *Consulta Farmacêutica - Farmácia Clara*\n`;
      text += `_Informações para consulta com médico ou familiar_\n\n`;
      text += `💊 *Medicamento:* ${med.commercialName}\n`;
      text += `🔬 *Princípio Ativo (DCB):* ${med.activeIngredient}\n`;
      if (med.dosage) {
        text += `📏 *Dosagem:* ${med.dosage}\n`;
      }
      text += `\n🎯 *Para que serve:*\n${med.purpose}\n\n`;

      if (med.dosageInfo) {
        text += `⏰ *Como tomar / Posologia:* \n${med.dosageInfo}\n\n`;
      }

      text += `🏛️ *Disponibilidade no SUS:*\n`;
      text += `• ${med.susAvailability?.badgeText || "Disponível na rede SUS"}\n`;
      if (med.susAvailability?.instructions) {
        text += `• ${med.susAvailability.instructions}\n`;
      }
      text += `\n`;

      if (med.farmaciaPopular?.isEligible) {
        text += `✨ *Farmácia Popular:* ${med.farmaciaPopular.badgeText}\n`;
        if (med.farmaciaPopular.instructions) {
          text += `• ${med.farmaciaPopular.instructions}\n`;
        }
        text += `\n`;
      }

      text += `💰 *Economia com Genérico (Tarja Amarela):*\n`;
      text += `• ${med.tarjaAmarelaInfo?.savingsPercentRange || "Economia de até 70%"}\n`;
      text += `• Como pedir no balcão: "${med.howToAsk}"\n\n`;

      if (med.precautions) {
        text += `⚠️ *Cuidados e Contraindicações:*\n${med.precautions}\n\n`;
      }

      text += `⚠️ *Aviso de Saúde:* Informação orientativa. Consulte sempre seu médico ou farmacêutico antes de iniciar ou alterar o tratamento.`;
      return text;
    } else {
      const sym = content.data;
      let text = `🩺 *Avaliação de Sintomas - Farmácia Clara*\n`;
      text += `_Informações para consulta com médico ou familiar_\n\n`;
      text += `🤒 *Sintoma avaliado:* ${sym.symptomQuery}\n`;
      text += `📝 *Resumo clínico:* ${sym.clinicalOverview}\n\n`;

      text += `💊 *Remédios indicados e genéricos no SUS:*\n`;
      sym.recommendedMedicines.forEach((m, idx) => {
        text += `\n*${idx + 1}. ${m.referenceName} (${m.activeIngredient})*\n`;
        text += `• Dosagem usual: ${m.dosage}\n`;
        text += `• SUS: ${m.susAvailability.badgeText}\n`;
        text += `• Por que ajuda: ${m.whyItHelps}\n`;
        text += `• No balcão: "${m.howToAskAtCounter}"\n`;
      });
      text += `\n`;

      if (sym.warningSigns && sym.warningSigns.length > 0) {
        text += `🚨 *Sinais de Alerta (Procure atendimento médico/UPA se houver):*\n`;
        sym.warningSigns.forEach((sign) => {
          text += `• ${sign}\n`;
        });
        text += `\n`;
      }

      if (sym.homeCareTips && sym.homeCareTips.length > 0) {
        text += `🏡 *Cuidados em casa:*\n`;
        sym.homeCareTips.forEach((tip) => {
          text += `• ${tip}\n`;
        });
        text += `\n`;
      }

      text += `⚠️ *Aviso de Saúde:* Informação orientativa. Em caso de agravamento ou persistência dos sintomas, procure um médico imediatamente.`;
      return text;
    }
  };

  const handleShareWhatsApp = () => {
    const text = generateShareText();
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCopyText = () => {
    const text = generateShareText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (variant === "header-button") {
    return (
      <button
        type="button"
        id="btn-header-share-whatsapp"
        onClick={handleShareWhatsApp}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs ${className}`}
        title="Compartilhar informações via WhatsApp com médico ou familiar"
      >
        <MessageCircle className="w-3.5 h-3.5 fill-current text-emerald-600 dark:text-emerald-400" />
        <span>Compartilhar</span>
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        id="btn-share-whatsapp-direct"
        onClick={handleShareWhatsApp}
        className={`w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-95 cursor-pointer select-none ${className}`}
      >
        <MessageCircle className="w-4 h-4 fill-current" />
        <span>Compartilhar no WhatsApp com Médico ou Familiar</span>
      </button>
    );
  }

  // Full Card Variant (default)
  return (
    <div
      id="share-whatsapp-result-card"
      className={`bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-emerald-50/90 dark:from-slate-800 dark:via-emerald-950/20 dark:to-slate-800 border-2 border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3.5 ${className}`}
    >
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-11 h-11 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-2xs">
          <MessageCircle className="w-6 h-6 fill-current" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Compartilhar Informações
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Enviar para um médico ou familiar?
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Envie no WhatsApp o princípio ativo, posologia, gratuidade no SUS e orientações
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <button
          type="button"
          id="btn-copy-share-text"
          onClick={handleCopyText}
          className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs"
          title="Copiar texto formatado da consulta"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Copiar</span>
            </>
          )}
        </button>

        <button
          type="button"
          id="btn-share-whatsapp-action"
          onClick={handleShareWhatsApp}
          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-95 cursor-pointer select-none"
        >
          <MessageCircle className="w-4 h-4 fill-current" />
          <span>Compartilhar via WhatsApp</span>
        </button>
      </div>
    </div>
  );
};
