import React from "react";
import { Pill, CheckCircle2, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import { MedicineAnalysis, EquivalentMedicineOption } from "../types";

interface ResultCardEquivalentsProps {
  analysis: MedicineAnalysis;
}

export const ResultCardEquivalents: React.FC<ResultCardEquivalentsProps> = ({ analysis }) => {
  // If backend provided equivalentMedicines, use them. Otherwise, build sensible defaults based on analysis.
  const equivalents: EquivalentMedicineOption[] =
    analysis.equivalentMedicines && analysis.equivalentMedicines.length > 0
      ? analysis.equivalentMedicines
      : [
          {
            type: "generico",
            name: `${analysis.activeIngredient} (Genérico)`,
            description: `Mesmo princípio ativo (${analysis.activeIngredient}) e mesma dosagem (${analysis.dosage}) em embalagem oficial com tarja amarela e letra 'G'.`,
            advantage: `Economia de ${analysis.tarjaAmarelaInfo?.savingsPercentRange || "35% a 70%"} com a mesma eficácia comprovada por testes da ANVISA.`,
            badgeText: "Opção Mais Econômica (Tarja Amarela)",
            recommended: true,
          },
          {
            type: "referencia",
            name: analysis.commercialName || "Medicamento de Referência",
            description: "Medicamento pioneiro inovador que serviu de base regulatória para a comprovação científica.",
            advantage: "Marca tradicional consolidada, com valor de mercado mais elevado.",
            badgeText: "Marca de Referência",
            recommended: false,
          },
          {
            type: "similar",
            name: `Similar Intercambiável de ${analysis.activeIngredient}`,
            description: "Medicamento com marca comercial própria que comprovou bioequivalência perante a ANVISA.",
            advantage: "Geralmente mais barato que a referência, alternativa aceita com receita médica.",
            badgeText: "Similar Aprovado ANVISA",
            recommended: false,
          },
        ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Quais remédios você pode tomar</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Opções idênticas em princípio ativo autorizadas pela ANVISA
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {equivalents.map((item, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border transition-all ${
              item.recommended
                ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-xs"
                : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {item.name}
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                  item.recommended
                    ? "bg-amber-400 text-slate-950 font-black border border-amber-500 shadow-xs"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {item.badgeText}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {item.description}
            </p>

            {item.advantage && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{item.advantage}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          A Lei de Genéricos nº 9.787/99 garante que o remédio genérico tem <strong>exatamente a mesma substância, dosagem e efeito no organismo</strong> que o remédio de marca.
        </span>
      </div>
    </div>
  );
};
