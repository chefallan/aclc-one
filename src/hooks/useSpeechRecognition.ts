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
  const streamRef = useRef<MediaStream | null>(null);
  isListeningRef.current = isListening;

  useEffect(() => {
    setSupported(!!getSRClass());
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      }
    } catch (_) {}
    recognitionRef.current = null;

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      streamRef.current = null;
    }

    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const startListening = useCallback(async () => {
    const SRC = getSRClass();
    if (!SRC) {
      setPermissionError("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    stopListening();
    setPermissionError(null);
    setTranscript("");
    setInterimTranscript("");

    // Step 1: Explicitly request hardware microphone permission if available
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        // Keep stream alive or release tracks so SpeechRecognition can access mic
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    } catch (micErr: any) {
      console.warn("Microphone hardware access warning:", micErr);
      if (micErr.name === "NotAllowedError" || micErr.name === "PermissionDeniedError") {
        setPermissionError("Microphone access is blocked. Click the lock/tune icon in the browser address bar to allow microphone.");
        return;
      }
    }

    // Step 2: Initialize Web Speech Recognition
    try {
      const recognition = new SRC();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setPermissionError(null);
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
        if (event.error === "not-allowed") {
          setPermissionError("Microphone permission needed. Click the site settings in your URL bar to allow microphone.");
          stopListening();
        } else if (event.error === "service-not-allowed") {
          setPermissionError("Speech recognition service temporarily unavailable in browser. Type your answer to test recall.");
          stopListening();
        } else if (event.error === "network") {
          setPermissionError("Voice service offline. Type your answer directly.");
          stopListening();
        } else if (event.error === "no-speech") {
          // Ignore silence timeout
        } else if (event.error !== "aborted") {
          setPermissionError("Microphone stopped. Tap to try again.");
          stopListening();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
        isListeningRef.current = false;
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsListening(true);
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setPermissionError(err?.message || "Could not start microphone.");
      setIsListening(false);
      isListeningRef.current = false;
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
