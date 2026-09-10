import { useState, useEffect, useRef, useCallback } from "react";

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({ onResult, onError }: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Erro ao parar reconhecimento de fala:", e);
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg = "Seu navegador não suporta pesquisa por voz. Tente usar o Google Chrome ou digite o texto.";
      setError(msg);
      onError?.(msg);
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      setError(null);
      setTranscript("");

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          currentTranscript += item[0].transcript;
          if (item.isFinal) {
            isFinal = true;
          }
        }

        setTranscript(currentTranscript);
        onResult?.(currentTranscript, isFinal);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        let errorMsg = "Não foi possível reconhecer a voz. Tente novamente.";
        if (event.error === "not-allowed") {
          errorMsg = "Permissão de microfone negada. Permita o acesso ao microfone nas configurações do navegador.";
        } else if (event.error === "no-speech") {
          errorMsg = "Nenhuma fala detectada. Fale mais próximo do microfone.";
        } else if (event.error === "network") {
          errorMsg = "Erro de conexão de rede no reconhecimento de voz.";
        }

        setError(errorMsg);
        setIsListening(false);
        onError?.(errorMsg);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error("Falha ao iniciar reconhecimento:", e);
      const msg = "Erro ao iniciar o microfone. Verifique as permissões do seu navegador.";
      setError(msg);
      setIsListening(false);
      onError?.(msg);
    }
  }, [onError, onResult]);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearError: () => setError(null),
    resetTranscript: () => setTranscript(""),
  };
}
