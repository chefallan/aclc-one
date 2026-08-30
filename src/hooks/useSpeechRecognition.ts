import { useState, useCallback, useRef, useEffect } from "react";

const getSRClass = () => {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition ||
    null
  );
};

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  isListeningRef.current = isListening;

  useEffect(() => {
    setSupported(!!getSRClass());
  }, []);

  const stopListening = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      }
    } catch (_) {}
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const startListening = useCallback(() => {
    const SRC = getSRClass();
    if (!SRC) {
      setPermissionError("Speech recognition is not supported in this browser.");
      return;
    }

    stopListening();
    setPermissionError(null);
    setTranscript("");
    setInterimTranscript("");

    try {
      const recognition = new SRC();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalChunk = "";
        let interimChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            finalChunk += t + " ";
          } else {
            interimChunk += t;
          }
        }

        if (finalChunk) {
          setTranscript((prev) => (prev + " " + finalChunk).trim());
        }
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setPermissionError("Microphone permission denied. Please allow microphone access in browser settings.");
          stopListening();
        } else if (event.error === "no-speech") {
          // keep listening
        } else if (event.error !== "aborted") {
          stopListening();
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (_) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          setInterimTranscript("");
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setPermissionError(err?.message || "Failed to start microphone.");
      setIsListening(false);
    }
  }, [stopListening]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    transcript,
    interimTranscript,
    supported,
    permissionError,
    startListening,
    stopListening,
    toggleListening,
    setTranscript,
  };
}
