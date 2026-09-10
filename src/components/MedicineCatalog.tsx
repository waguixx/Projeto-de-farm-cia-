import React, { useState, useMemo } from "react";
import { 
  Pill, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  TrendingDown,
  Activity,
  ShieldAlert,
  Flame,
  Stethoscope,
  ChevronDown,
  Wind,
  HeartPulse
} from "lucide-react";
import { POPULAR_MEDICINES } from "../data/popularMedicines";
import { CatalogMedicine, MedicineCategory } from "../types";

interface MedicineCatalogProps {
  onSelectMedicine: (searchTerm: string) => void;
  isLoading: boolean;
}

const CATEGORY_ITEMS: { id: MedicineCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "Todos", label: "Todos", icon: Pill },
  { id: "Crônicos", label: "Crônicos (Pressão/Diabetes)", icon: Activity },
  { id: "Analgésicos", label: "Analgésicos (Dores/Febre)", icon: Stethoscope },
  { id: "Anti-inflamatórios", label: "Anti-inflamatórios", icon: Flame },
  { id: "Antibióticos", label: "Antibióticos & Fungos", icon: ShieldAlert },
  { id: "Gastrointestinais", label: "Gastrointestinais (Estômago)", icon: Pill },
  { id: "Antialérgicos & Respiratórios", label: "Alergias & Respiração", icon: Wind },
  { id: "Saúde Mental", label: "Saúde Mental (Ansiedade/Sono)", icon: HeartPulse },
];

export const MedicineCatalog: React.FC<MedicineCatalogProps> = ({
  onSelectMedicine,
  isLoading,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MedicineCategory>("Todos");
  const [catalogFilter, setCatalogFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(16);

  const filteredMedicines = useMemo(() => {
    return POPULAR_MEDICINES.filter((item) => {
      const matchesCategory =
        selectedCategory === "Todos" || item.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!catalogFilter.trim()) return true;

      const q = catalogFilter.toLowerCase();
      return (
        item.referenceName.toLowerCase().includes(q) ||
        item.activeIngredient.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.searchTerm.toLowerCase().includes(q) ||
        (item.briefPurpose && item.briefPurpose.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, catalogFilter]);

  const displayedMedicines = useMemo(() => {
    return filteredMedicines.slice(0, visibleCount);
  }, [filteredMedicines, visibleCount]);

  const handleCategoryChange = (cat: MedicineCategory) => {
    setSelectedCategory(cat);
    setVisibleCount(16);
  };

  const handleFilterChange = (text: string) => {
    setCatalogFilter(text);
    setVisibleCount(16);
  };

  return (
    <div id="medicine-catalog-section" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm p-4 sm:p-5">
      {/* Header of the catalog */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-700/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Catálogo Expandido de Medicamentos</span>
              <span className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                {POPULAR_MEDICINES.length} remédios
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Consulte para que serve, o que resolve, o genérico equivalente e regras do Farmácia Popular
            </p>
          </div>
        </div>
      </div>

      {/* Internal fast search within catalog */}
      <div className="mt-3 relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          id="catalog-filter-input"
          type="text"
          value={catalogFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filtrar por nome comercial, princípio ativo ou sintoma (ex: Amoxicilina, Dipirona, Losartana, Azia)..."
          className="w-full pl-9 pr-14 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950 transition-all"
        />
        {catalogFilter && (
          <button
            type="button"
            onClick={() => handleFilterChange("")}
            className="absolute right-3 top-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-2 category-scrollbar scroll-smooth">
        {CATEGORY_ITEMS.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;
          const count = cat.id === "Todos" 
            ? POPULAR_MEDICINES.length 
            : POPULAR_MEDICINES.filter(m => m.category === cat.id).length;

          return (
            <button
              key={cat.id}
              id={`cat-filter-${cat.id.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-emerald-800 text-emerald-100" : "bg-slate-200/80 dark:bg-slate-600 text-slate-600 dark:text-slate-300"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Medicines Grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredMedicines.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            Nenhum medicamento encontrado para "{catalogFilter}".
            <br />
            <button
              type="button"
              onClick={() => {
                setCatalogFilter("");
                setSelectedCategory("Todos");
              }}
              className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Ver todos os {POPULAR_MEDICINES.length} medicamentos
            </button>
          </div>
        ) : (
          displayedMedicines.map((item: CatalogMedicine) => (
            <button
              key={item.id}
              id={`medicine-card-${item.id}`}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectMedicine(item.searchTerm)}
              className="group text-left p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-emerald-50/40 dark:hover:bg-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
            >
              <div className="w-full">
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {item.category}
                  </span>

                  {item.farmaciaPopularStatus === "gratuito" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      100% Gratuito SUS
                    </span>
                  ) : item.farmaciaPopularStatus === "copagamento" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-950/80 px-2 py-0.5 rounded-full">
                      Co-pagamento Farmácia Pop.
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-900 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                      <TrendingDown className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                      Economia {item.estimatedSavings}
                    </span>
                  )}
                </div>

                {/* Medicine Names */}
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors line-clamp-1">
                  {item.referenceName}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                  Ativo: <strong className="font-semibold text-slate-800 dark:text-slate-200">{item.activeIngredient}</strong> ({item.commonDosage})
                </p>

                {/* Breve descrição: o que resolve e para o que é utilizado */}
                <p className="text-[11px] text-emerald-950/90 dark:text-emerald-200 font-medium bg-emerald-50/80 dark:bg-emerald-950/40 px-2 py-1 rounded-md mt-1.5 border border-emerald-100/70 dark:border-emerald-800/60 line-clamp-2">
                  <span className="font-bold text-emerald-800 dark:text-emerald-400">Para que serve: </span>
                  {item.briefPurpose ||
                    "Medicamento regulamentado pela ANVISA para tratamento com genérico bioequivalente."}
                </p>
              </div>

              {/* Bottom actionable indicator */}
              <div className="w-full flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/80 text-[11px] text-emerald-800 dark:text-emerald-400 font-bold group-hover:text-emerald-950 dark:group-hover:text-emerald-300">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Ver genérico correspondente
                </span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform text-emerald-700 dark:text-emerald-400" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Show more button if filteredMedicines exceeds visible count */}
      {filteredMedicines.length > visibleCount && (
        <div className="mt-3.5 text-center">
          <button
            id="btn-show-more-medicines"
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 24)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all shadow-sm"
          >
            <span>Mostrar mais medicamentos ({filteredMedicines.length - visibleCount} restantes)</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Helpful summary footer */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-1">
        <span>Mostrando {displayedMedicines.length} de {filteredMedicines.length} medicamentos</span>
        <span>Não encontrou? Digite qualquer nome na busca acima ou tire foto da receita médica.</span>
      </div>
    </div>
  );
};
