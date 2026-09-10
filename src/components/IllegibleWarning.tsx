import React from "react";
import { AlertCircle, Camera, Edit3, ShieldAlert } from "lucide-react";

interface IllegibleWarningProps {
  message?: string;
  onRetryPhoto: () => void;
  onTypeText: () => void;
}

export const IllegibleWarning: React.FC<IllegibleWarningProps> = ({
  message,
  onRetryPhoto,
  onTypeText,
}) => {
  return (
    <div
      id="illegible-warning-card"
      className="bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-5 sm:p-6 text-amber-950 dark:text-amber-100 shadow-sm space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
            Segurança do Paciente em Primeiro Lugar
          </span>
          <h3 className="text-lg font-extrabold text-amber-950 dark:text-amber-100 mt-1">
            Não foi possível ler a receita com 100% de certeza
          </h3>
          <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 mt-1 leading-relaxed">
            {message ||
              "A caligrafia ou o foco da imagem enviada não permitiu identificar com segurança absoluta o nome exato do medicamento ou sua dosagem. Por determinação de segurança em saúde, nunca adivinhamos remédios para evitar riscos à sua saúde."}
          </p>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/70 rounded-xl p-3.5 border border-amber-200 dark:border-amber-900/60 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
        <strong className="block font-bold text-amber-950 dark:text-amber-200">Dicas para melhor leitura:</strong>
        <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
          <li>Posicione a receita em local com boa luz (evite sombras).</li>
          <li>Tire a foto de cima, mantendo o celular firme e focado no texto manuscrito.</li>
          <li>Ou prefira digitar o nome do medicamento caso o médico tenha lhe informado oralmente.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          id="btn-retry-photo"
          onClick={onRetryPhoto}
          className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Camera className="w-4 h-4" />
          <span>Tirar Outra Foto Mais Nítida</span>
        </button>
        <button
          type="button"
          id="btn-switch-to-text"
          onClick={onTypeText}
          className="flex-1 py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          <span>Digitar Nome do Medicamento</span>
        </button>
      </div>
    </div>
  );
};
