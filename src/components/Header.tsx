import React from "react";
import { HeartPulse, HelpCircle, Moon, Sun } from "lucide-react";

interface HeaderProps {
  onOpenFaq: () => void;
  onReset: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFaq,
  onReset,
  isDarkMode,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-teal-100 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-2xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
        <button
          id="header-logo-btn"
          onClick={onReset}
          className="flex items-center gap-3 text-left group transition-transform active:scale-98 min-w-0"
          title="Ir para o início"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-teal-700 to-emerald-800 flex items-center justify-center text-white shadow-xs group-hover:shadow-md transition-all shrink-0">
            <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
                Farmácia <span className="text-teal-700 dark:text-teal-400">Clara</span>
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 rounded-md border border-teal-200 dark:border-teal-800 shrink-0">
                SUS & Saúde
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 font-medium">
              O que você está sentindo? Veja remédios indicados e gratuidade no SUS
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Botão de Alternância de Tema: Modo Noturno */}
          <button
            id="btn-toggle-theme"
            type="button"
            onClick={onToggleTheme}
            aria-label={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Noturno"}
            title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Noturno"}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 border shadow-2xs cursor-pointer select-none bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-300 border-slate-200 dark:border-slate-700"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
                <span className="hidden sm:inline text-slate-200">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Modo Noturno</span>
              </>
            )}
          </button>

          <button
            id="btn-open-faq"
            onClick={onOpenFaq}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-slate-700 border border-teal-200 dark:border-slate-700 transition-all duration-150 active:scale-95 cursor-pointer select-none"
            title="Como funciona a consulta de remédios no SUS"
          >
            <HelpCircle className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span className="hidden sm:inline">Dúvidas</span>
            <span className="sm:hidden">Ajuda</span>
          </button>
        </div>
      </div>
    </header>
  );
};
