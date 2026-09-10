import React from "react";
import { Pill, CheckCircle2, Info, ShieldCheck, Stethoscope } from "lucide-react";
import { MedicineAnalysis } from "../types";

interface ResultCardIdentificationProps {
  analysis: MedicineAnalysis;
}

export const ResultCardIdentification: React.FC<ResultCardIdentificationProps> = ({ analysis }) => {
  return (
    <div
      id="card-identification"
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm overflow-hidden transition-all"
    >
      {/* Card Header Badge */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/60 dark:via-teal-950/50 dark:to-emerald-950/60 px-4 py-3 border-b border-emerald-100/80 dark:border-emerald-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Pill className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            Card 1 • Identificação Farmacológica
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-white/80 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Regulamentado ANVISA</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Commercial & DCB Highlight */}
        <div>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                Medicamento de Referência / Marca
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                {analysis.commercialName}
              </h2>
            </div>
            {analysis.dosage && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200">
                Dosagem: {analysis.dosage}
              </span>
            )}
          </div>

          {/* Active Ingredient (DCB) in Major Highlight */}
          <div className="mt-3.5 p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Princípio Ativo (DCB Oficial)
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-200/60 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-medium">
                Denominação Comum Brasileira
              </span>
            </div>
            <p className="text-base sm:text-lg font-extrabold text-emerald-950 dark:text-emerald-100 tracking-tight">
              {analysis.activeIngredient}
            </p>
          </div>
        </div>

        {/* Purpose / Para que serve e o que resolve */}
        <div id="section-ident-para-que-serve" className="pt-2 border-t border-slate-100 dark:border-slate-700/80">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-50/90 dark:from-emerald-950/60 dark:via-slate-900 dark:to-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-600/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-200/70 dark:border-emerald-800/60 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-200">
                    Para que serve este medicamento
                  </h3>
                  <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                    Indicação Terapêutica Principal
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-700 text-white shadow-xs">
                Indicação Oficial
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800/95 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-700/50">
              <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 font-bold leading-relaxed">
                {analysis.purpose || `Medicamento indicado para tratamento clínico e controle de sintomas relacionados ao princípio ativo ${analysis.activeIngredient}.`}
              </p>
            </div>
          </div>
        </div>

        {/* ANVISA Bioequivalence confirmation note */}
        {analysis.anvisaRegulation && (
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-normal">
              <strong className="font-semibold text-slate-800 dark:text-slate-200">Garantia ANVISA: </strong>
              {analysis.anvisaRegulation.details ||
                "Medicamento com equivalência terapêutica e farmacêutica rigidamente fiscalizada pela Agência Nacional de Vigilância Sanitária."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
