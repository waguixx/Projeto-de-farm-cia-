import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { SearchArea } from "./components/SearchArea";
import { ResultCardSymptom } from "./components/ResultCardSymptom";
import { ResultCardMedicine } from "./components/ResultCardMedicine";
import { SymptomCatalog } from "./components/SymptomCatalog";
import { SearchHistory } from "./components/SearchHistory";
import { SafetyFooter } from "./components/SafetyFooter";
import { GenericFaqModal } from "./components/GenericFaqModal";
import {
  UnifiedAnalysis,
  MedicineAnalysis,
  SymptomAnalysis,
  SearchHistoryItem,
} from "./types";
import {
  RotateCcw,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  HeartPulse,
  Pill,
} from "lucide-react";
import { motion } from "motion/react";

const STORAGE_KEY = "farmacia_clara_unified_history";
const THEME_KEY = "farmacia_clara_theme";

const LOADING_TIPS = [
  "Identificando receita médica e medicamento com inteligência artificial...",
  "Consultando informações farmacológicas e diretrizes da ANVISA...",
  "Verificando gratuidade em UBS / Postos de Saúde e Farmácia Popular...",
  "Consultando opções de genéricos certificados com tarja amarela...",
  "Analisando dosagens seguras, precauções e cuidados clínicos...",
];

