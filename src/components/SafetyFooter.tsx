import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export const SafetyFooter: React.FC = () => {
  return (
    <footer
      id="safety-footer-fixed"
      className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-md text-slate-300 border-t border-slate-800 py-2.5 px-3 shadow-lg"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 text-center">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 hidden sm:inline" />
        <p className="text-[11px] sm:text-xs text-slate-200 font-medium leading-tight">
          <strong className="text-amber-300 font-semibold">Aviso importante: </strong>
          Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.
        </p>
      </div>
    </footer>
  );
};
