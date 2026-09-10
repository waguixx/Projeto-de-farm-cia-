import React, { useState } from "react";
import { TrendingDown, MessageSquare, Copy, Check, Sparkles, Percent } from "lucide-react";
import { MedicineAnalysis } from "../types";

interface ResultCardSavingsProps {
  analysis: MedicineAnalysis;
}

export const ResultCardSavings: React.FC<ResultCardSavingsProps> = ({ analysis }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyPhrase = () => {
    if (!analysis.howToAsk) return;
    navigator.clipboard.writeText(analysis.howToAsk);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const savingsRange = analysis.tarjaAmarelaInfo?.savingsPercentRange || "35% a 70%";

  return (
    <div
      id="card-savings"
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm overflow-hidden transition-all"
    >
      {/* Card Header Badge */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-950/50 dark:via-yellow-950/40 dark:to-amber-950/50 px-4 py-3 border-b border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm">
            <TrendingDown className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-200">
            Card 2 • Como Economizar
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-yellow-200/70 dark:bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
          <Percent className="w-3 h-3 text-amber-800 dark:text-amber-300" />
          <span>Economia de {savingsRange}</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Direct Instruction: How to ask at pharmacy counter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Como pedir no balcão da farmácia
            </h3>
            <button
              id="btn-copy-pharmacist-phrase"
              type="button"
              onClick={handleCopyPhrase}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-slate-600 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-slate-600 transition-colors"
              title="Copiar texto para mostrar ou ler no balcão"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copiar Frase</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 text-white shadow-inner relative group border border-slate-800">
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              Fale exatamente assim ao farmacêutico:
            </p>
            <p className="text-base sm:text-lg font-medium leading-snug text-slate-100 italic">
              "{analysis.howToAsk || `Por favor, você tem o genérico de ${analysis.activeIngredient} na dosagem ${analysis.dosage}?`}"
            </p>
          </div>
        </div>

        {/* Pedagogical Graphic: The Official ANVISA Yellow Stripe with the big 'G' */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Identifique o Genérico Oficial
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Lei Federal nº 9.787/1999
            </span>
          </div>

          {/* Visual Yellow Stripe Replica */}
          <div className="w-full bg-[#FFDF00] border-2 border-yellow-500 rounded-lg p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              {/* Big bold 'G' badge */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-900 flex items-center justify-center text-yellow-300 font-black text-2xl sm:text-3xl tracking-tighter shrink-0 border border-yellow-300">
                G
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black uppercase text-slate-950 tracking-tight leading-none">
                  Medicamento Genérico
                </p>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 mt-1">
                  Lei nº 9.787, de 1999
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-slate-900 text-yellow-300 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded">
                Economia Média: {savingsRange}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
            {analysis.tarjaAmarelaInfo?.explanation ||
              "Por lei, os genéricos são obrigados a custar no mínimo 35% menos que o de marca, podendo chegar a mais de 70% de economia, contendo exatamente o mesmo princípio ativo e eficácia terapêutica testada pela ANVISA."}
          </p>
        </div>

        {/* Savings visual comparison bar */}
        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-950 dark:text-emerald-200 mb-1.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              Comparativo de Bolso Estimado
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">Até 70% Menos</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                <span>Remédio de Referência ({analysis.commercialName})</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">100% (Preço Cheio)</span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-full w-full"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-emerald-800 dark:text-emerald-300 mb-0.5 font-semibold">
                <span>Genérico Tarja Amarela ({analysis.activeIngredient})</span>
                <span className="text-emerald-800 dark:text-emerald-300 font-bold">~30% a 50% do valor</span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full w-[40%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
