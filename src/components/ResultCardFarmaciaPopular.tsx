import React from "react";
import { HeartHandshake, CheckCircle2, AlertCircle, FileText, UserCheck, CreditCard, ShieldCheck } from "lucide-react";
import { MedicineAnalysis } from "../types";

interface ResultCardFarmaciaPopularProps {
  analysis: MedicineAnalysis;
}

export const ResultCardFarmaciaPopular: React.FC<ResultCardFarmaciaPopularProps> = ({ analysis }) => {
  const fp = analysis.farmaciaPopular;
  const isGratuito = fp?.statusType === "gratuito";
  const isCopagamento = fp?.statusType === "copagamento";
  const isEligible = fp?.isEligible;

  return (
    <div
      id="card-farmacia-popular"
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm overflow-hidden transition-all"
    >
      {/* Card Header Badge */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${
          isGratuito
            ? "bg-gradient-to-r from-emerald-100 via-teal-100 to-emerald-50 dark:from-emerald-950/70 dark:via-teal-950/60 dark:to-emerald-950/50 border-emerald-200 dark:border-emerald-900/80"
            : isCopagamento
            ? "bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 dark:from-blue-950/70 dark:via-sky-950/60 dark:to-blue-950/50 border-blue-200 dark:border-blue-900/80"
            : "bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700"
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
              isGratuito ? "bg-emerald-600" : isCopagamento ? "bg-blue-600" : "bg-slate-500"
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Card 3 • Programa Farmácia Popular (SUS)
          </span>
        </div>

        <span
          className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
            isGratuito
              ? "bg-emerald-600 text-white border-emerald-700"
              : isCopagamento
              ? "bg-blue-600 text-white border-blue-700"
              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
          }`}
        >
          {isGratuito
            ? "100% Gratuito pelo SUS"
            : isCopagamento
            ? "Até 90% de Desconto"
            : "Não Coberto no Programa"}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Eligibility Banner */}
        {isEligible ? (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isGratuito
                ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100"
                : "bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80 text-blue-950 dark:text-blue-100"
            }`}
          >
            <CheckCircle2
              className={`w-6 h-6 shrink-0 mt-0.5 ${
                isGratuito ? "text-emerald-700 dark:text-emerald-400" : "text-blue-700 dark:text-blue-400"
              }`}
            />
            <div>
              <p className="text-sm sm:text-base font-extrabold leading-snug">
                {isGratuito
                  ? `Boa notícia! Este medicamento é 100% GRATUITO pelo Farmácia Popular.`
                  : `Disponível no Farmácia Popular com copagamento de até 90% de desconto.`}
              </p>
              {fp?.conditionName && (
                <p className="text-xs font-semibold mt-1 opacity-90">
                  Indicação no programa:{" "}
                  <span className="underline decoration-current font-bold">{fp.conditionName}</span>
                </p>
              )}
              <p className="text-xs mt-1.5 leading-relaxed opacity-95">
                {fp?.instructions ||
                  "Você pode retirar sem pagar nada em qualquer drogaria credenciada que possua o selo do programa do governo federal."}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-slate-900 dark:text-white">
                Não consta na lista do Farmácia Popular do Brasil
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Este princípio ativo específico não faz parte do elenco do programa federal gratuito, mas você pode garantir a máxima economia solicitando o <strong>Genérico oficial com Tarja Amarela</strong> no balcão.
              </p>
            </div>
          </div>
        )}

        {/* How to withdraw via Farmácia Popular (SUS Checklist) */}
        {isEligible && (
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              O que levar para retirar na farmácia credenciada:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 dark:text-white font-semibold">1. Receita Médica</strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Válida (SUS ou particular) dentro do prazo oficial.
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                <UserCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 dark:text-white font-semibold">2. Documento com Foto</strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    RG, CNH ou Carteira oficial do paciente.
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 dark:text-white font-semibold">3. CPF do Titular</strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Obrigatório para o cupom fiscal do Ministério da Saúde.
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between flex-wrap gap-2">
              <span>Procure drogarias com a placa vermelha <strong>"Aqui Tem Farmácia Popular"</strong>.</span>
              <span className="text-emerald-800 dark:text-emerald-300 font-semibold">Válido em todo território nacional</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
