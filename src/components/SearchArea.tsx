import React, { useState, useRef } from "react";
import {
  Search,
  X,
  Sparkles,
  Loader2,
  HeartPulse,
  ArrowRight,
  Pill,
  Camera,
  Image as ImageIcon,
  Mic,
  MicOff,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { fileToBase64 } from "../utils/imageUtils";
import { useSpeechRecognition } from "../utils/useSpeechRecognition";

interface SearchAreaProps {
  onSearch: (query: string, imageBase64?: string, imageMimeType?: string) => void;
  isLoading: boolean;
}

const POPULAR_MEDICINES = [
  { name: "Luftal", hint: "Gases e estufamento / Simeticona" },
  { name: "Buscopan", hint: "Cólicas menstruais e estomacais" },
  { name: "Dipirona", hint: "Novalgina / Febre e dor" },
  { name: "Paracetamol", hint: "Tylenol / Analgésico" },
  { name: "Losartana", hint: "Pressão / Gratuito SUS" },
  { name: "Omeprazol", hint: "Azia / Gastrite" },
  { name: "Ibuprofeno", hint: "Inflamação e dor" },
  { name: "Dorflex", hint: "Dor muscular e tensão" },
];

const POPULAR_SYMPTOMS = [
  { title: "Dor de cabeça", hint: "Enxaqueca / Tensional" },
  { title: "Febre", hint: "Temperatura alta" },
  { title: "Azia e Queimação", hint: "Refluxo / Estômago" },
  { title: "Gripe e Resfriado", hint: "Coriza e corpo mole" },
  { title: "Dor na Coluna", hint: "Lombar / Travada" },
];

export const SearchArea: React.FC<SearchAreaProps> = ({
  onSearch,
  isLoading,
}) => {
  const [searchText, setSearchText] = useState("");
  const [selectedImage, setSelectedImage] = useState<{
    base64: string;
    mimeType: string;
    fileName: string;
    previewUrl: string;
  } | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Speech Recognition hook
  const {
    isSupported: isSpeechSupported,
    isListening,
    error: speechError,
    startListening,
    stopListening,
    clearError: clearSpeechError,
  } = useSpeechRecognition({
    onResult: (transcript, isFinal) => {
      setSearchText(transcript);
      if (isFinal && transcript.trim().length > 2) {
        // Optional slight auto-pause before user confirms or submits
      }
    },
    onError: (err) => {
      console.warn("Speech error in SearchArea:", err);
    },
  });

  const handleVoiceToggle = () => {
    clearSpeechError();
    setImageError(null);
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleImageFile = async (file: File) => {
    setImageError(null);
    if (!file.type.startsWith("image/")) {
      setImageError("Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).");
      return;
    }

    try {
      setIsProcessingImage(true);
      const { base64, mimeType } = await fileToBase64(file);
      setSelectedImage({
        base64,
        mimeType,
        fileName: file.name || "foto-medicamento.jpg",
        previewUrl: base64,
      });
    } catch (err: any) {
      console.error("Erro ao processar imagem:", err);
      setImageError("Não foi possível processar a fotografia. Tente outra imagem.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    // reset input value so user can re-select the same image if needed
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    }

    const query = searchText.trim();
    if (!query && !selectedImage) {
      return;
    }

    onSearch(
      query || "Foto de receita médica ou caixa do medicamento",
      selectedImage?.base64,
      selectedImage?.mimeType
    );
  };

  const handleQuickItem = (queryText: string) => {
    if (isListening) stopListening();
    setSearchText(queryText);
    setSelectedImage(null);
    onSearch(queryText);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageFile(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full bg-white dark:bg-slate-800 rounded-2xl border transition-all space-y-4 p-4 sm:p-5 shadow-xs ${
        isDragOver
          ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-3 ring-teal-200 dark:ring-teal-800"
          : "border-slate-200/90 dark:border-slate-700"
      }`}
    >
      {/* Hidden File Inputs for Camera and Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* Search Header */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              O que você deseja consultar?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite, tire uma <strong>foto da receita/caixa</strong> ou use a <strong>sua voz</strong>
            </p>
          </div>
        </div>

        {/* Search Method Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            id="btn-trigger-camera"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isLoading || isProcessingImage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-teal-900 dark:text-teal-200 bg-teal-50 dark:bg-slate-700/80 hover:bg-teal-100 dark:hover:bg-slate-700 border border-teal-200/80 dark:border-slate-600 transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs"
            title="Tirar foto da receita ou embalagem com a câmera"
          >
            <Camera className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>Tirar Foto</span>
          </button>

          <button
            type="button"
            id="btn-trigger-gallery"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isLoading || isProcessingImage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs"
            title="Enviar foto ou arquivo de imagem da receita"
          >
            <ImageIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>Galeria</span>
          </button>
        </div>
      </div>

      {/* Voice Listening Active Notification */}
      {isListening && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Ouvindo sua voz...
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 truncate">
                {searchText ? `"${searchText}"` : "Fale o remédio ou sintoma (ex: Dipirona, Dor de cabeça)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={stopListening}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shrink-0 active:scale-95 transition-all cursor-pointer"
          >
            Concluir
          </button>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={clearSpeechError}
            className="text-amber-700 dark:text-amber-300 font-bold hover:underline ml-2"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Image Error Banner */}
      {imageError && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-2.5 flex items-center justify-between text-xs text-red-900 dark:text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{imageError}</span>
          </div>
          <button
            type="button"
            onClick={() => setImageError(null)}
            className="text-red-700 dark:text-red-300 font-bold hover:underline ml-2"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Selected Image Preview Card */}
      {selectedImage && (
        <div className="bg-teal-50/70 dark:bg-slate-900/80 border border-teal-200/90 dark:border-teal-800/80 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={selectedImage.previewUrl}
              alt="Prévia da receita ou embalagem"
              className="w-14 h-14 object-cover rounded-lg border border-teal-300 dark:border-teal-700 shrink-0 bg-white"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-teal-950 dark:text-teal-200 truncate">
                  Foto pronta para análise por IA
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                {selectedImage.fileName}
              </p>
              <p className="text-[10px] text-teal-800 dark:text-teal-300 font-medium mt-0.5">
                A IA lerá o nome do remédio ou receita médica automaticamente.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-remove-selected-image"
            onClick={handleRemoveImage}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-90 transition-all duration-150 cursor-pointer"
            title="Remover imagem"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Search Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="main-search-input"
            className="block text-[11px] font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider mb-1.5"
          >
            {selectedImage
              ? "Observação adicional (opcional)"
              : "Digite o remédio ou sintoma"}
          </label>

          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              id="main-search-input"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={
                selectedImage
                  ? "Ex: Como tomar? / Qual o genérico deste remédio? (Opcional)"
                  : "Ex: Dipirona, Dor de cabeça, Febre, Losartana, Omeprazol..."
              }
              className="w-full pl-10 pr-24 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-3 focus:ring-teal-100 dark:focus:ring-teal-950 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
              disabled={isLoading || isProcessingImage}
            />

            <div className="absolute right-2.5 flex items-center gap-1">
              {searchText && (
                <button
                  type="button"
                  id="btn-clear-search-text"
                  onClick={() => setSearchText("")}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all duration-150 cursor-pointer"
                  title="Limpar texto"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* In-input Voice Button */}
              <button
                type="button"
                id="btn-input-mic"
                onClick={handleVoiceToggle}
                disabled={isLoading}
                className={`p-1.5 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse"
                    : "text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                title={isListening ? "Parar gravação" : "Falar no microfone"}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* In-input Camera Button */}
              <button
                type="button"
                id="btn-input-camera"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isLoading || isProcessingImage}
                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all duration-150 cursor-pointer"
                title="Tirar foto da receita médica ou embalagem"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          id="btn-submit-search"
          disabled={isLoading || isProcessingImage || (!searchText.trim() && !selectedImage)}
          className="w-full py-3 px-4 text-white font-bold text-sm sm:text-base rounded-xl shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 shadow-teal-800/20 select-none"
        >
          {isLoading || isProcessingImage ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {selectedImage
                  ? "Analisando Foto da Receita / Remédio com IA..."
                  : "Consultando Informações, Remédio e SUS..."}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-teal-200" />
              <span>
                {selectedImage
                  ? "Consultar Remédio da Fotografia"
                  : "Consultar Remédio ou Sintoma"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Quick Suggestions - Remédios e Sintomas */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 space-y-2">
        {/* Remédios frequentes */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Pill className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Remédios frequentes:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_MEDICINES.map((med) => (
              <button
                key={med.name}
                id={`quick-medicine-${med.name.toLowerCase()}`}
                type="button"
                onClick={() => handleQuickItem(med.name)}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50/90 dark:bg-slate-700/80 text-teal-900 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-950/70 border border-teal-200/80 dark:border-slate-600 transition-all duration-150 active:scale-95 cursor-pointer select-none"
              >
                <span>{med.name}</span>
                <span className="text-[10px] text-teal-700/70 dark:text-teal-400/80 font-normal">
                  ({med.hint.split("/")[0].trim()})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sintomas comuns */}
        <div>
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Ou consulte por sintoma:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SYMPTOMS.map((example) => (
              <button
                key={example.title}
                id={`quick-symptom-${example.title.toLowerCase().replace(/\s+/g, "-")}`}
                type="button"
                onClick={() => handleQuickItem(example.title)}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all duration-150 active:scale-95 cursor-pointer select-none"
              >
                <span>{example.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