export default function App() {
  const [currentResult, setCurrentResult] = useState<UnifiedAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isFaqOpen, setIsFaqOpen] = useState<boolean>(false);
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === "dark") return true;
      if (savedTheme === "light") return false;
      return (
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch {
      return false;
    }
  });

  // Sync dark mode class on document element
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem(THEME_KEY, "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem(THEME_KEY, "light");
      }
    } catch (e) {
      console.error("Erro ao persistir tema:", e);
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 3));
        }
      }
    } catch (e) {
      console.error("Erro ao carregar histórico local:", e);
    }
  }, []);

  // Save search to history (supports medicine or symptom)
  const saveToHistory = (result: UnifiedAnalysis, queryStr: string) => {
    try {
      let newItem: SearchHistoryItem;

      if (result.type === "medicine") {
        const med = result.data;
        const isFree = med.farmaciaPopular?.isEligible || med.susAvailability?.isFreeInSUS;
        newItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: "medicine",
          query: queryStr,
          title: med.commercialName,
          subtitle: `Genérico: ${med.activeIngredient}`,
          badge: isFree ? "SUS Grátis" : "Genérico ~50%",
          isSusFree: isFree,
          timestamp: Date.now(),
          medicineAnalysis: med,
          commercialName: med.commercialName,
          activeIngredient: med.activeIngredient,
          dosage: med.dosage,
          savingsPercent: med.tarjaAmarelaInfo?.savingsPercentRange || "Economia",
        };
      } else {
        const symptom = result.data;
        const firstMed = symptom.recommendedMedicines?.[0];
        newItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: "symptom",
          query: queryStr,
          title: symptom.symptomQuery || queryStr,
          subtitle: firstMed
            ? `Opção: ${firstMed.referenceName} (${firstMed.activeIngredient})`
            : "Consulta de Sintomas & Remédios SUS",
          badge: "Opções SUS",
          isSusFree: true,
          timestamp: Date.now(),
          symptomAnalysis: symptom,
          commercialName: symptom.symptomQuery,
          activeIngredient: firstMed?.activeIngredient || "SUS",
          savingsPercent: "SUS Gratuito",
        };
      }

      const updated = [
        newItem,
        ...history.filter(
          (h) =>
            h.title.toLowerCase() !== newItem.title.toLowerCase() &&
            h.query.toLowerCase() !== newItem.query.toLowerCase()
        ),
      ].slice(0, 3);

      setHistory(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao salvar histórico local:", e);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Erro ao limpar histórico:", e);
    }
  };

  // Rotating loading tips effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Main search handler (supports medicine name, symptom, photo/image and voice queries)
  const handleSearch = async (
    queryText: string,
    imageBase64?: string,
    imageMimeType?: string
  ) => {
    const trimmed = (queryText || "").trim();
    if (!trimmed && !imageBase64) return;

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingTipIndex(0);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: trimmed || "Foto de receita ou embalagem de remédio",
          text: trimmed,
          imageBase64,
          imageMimeType,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: any = null;
      const rawText = await response.text();
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        if (!response.ok) {
          throw new Error(
            `Serviço temporariamente ocupado (${response.status}). Por favor, tente novamente em instantes.`
          );
        }
        throw new Error("Não foi possível processar a resposta do servidor. Tente novamente.");
      }

      if (!response.ok || !data) {
        throw new Error(
          data?.error || `Não foi possível completar a consulta (${response.status}). Tente novamente.`
        );
      }

      let parsedResult: UnifiedAnalysis;

      if (data.type === "medicine" && data.data) {
        parsedResult = { type: "medicine", data: data.data as MedicineAnalysis };
      } else if (data.type === "symptom" && data.data) {
        parsedResult = { type: "symptom", data: data.data as SymptomAnalysis };
      } else if (data.commercialName) {
        // Direct medicine analysis payload
        parsedResult = { type: "medicine", data: data as MedicineAnalysis };
      } else if (data.recommendedMedicines) {
        // Direct symptom analysis payload
        parsedResult = { type: "symptom", data: data as SymptomAnalysis };
      } else {
        throw new Error("Formato de resposta não reconhecido.");
      }

      const historyLabel = trimmed || (imageBase64 ? "Foto de receita / remédio" : "Consulta");
      setCurrentResult(parsedResult);
      saveToHistory(parsedResult, historyLabel);
    } catch (err: any) {
      console.error("Erro na busca:", err);
      if (err.name === "AbortError") {
        setErrorMessage("A consulta demorou mais que o esperado. Por favor, tente novamente.");
      } else {
        setErrorMessage(
          err.message || "Não foi possível completar a consulta. Verifique sua conexão e tente novamente."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = (item: SearchHistoryItem) => {
    if (item.type === "medicine" && item.medicineAnalysis) {
      setCurrentResult({ type: "medicine", data: item.medicineAnalysis });
      setErrorMessage(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (item.type === "symptom" && item.symptomAnalysis) {
      setCurrentResult({ type: "symptom", data: item.symptomAnalysis });
      setErrorMessage(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (item.symptomAnalysis) {
      setCurrentResult({ type: "symptom", data: item.symptomAnalysis });
      setErrorMessage(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (item.medicineAnalysis) {
      setCurrentResult({ type: "medicine", data: item.medicineAnalysis });
      setErrorMessage(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleResetSearch = () => {
    setCurrentResult(null);
    setErrorMessage(null);
  };

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? "dark" : ""
      } bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans pb-24 selection:bg-teal-200 transition-colors duration-200`}
    >
      {/* App Header */}
      <Header
        onOpenFaq={() => setIsFaqOpen(true)}
        onReset={handleResetSearch}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Responsive Mobile-First Container */}
      <main className="w-full max-w-2xl mx-auto px-4 pt-3 sm:pt-4 flex-1 space-y-3 sm:space-y-4">
        {/* Compact, Clean Top Banner */}
        {!currentResult && !isLoading && (
          <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-teal-900 text-white rounded-xl px-3.5 py-2.5 shadow-sm dark:border dark:border-teal-700/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <p className="truncate font-medium text-teal-100">
                Consulte <strong>remédios (ex: Dipirona)</strong> ou <strong>sintomas</strong> com dosagem e SUS
              </p>
            </div>
            <button
              onClick={() => setIsFaqOpen(true)}
              className="text-[11px] font-bold text-teal-200 hover:text-white underline shrink-0 cursor-pointer active:scale-95 transition-transform duration-150"
            >
              Como funciona?
            </button>
          </div>
        )}

        {/* Dual Search Area: Medicines or Symptoms */}
        <SearchArea onSearch={handleSearch} isLoading={isLoading} />

        {/* Loading State with Health & SUS Tips */}
        {isLoading && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-teal-200 dark:border-slate-700 p-6 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Buscando informações oficiais e gratuitas no SUS...
              </h3>
              <p className="text-xs text-teal-800 dark:text-teal-300 font-medium mt-1 transition-all">
                {LOADING_TIPS[loadingTipIndex]}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Consultando ANVISA, RENAME e Farmácia Popular do Brasil
            </p>
          </div>
        )}

        {/* Error message card */}
        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-3.5 text-red-900 dark:text-red-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <strong className="font-bold">Aviso: </strong>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-semibold cursor-pointer active:scale-95 transition-transform duration-150"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Result Container: Medicine or Symptom with fluid slide-up animation */}
        {currentResult && !isLoading && (
          <motion.div
            key={
              currentResult.type === "medicine"
                ? `med-${currentResult.data.commercialName}`
                : `sym-${currentResult.data.symptomQuery}`
            }
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1], // snappy Apple-style cubic bezier ease-out
            }}
            className="space-y-3.5"
          >
            {/* Navigation Header for Result */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 truncate">
                {currentResult.type === "medicine" ? (
                  <Pill className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <HeartPulse className="w-4 h-4 text-teal-600 shrink-0" />
                )}
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {currentResult.type === "medicine" ? "Medicamento: " : "Sintoma: "}
                  <strong>
                    {currentResult.type === "medicine"
                      ? currentResult.data.commercialName
                      : currentResult.data.symptomQuery}
                  </strong>
                </span>
              </div>
              <button
                id="btn-new-search"
                type="button"
                onClick={handleResetSearch}
                className="flex items-center gap-1 text-xs font-bold text-teal-800 dark:text-teal-300 hover:text-teal-950 dark:hover:text-teal-100 px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-slate-700 hover:bg-teal-100 dark:hover:bg-slate-600 transition-all shrink-0 cursor-pointer active:scale-95 duration-150 select-none shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nova Consulta</span>
              </button>
            </div>

            {/* Render appropriate card based on result type */}
            {currentResult.type === "medicine" ? (
              <ResultCardMedicine analysis={currentResult.data} />
            ) : (
              <ResultCardSymptom analysis={currentResult.data} />
            )}
          </motion.div>
        )}

        {/* Home Screen Exploration: Symptom Catalog */}
        {!currentResult && !isLoading && (
          <SymptomCatalog
            onSelectSymptom={(symptom) => handleSearch(symptom)}
            isLoading={isLoading}
          />
        )}

        {/* History of last 3 searches on initial screen */}
        {!currentResult && !isLoading && history.length > 0 && (
          <SearchHistory
            items={history}
            onSelect={handleSelectHistoryItem}
            onClear={clearHistory}
          />
        )}

        {/* Trust and safety informational strip */}
        {!currentResult && !isLoading && (
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <span>Atenção Básica no Sistema Único de Saúde (SUS)</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              No Brasil, os Postos de Saúde (UBS) fornecem gratuitamente os medicamentos essenciais previstos na RENAME para alívio de sintomas comuns. Sempre tire dúvidas com o farmacêutico no balcão ou seu médico.
            </p>
          </div>
        )}
      </main>

      {/* Educational Modal */}
      <GenericFaqModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} />

      {/* Fixed Safety Footer */}
      <SafetyFooter />
    </div>
  );
}
