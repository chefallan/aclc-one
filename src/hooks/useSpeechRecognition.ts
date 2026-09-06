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

// Continuous mode re-delivers finalized segments; deduplicate overlap
function dedupeOverlap(prev: string, next: string): string {
  const prevWords = prev.trim() ? prev.trim().split(/\s+/) : [];
  const nextWords = next.trim() ? next.trim().split(/\s+/) : [];
  if (!nextWords.length) return "";
  if (!prevWords.length) return next.trim();
  for (let n = Math.min(prevWords.length, nextWords.length); n >= 1; n--) {
    if (prevWords.slice(-n).join(" ") === nextWords.slice(0, n).join(" ")) {
      return nextWords.slice(n).join(" ");
    }
  }
  return next.trim();
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [supported, setSupported] = useState(false);

  const activeRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const userStoppedRef = useRef(false);
  const lastFinalRef = useRef("");
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setSupported(!!getSRClass());
  }, []);

  const stopListening = useCallback(() => {
    userStoppedRef.current = true;
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript("");

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      if (activeRef.current) {
        activeRef.current.onresult = null;
        activeRef.current.onerror = null;
        activeRef.current.onend = null;
        activeRef.current.stop();
      }
    } catch (_) {}
    activeRef.current = null;
  }, []);

  const createAndStartRecognition = useCallback(() => {
    const SRC = getSRClass();
    if (!SRC) return;

    try {
      const r = new SRC();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-US";
      r.maxAlternatives = 1;

      r.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      r.onresult = (event: any) => {
        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) final += t + " ";
          else interim += t;
        }

        if (final) {
          const deduped = dedupeOverlap(lastFinalRef.current, final);
          if (deduped) {
            setTranscript((prev) => (prev + " " + deduped).trim());
          }
          lastFinalRef.current = final.trim();
        }
        setInterimTranscript(interim);
      };

      r.onerror = (e: any) => {
        console.warn("Speech recognition event:", e.error);
        if (e.error === "not-allowed" || e.error === "audio-capture") {
          userStoppedRef.current = true;
          isListeningRef.current = false;
          setIsListening(false);
        }
        // For 'no-speech' or 'aborted', let onend handle continuous listening
      };

      r.onend = () => {
        if (!userStoppedRef.current && isListeningRef.current) {
          // Restart a fresh instance seamlessly without freezing
          try {
            createAndStartRecognition();
          } catch (_) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          setInterimTranscript("");
        }
      };

      r.start();
      activeRef.current = r;
      isListeningRef.current = true;
      setIsListening(true);
    } catch (err: any) {
      if (!err?.message?.includes("already started")) {
        console.error("Speech recognition start error:", err);
        setIsListening(false);
        isListeningRef.current = false;
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (isListeningRef.current) return;
    userStoppedRef.current = false;
    isListeningRef.current = true;
    setIsListening(true);
    setTranscript("");
    setInterimTranscript("");
    lastFinalRef.current = "";

    createAndStartRecognition();

    // Max 30 seconds listening session
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (isListeningRef.current) {
        stopListening();
      }
    }, 30000);
  }, [createAndStartRecognition, stopListening]);

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
    startListening,
    stopListening,
    toggleListening,
    setTranscript,
  };
}
