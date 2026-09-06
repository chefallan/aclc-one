import { useState, useCallback, useRef, useEffect } from "react";

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const [micActive, setMicActive] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSupported(!!SR || !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
    }
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setMicActive(false);
    setInterimTranscript("");

    // Stop and clean up recognition
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    } catch (_) {}
    recognitionRef.current = null;

    // Release microphone hardware tracks
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Clean up previous instance
    stopListening();

    // 1. Acquire and lock active microphone audio stream
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setMicActive(true);
      }
    } catch (err) {
      console.warn("Could not acquire microphone stream:", err);
    }

    // 2. Start Speech Recognition
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isListeningRef.current = true;
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let final = "";
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              final += res[0].transcript + " ";
            } else {
              interim += res[0].transcript;
            }
          }
          if (final) {
            setTranscript((prev) => (prev + " " + final).trim());
          }
          setInterimTranscript(interim);
        };

        recognition.onerror = (e: any) => {
          console.warn("Speech recognition event:", e.error);
          if (e.error === "not-allowed") {
            stopListening();
          }
        };

        recognition.onend = () => {
          // If the user hasn't explicitly stopped, keep listening active
          if (isListeningRef.current && mediaStreamRef.current?.active) {
            try {
              recognition.start();
            } catch (_) {
              // Ignore already started
            }
          } else {
            setIsListening(false);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        isListeningRef.current = true;
        setIsListening(true);
        return;
      } catch (err) {
        console.warn("Speech recognition init:", err);
      }
    }

    // Fallback: If Web Speech is not present, microphone is still actively recording
    isListeningRef.current = true;
    setIsListening(true);
  }, [stopListening]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current || isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening: isListening || micActive,
    transcript,
    interimTranscript,
    supported,
    startListening,
    stopListening,
    toggleListening,
    setTranscript,
  };
}
