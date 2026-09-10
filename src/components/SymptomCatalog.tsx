import React, { useState, useMemo } from "react";
import {
  HeartPulse,
  Flame,
  Thermometer,
  Wind,
  Activity,
  Smile,
  Zap,
  Droplets,
  AlertCircle,
  Layers,
  Sparkles,
} from "lucide-react";

interface SymptomCatalogProps {
  onSelectSymptom: (symptom: string) => void;
  isLoading: boolean;
}

export type SymptomCategoryKey =
  | "all"
  | "respiratorio"
  | "digestivo"
  | "muscular"
  | "dor_febre";

interface CategoryFilter {
  id: SymptomCategoryKey;
  label: string;
  icon: React.ReactNode;
}

interface SymptomCardItem {
  id: string;
  name: string;
  categoryGroup: SymptomCategoryKey;
  categoryTag: string;
  description: string;
  exampleMedicines: string;
  susBadge: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryFilter[] = [
  {
    id: "all",
    label: "Todos",
    icon: <Layers className="w-3.5 h-3.5" />,
  },
  {
    id: "respiratorio",
    label: "Respiratório",
    icon: <Wind className="w-3.5 h-3.5" />,
  },
  {
    id: "digestivo",
    label: "Digestivo",
    icon: <Flame className="w-3.5 h-3.5" />,
  },
  {
    id: "muscular",
    label: "Muscular",
    icon: <Activity className="w-3.5 h-3.5" />,
  },
  {
    id: "dor_febre",
    label: "Dor & Febre",
    icon: <Thermometer className="w-3.5 h-3.5" />,
  },
];

const COMMON_SYMPTOMS: SymptomCardItem[] = [
  // --- Respiratório ---
  {
    id: "gripe",
    name: "Gripe, Resfriado & Coriza",
    categoryGroup: "respiratorio",
    categoryTag: "Vias Aéreas",
    description: "Nariz escorrendo, espirros, garganta arranhando e sensação de corpo mole",
    exampleMedicines: "Paracetamol, Loratadina, Soro Nasal",
    susBadge: "🟢 100% Gratuito no Posto SUS",
    icon: <Wind className="w-5 h-5 text-blue-500" />,
  },
  {
    id: "garganta",
    name: "Dor de Garganta & Inflamação",
    categoryGroup: "respiratorio",
    categoryTag: "Faringite",
    description: "Dor ao engolir, ardência, vermelhidão e irritação na garganta",
    exampleMedicines: "Ibuprofeno, Dipirona, Pastilhas",
    susBadge: "🟢 100% Gratuito no Posto SUS",
    icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
  },
  {
    id: "alergia",
    name: "Rinite Alérgica & Espirros",
    categoryGroup: "respiratorio",
    categoryTag: "Alergias",
    description: "Espirros em sequência, coceira no nariz, olhos lacrimejando e coriza líquida",
    exampleMedicines: "Loratadina, Budesonida, Polaramine",
    susBadge: "🟡 Posto SUS e Farmácia Popular",
    icon: <Droplets className="w-5 h-5 text-teal-500" />,
  },
  {
    id: "tosse",
    name: "Tosse Seca ou com Secreção",
    categoryGroup: "respiratorio",
    categoryTag: "Brônquios & Pulmão",
    description: "Tosse persistente, pigarro no peito, secreção ou irritação brônquica",
    exampleMedicines: "Xarope de Guaco, Acetilcisteína, Ambroxol",
    susBadge: "🟢 Fitoterápico e Xarope no Posto SUS",
    icon: <Wind className="w-5 h-5 text-cyan-600" />,
  },

  // --- Digestivo ---
  {
    id: "azia",
    name: "Azia, Queimação & Refluxo",
    categoryGroup: "digestivo",
    categoryTag: "Estômago & Gastrite",
    description: "Sensação de queimação subindo pelo peito, refluxo e acidez estomacal",
    exampleMedicines: "Omeprazol, Hidróxido de Alumínio, Simeticona",
    susBadge: "🟢 100% Gratuito no Posto SUS",
    icon: <Flame className="w-5 h-5 text-orange-500" />,
  },
  {
    id: "diarreia",
    name: "Diarreia, Náusea & Enjoo",
    categoryGroup: "digestivo",
    categoryTag: "Desconforto Intestinal",
    description: "Mal-estar gástrico, vômito, enjoo ou episódios de desarranjo intestinal",
    exampleMedicines: "Soro de Reidratação (SRO), Plasil, Floratil",
    susBadge: "🟢 Sais de Reidratação no Posto SUS",
    icon: <Smile className="w-5 h-5 text-emerald-500" />,
  },
  {
    id: "gases",
    name: "Gases, Estufamento & Barriga Inchada",
    categoryGroup: "digestivo",
    categoryTag: "Distensão Abdominal",
    description: "Sensação de estômago cheio, cólica por gases e flatulência desconfortável",
    exampleMedicines: "Simeticona (Luftal), Dimeticona",
    susBadge: "🟢 Remédio no Posto SUS e Genérico",
    icon: <Activity className="w-5 h-5 text-amber-500" />,
  },
  {
    id: "colica-abdominal",
    name: "Cólica Intestinal & Espasmos",
    categoryGroup: "digestivo",
    categoryTag: "Cólicas Digestivas",
    description: "Pontadas e dores abdominais espasmódicas após refeições",
    exampleMedicines: "Buscopan (Escopolamina), Hioscina",
    susBadge: "🟢 Escopolamina no Posto SUS",
    icon: <HeartPulse className="w-5 h-5 text-teal-600" />,
  },

  // --- Muscular ---
  {
    id: "dor-muscular",
    name: "Dor Muscular & Coluna Travada",
    categoryGroup: "muscular",
    categoryTag: "Contratura & Lombalgia",
    description: "Torcicolo, dor nas costas, pescoço travado ou dores pós-esforço muscular",
    exampleMedicines: "Dorflex, Ibuprofeno, Ciclobenzaprina",
    susBadge: "🟢 Remédios no SUS e Genéricos",
    icon: <Activity className="w-5 h-5 text-indigo-500" />,
  },
  {
    id: "articulacao",
    name: "Dor nas Articulações & Joelho",
    categoryGroup: "muscular",
    categoryTag: "Artrite & Tendinite",
    description: "Dores nos joelhos, cotovelos, ombros, punhos ou juntas com rigidez",
    exampleMedicines: "Nimesulida, Ibuprofeno, Diclofenaco",
    susBadge: "🟢 Anti-inflamatório no Posto SUS",
    icon: <Activity className="w-5 h-5 text-blue-600" />,
  },
  {
    id: "torcicolo",
    name: "Torcicolo & Tensão no Pescoço",
    categoryGroup: "muscular",
    categoryTag: "Espasmo Cervical",
    description: "Dificuldade de virar a cabeça, rigidez na nuca e ombros pesados",
    exampleMedicines: "Dorflex, Paracetamol + Cafeína, Miorrelax",
    susBadge: "🟢 Analgésicos no Posto SUS",
    icon: <Zap className="w-5 h-5 text-purple-500" />,
  },

  // --- Dor & Febre ---
  {
    id: "dor-cabeca",
    name: "Dor de Cabeça / Enxaqueca",
    categoryGroup: "dor_febre",
    categoryTag: "Cefaleia",
    description: "Dor latejante, pressão na testa, têmporas ou peso na nuca",
    exampleMedicines: "Dipirona, Paracetamol, Neosaldina",
    susBadge: "🟢 100% Gratuito no Posto SUS",
    icon: <Zap className="w-5 h-5 text-amber-500" />,
  },
  {
    id: "febre",
    name: "Febre & Calafrios",
    categoryGroup: "dor_febre",
    categoryTag: "Temperatura Alta",
    description: "Temperatura acima de 37,8°C acompanhada de sensação de calafrio",
    exampleMedicines: "Dipirona, Paracetamol, Ibuprofeno",
    susBadge: "🟢 100% Gratuito no Posto SUS",
    icon: <Thermometer className="w-5 h-5 text-red-500" />,
  },
  {
    id: "colica-menstrual",
    name: "Cólica Menstrual & Tensão",
    categoryGroup: "dor_febre",
    categoryTag: "Dores Pélvicas",
    description: "Pontadas e dores em cólica no baixo ventre associadas ao ciclo menstrual",
    exampleMedicines: "Buscopan, Ácido Mefenâmico (Ponstan), Ibuprofeno",
    susBadge: "🟢 Escopolamina no Posto SUS",
    icon: <HeartPulse className="w-5 h-5 text-pink-500" />,
  },
  {
    id: "dor-dente",
    name: "Dor de Dente & Inflamação",
    categoryGroup: "dor_febre",
    categoryTag: "Odontalgia",
    description: "Dor pulsante no dente, gengiva dolorida ou sensibilidade aguda",
    exampleMedicines: "Ibuprofeno, Dipirona, Paracetamol",
    susBadge: "🟢 Atendimento e Remédios na UBS",
    icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
  },
];

export const SymptomCatalog: React.FC<SymptomCatalogProps> = ({
  onSelectSymptom,
  isLoading,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SymptomCategoryKey>("all");

  const filteredSymptoms = useMemo(() => {
    if (selectedCategory === "all") {
      return COMMON_SYMPTOMS;
    }
    return COMMON_SYMPTOMS.filter(
      (item) => item.categoryGroup === selectedCategory
    );
  }, [selectedCategory]);

  const getCategoryCount = (catId: SymptomCategoryKey) => {
    if (catId === "all") return COMMON_SYMPTOMS.length;
    return COMMON_SYMPTOMS.filter((item) => item.categoryGroup === catId).length;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-4 sm:p-5 shadow-xs space-y-4 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>O que você está sentindo?</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Filtre por categoria e toque no sintoma para consultar remédios e o SUS
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 shrink-0">
          Guia de Sintomas & SUS
        </span>
      </div>

      {/* Category Filter Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Filtrar por categoria:</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {filteredSymptoms.length} {filteredSymptoms.length === 1 ? "sintoma" : "sintomas"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map((category) => {
            const count = getCategoryCount(category.id);
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                id={`filter-category-${category.id}`}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 select-none flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 border ${
                  isSelected
                    ? "bg-teal-700 dark:bg-teal-600 text-white border-teal-700 dark:border-teal-600 shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? "bg-teal-800/80 dark:bg-teal-700 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Symptoms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredSymptoms.map((item) => (
          <button
            key={item.id}
            id={`btn-symptom-${item.id}`}
            type="button"
            onClick={() => onSelectSymptom(item.name)}
            disabled={isLoading}
            className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 bg-slate-50/70 dark:bg-slate-900/50 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition-all duration-150 active:scale-[0.98] select-none group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                  {item.categoryTag}
                </span>
                <span className="p-1 rounded-md bg-white dark:bg-slate-800 shadow-2xs">
                  {item.icon}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-800 dark:group-hover:text-teal-300 transition-colors">
                {item.name}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-snug">
                {item.description}
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block truncate">
                {item.susBadge}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                Ex: {item.exampleMedicines}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

