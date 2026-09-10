import React from "react";
import { History, Clock, ArrowRight, Trash2, Heart } from "lucide-react";
import { SearchHistoryItem } from "../types";

interface SearchHistoryProps {
  items: SearchHistoryItem[];
  onSelect: (item: SearchHistoryItem) => void;
  onClear: () => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({ items, onSelect, onClear }) => {
  if (items.length === 0) {
    return null;
  }

  // Display only the last 3 searches as requested
  const lastThree = items.slice(0, 3);

  return (
    <div id="search-history-container" className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Últimas 3 Buscas Realizadas
          </h3>
        </div>
        <button
          id="btn-clear-history"
          type="button"
          onClick={onClear}
          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium flex items-center gap-1 transition-all duration-150 active:scale-90 cursor-pointer select-none"
          title="Limpar histórico"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Limpar</span>
        </button>
      </div>

      <div className="space-y-2">
        {lastThree.map((item) => {
          const isSymptom = item.type === "symptom" || !!item.symptomAnalysis;
          const displayTitle = item.title || item.commercialName || item.query;
          const displaySubtitle = item.subtitle || (item.activeIngredient ? `Genérico: ${item.activeIngredient}` : "Consulta de Sintomas");
          const badgeText = item.badge || (item.savingsPercent ? `Economia ~${item.savingsPercent}` : (isSymptom ? "Opções SUS" : "Genérico"));

          return (
            <button
              key={item.id}
              id={`history-item-${item.id}`}
              type="button"
              onClick={() => onSelect(item)}
              className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-emerald-50/70 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 flex items-center justify-between gap-3 group transition-all duration-150 active:scale-[0.98] cursor-pointer select-none"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-950 dark:group-hover:text-emerald-300 truncate">
                    {displayTitle}
                  </span>
                  {item.dosage && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {item.dosage}
                    </span>
                  )}
                  {(item.isSusFree || item.isFarmaciaPopular) && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5 fill-current" />
                      SUS
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 truncate mt-0.5">
                  {displaySubtitle}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    isSymptom
                      ? "text-teal-800 dark:text-teal-200 bg-teal-100 dark:bg-teal-950/70 border-teal-300 dark:border-teal-800"
                      : "text-amber-700 dark:text-amber-300 bg-yellow-100 dark:bg-amber-950/70 border-yellow-300 dark:border-amber-800"
                  }`}
                >
                  {badgeText}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
