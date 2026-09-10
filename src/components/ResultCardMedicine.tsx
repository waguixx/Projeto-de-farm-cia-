import React, { useState } from "react";
import {
  Pill,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  Clock,
  Sparkles,
  Stethoscope,
  BadgePercent,
  HeartPulse,
  Info,
} from "lucide-react";
import { motion } from "motion/react";
import { MedicineAnalysis } from "../types";
import { ShareWhatsAppButton } from "./ShareWhatsAppButton";

interface ResultCardMedicineProps {
  analysis: MedicineAnalysis;
}

export const ResultCardMedicine: React.FC<ResultCardMedicineProps> = ({ analysis }) => {
  const [copiedCounter, setCopiedCounter] = useState<boolean>(false);

  const handleCopyPhrase = () => {
    if (!analysis.howToAsk) return;
    navigator.clipboard.writeText(analysis.howToAsk);
    setCopiedCounter(true);
    setTimeout(() => setCopiedCounter(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const message =
      `*Consulta de Medicamento - Farmácia Clara*\n\n` +
      `*Remédio:* ${analysis.commercialName}\n` +
      `*Princípio Ativo:* ${analysis.activeIngredient}\n` +
      `*Dosagem:* ${analysis.dosage}\n\n` +
      `📋 *Para que serve:*\n${analysis.purpose}\n\n` +
      (analysis.dosageInfo ? `⏰ *Como tomar / Dosagem:*\n${analysis.dosageInfo}\n\n` : "") +
      `🏛️ *Gratuidade no SUS:*\n${analysis.susAvailability?.badgeText || analysis.farmaciaPopular?.badgeText || "Disponível na rede SUS"}\n` +
      `• ${analysis.susAvailability?.instructions || analysis.farmaciaPopular?.instructions || "Verifique no posto de saúde."}\n\n` +
      `💰 *Economia com Genérico:* ${analysis.tarjaAmarelaInfo?.savingsPercentRange || "Economia de até 65%"}\n` +
      `🗣️ *Como pedir no balcão:* "${analysis.howToAsk}"\n\n` +
      (analysis.precautions ? `⚠️ *Cuidados:* ${analysis.precautions}\n\n` : "") +
      `*Atenção:* Consulte sempre seu médico ou farmacêutico antes de iniciar qualquer medicação.`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const isSusFree =
    analysis.susAvailability?.isFreeInSUS ||
    analysis.farmaciaPopular?.statusType === "gratuito" ||
    (analysis.susAvailability?.badgeText && analysis.susAvailability.badgeText.includes("100% Gratuito"));

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4 sm:space-y-5"
    >
      {/* Main Identification & Commercial/DCB Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-4">
        {/* Header Badge */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300">
                Informações Farmacológicas
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ANVISA & Relação Nacional de Medicamentos (SUS)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Oficial ANVISA
            </span>
            <ShareWhatsAppButton content={{ type: "medicine", data: analysis }} variant="header-button" />
          </div>
        </div>

        {/* Commercial Name & Active Ingredient (DCB) */}
        <div>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Nome Comercial / Referência
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {analysis.commercialName}
              </h1>
            </div>
            {analysis.dosage && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                {analysis.dosage}
              </span>
            )}
          </div>

          {/* Active Ingredient (DCB) in prominent highlight */}
          <div className="mt-3 p-3 rounded-xl bg-teal-50/90 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Princípio Ativo (DCB Oficial)
              </span>
              <span className="text-[10px] text-teal-700 dark:text-teal-300 font-medium">
                Denominação Comum Brasileira
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-teal-950 dark:text-teal-100">
              {analysis.activeIngredient}
            </p>
          </div>
        </div>

        {/* 1. HERO SECTION: Para que serve e o que resolve */}
        <div
          id="section-para-que-serve"
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-50/90 dark:from-emerald-950/60 dark:via-slate-900 dark:to-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-600/80 shadow-xs space-y-3 transition-all"
        >
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-200/80 dark:border-emerald-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  Para que serve este medicamento
                </h3>
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  Indicação Clínica Principal & Ação Terapêutica
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-700 text-white shadow-xs">
              Indicação Bula ANVISA
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800/95 p-3.5 sm:p-4 rounded-xl border border-emerald-200/90 dark:border-emerald-700/60 shadow-xs">
            <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 font-bold leading-relaxed">
              {analysis.purpose ||
                `Medicamento indicado para o alívio e tratamento clínico das afecções correspondentes ao princípio ativo ${analysis.activeIngredient}. Consulte a bula oficial ou o farmacêutico.`}
            </p>
          </div>
        </div>

        {/* 2. Como Tomar & Posologia Usual */}
        {analysis.dosageInfo && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-950 dark:text-emerald-200 font-bold text-xs sm:text-sm">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Como tomar / Posologia e dosagem habitual:</span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed font-medium">
              {analysis.dosageInfo}
            </p>
          </div>
        )}

        {/* 3. Disponibilidade no SUS (Posto de Saúde e UBS) */}
        <div className="p-3.5 sm:p-4 rounded-xl border space-y-2 bg-gradient-to-br from-teal-50/80 to-emerald-50/80 dark:from-slate-900 dark:to-teal-950/40 border-teal-200 dark:border-teal-800/60">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Disponibilidade no SUS & Gratuidade
                </h3>
                <p className="text-[11px] text-teal-800 dark:text-teal-300 font-semibold">
                  {analysis.susAvailability?.badgeText ||
                    (analysis.farmaciaPopular?.isEligible
                      ? analysis.farmaciaPopular.badgeText
                      : isSusFree
                      ? "🟢 100% Gratuito no Posto de Saúde / UBS"
                      : "Disponível na rede pública ou genérico barato")}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
              RENAME / SUS
            </span>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {analysis.susAvailability?.instructions ||
              analysis.farmaciaPopular?.instructions ||
              "Pode ser retirado gratuitamente na farmácia básica da UBS portando Cartão SUS e documento oficial com foto."}
          </p>
        </div>

        {/* 4. Economia com Genérico (Tarja Amarela) */}
        {analysis.tarjaAmarelaInfo && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-amber-950 dark:text-amber-200 font-black text-xs sm:text-sm">
                <BadgePercent className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Genérico Oficial com Tarja Amarela:</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                {analysis.tarjaAmarelaInfo.savingsPercentRange || "Economia de até 65%"}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {analysis.tarjaAmarelaInfo.explanation}
            </p>
          </div>
        )}

        {/* 5. Como pedir no balcão da farmácia */}
        {analysis.howToAsk && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                O que falar no balcão da farmácia:
              </span>
              <button
                type="button"
                onClick={handleCopyPhrase}
                className="flex items-center gap-1 text-[11px] font-bold text-teal-800 dark:text-teal-300 hover:text-teal-950 dark:hover:text-teal-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-teal-200 dark:border-slate-700 transition-colors"
                title="Copiar frase para o balcão"
              >
                {copiedCounter ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Frase</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-teal-950 dark:text-teal-100 italic bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-teal-100 dark:border-teal-800/50">
              "{analysis.howToAsk}"
            </p>
          </div>
        )}

        {/* 6. Cuidados e Contraindicações */}
        {analysis.precautions && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-red-900 dark:text-red-300 font-bold text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Cuidados essenciais e Contraindicações:</span>
            </div>
            <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed font-medium">
              {analysis.precautions}
            </p>
          </div>
        )}

        {/* 7. Opções Equivalentes (Genérico vs Referência vs Similar) */}
        {analysis.equivalentMedicines && analysis.equivalentMedicines.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Opções Equivalentes para Comprar ou Retirar
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {analysis.equivalentMedicines.map((option, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    option.type === "generico" || option.recommended
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                      : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {option.name}
                      </span>
                      {option.badge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {option.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        {option.description}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 text-[11px] shrink-0">
                    {option.savingsEstimated || "Opção segura"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Dicas Práticas de Uso */}
        {analysis.quickTips && analysis.quickTips.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Dicas úteis de consumo:
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
              {analysis.quickTips.map((tip, idx) => (
                <li key={idx} className="leading-relaxed">
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ANVISA Bioequivalence Guarantee Note */}
        {analysis.anvisaRegulation && (
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="font-semibold text-slate-800 dark:text-slate-200">Garantia ANVISA: </strong>
              {analysis.anvisaRegulation.details ||
                "Medicamento com equivalência terapêutica, segurança e eficácia clínica certificadas pela ANVISA."}
            </p>
          </div>
        )}

        {/* Share with Doctor or Family via WhatsApp */}
        <ShareWhatsAppButton content={{ type: "medicine", data: analysis }} variant="full-card" />

        {/* Disclaimer */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-2 border-t border-slate-100 dark:border-slate-700/60">
          {analysis.disclaimer ||
            "Aviso importante: Esta orientação tem caráter estritamente educativo e informativo. Nunca se automedique de forma abusiva e consulte sempre o farmacêutico ou seu médico."}
        </p>
      </div>
    </motion.div>
  );
};
