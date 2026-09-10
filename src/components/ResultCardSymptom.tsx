import React, { useState } from "react";
import {
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  Copy,
  Check,
  ShieldCheck,
  Share2,
  Sparkles,
  Info,
} from "lucide-react";
import { motion } from "motion/react";
import { SymptomAnalysis, RecommendedMedicineOption } from "../types";
import { ShareWhatsAppButton } from "./ShareWhatsAppButton";

interface ResultCardSymptomProps {
  analysis: SymptomAnalysis;
}

export const ResultCardSymptom: React.FC<ResultCardSymptomProps> = ({ analysis }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyPhrase = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleShareWhatsApp = () => {
    const medList = analysis.recommendedMedicines
      .map(
        (m, i) =>
          `*${i + 1}. ${m.referenceName} (${m.activeIngredient})*\n` +
          `• Dosagem usual: ${m.dosage}\n` +
          `• SUS / Preço: ${m.susAvailability.badgeText}\n` +
          `• No balcão: "${m.howToAskAtCounter}"`
      )
      .join("\n\n");

    const message =
      `*Consulta de Sintomas - Farmácia Clara*\n\n` +
      `*Sintoma analisado:* ${analysis.symptomQuery}\n\n` +
      `*Quais remédios você pode tomar:*\n${medList}\n\n` +
      `⚠️ *Aviso de Segurança:* Consulte sempre o farmacêutico ou médico. Em caso de piora ou sinais de alerta, procure a UPA ou UBS mais próxima.`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "gratuito_sus":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700";
      case "copagamento":
        return "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4 sm:space-y-5"
    >
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  Avaliação de Sintomas
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Consulta Farmacêutica & RENAME SUS
                </span>
              </div>
              <ShareWhatsAppButton content={{ type: "symptom", data: analysis }} variant="header-button" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              {analysis.symptomQuery}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {analysis.clinicalOverview}
            </p>
          </div>
        </div>
      </div>

      {/* Main Section: Quais remédios a pessoa pode tomar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base sm:text-lg">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Quais remédios você pode tomar</span>
          </div>
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
            {analysis.recommendedMedicines.length} opções seguras
          </span>
        </div>

        {analysis.recommendedMedicines.map((med: RecommendedMedicineOption, idx: number) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-3.5 transition-all hover:border-emerald-300 dark:hover:border-emerald-600"
          >
            {/* Header with Commercial Reference & Active Ingredient */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {med.referenceName}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-400 font-semibold mt-0.5 ml-8">
                  Princípio Ativo: <strong>{med.activeIngredient}</strong> ({med.dosage})
                </p>
              </div>

              {/* SUS Badge */}
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ml-8 sm:ml-0 ${getBadgeStyle(
                  med.susAvailability.status
                )}`}
              >
                <span>{med.susAvailability.badgeText}</span>
              </div>
            </div>

            {/* Why it helps */}
            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Como esse remédio ajuda:
              </span>
              <p className="leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                {med.whyItHelps}
              </p>
            </div>

            {/* SUS Instructions */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>Como conseguir no SUS ou na Farmácia:</span>
              </div>
              <p className="text-emerald-950 dark:text-emerald-100 pl-5 leading-relaxed">
                {med.susAvailability.instructions}
              </p>
            </div>

            {/* How to ask at counter */}
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <span className="text-sm">🗣️</span> O que falar no balcão da farmácia:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPhrase(med.howToAskAtCounter, idx)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:text-amber-950 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md transition-colors"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar frase</span>
                    </>
                  )}
                </button>
              </div>
              <p className="italic font-medium text-slate-800 dark:text-slate-200 bg-white/70 dark:bg-slate-900/70 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                "{med.howToAskAtCounter}"
              </p>
            </div>

            {/* Precautions */}
            {med.precautions && (
              <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-800 dark:text-slate-200">Atenção:</strong> {med.precautions}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Warning signs card */}
      {analysis.warningSigns && analysis.warningSigns.length > 0 && (
        <div className="bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-red-900 dark:text-red-200 font-bold text-sm sm:text-base">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>Sinais de Alerta: Quando ir à UPA ou Pronto-Socorro imediatamente</span>
          </div>
          <ul className="space-y-1.5 pl-2">
            {analysis.warningSigns.map((sign, i) => (
              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-red-950 dark:text-red-100">
                <span className="text-red-600 dark:text-red-400 font-bold shrink-0">•</span>
                <span>{sign}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Home Care Tips */}
      {analysis.homeCareTips && analysis.homeCareTips.length > 0 && (
        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-bold text-sm">
            <HeartHandshake className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Cuidados Caseiros e Apoio Não Medicamentoso</span>
          </div>
          <ul className="space-y-1.5 pl-2">
            {analysis.homeCareTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-blue-950 dark:text-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Share on WhatsApp */}
      <ShareWhatsAppButton content={{ type: "symptom", data: analysis }} variant="full-card" />

      {/* Mandatory safety disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{analysis.disclaimer}</p>
      </div>
    </motion.div>
  );
};
