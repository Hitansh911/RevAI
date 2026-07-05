"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, RotateCcw, CheckCircle } from "lucide-react";

interface VoiceRecorderProps {
  onTranscriptReady: (transcript: string) => void;
  disabled?: boolean;
}

// Extend Window for Safari
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceRecorder({ onTranscriptReady, disabled }: VoiceRecorderProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [done, setDone] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interimText += r[0].transcript;
      }
      setTranscript(finalText);
      setInterim(interimText);
    };

    recognition.onend = () => {
      setRecording(false);
      setInterim("");
    };

    recognition.onerror = () => {
      setRecording(false);
      setInterim("");
    };

    recognition.start();
    setRecording(true);
    setDone(false);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
    setInterim("");
  };

  const handleConfirm = () => {
    const finalText = transcript.trim();
    if (finalText) {
      setDone(true);
      onTranscriptReady(finalText);
    }
  };

  const handleReset = () => {
    setTranscript("");
    setInterim("");
    setDone(false);
    setRecording(false);
    recognitionRef.current?.stop();
  };

  // ── Unsupported fallback ──────────────────────────────────
  if (supported === false) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        <p style={{ fontSize: ".8rem", color: "#9ca3af", textAlign: "center" }}>
          🎤 Voice not supported in this browser. Type your feedback below:
        </p>
        <textarea
          rows={5}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Tell us about your experience…"
          style={{
            width: "100%",
            padding: ".75rem",
            border: "1.5px solid #e5e7eb",
            borderRadius: "1rem",
            fontSize: ".9rem",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.6,
          }}
        />
        <button
          onClick={handleConfirm}
          disabled={!transcript.trim()}
          style={{
            padding: ".75rem 1.5rem",
            background: transcript.trim() ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : "#e5e7eb",
            color: transcript.trim() ? "white" : "#9ca3af",
            border: "none",
            borderRadius: "999px",
            fontWeight: 700,
            fontSize: ".9rem",
            cursor: transcript.trim() ? "pointer" : "not-allowed",
          }}
        >
          Use This Feedback
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: .8; } 50% { transform: scale(1.12); opacity: 1; } }
        @keyframes ripple {
          0%   { transform: scale(1); opacity: .4; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      {/* Mic button */}
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {recording && (
          <>
            <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "2px solid #ef4444", animation: "ripple 1.2s ease-out infinite" }} />
            <div style={{ position: "absolute", inset: -16, borderRadius: "50%", border: "2px solid #fca5a5", animation: "ripple 1.2s .4s ease-out infinite" }} />
          </>
        )}
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={disabled || done}
          aria-label={recording ? "Stop recording" : "Start recording"}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: "none",
            background: done
              ? "linear-gradient(135deg,#10b981,#059669)"
              : recording
              ? "linear-gradient(135deg,#ef4444,#dc2626)"
              : "linear-gradient(135deg,#7c3aed,#6d28d9)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: disabled || done ? "default" : "pointer",
            boxShadow: recording
              ? "0 8px 24px rgba(239,68,68,.4)"
              : "0 8px 24px rgba(109,40,217,.35)",
            animation: recording ? "pulse 1.2s ease-in-out infinite" : "none",
            transition: "background .2s, box-shadow .2s",
          }}
        >
          {done ? <CheckCircle size={28} /> : recording ? <MicOff size={28} /> : <Mic size={28} />}
        </button>
      </div>

      <p style={{ fontSize: ".85rem", fontWeight: 600, color: recording ? "#ef4444" : "#6b7280" }}>
        {done ? "Transcript confirmed ✓" : recording ? "Recording… tap to stop" : "Tap to record your feedback"}
      </p>

      {/* Live transcript + interim */}
      {(transcript || interim) && (
        <div
          style={{
            width: "100%",
            background: "#f9fafb",
            border: "1.5px solid #e5e7eb",
            borderRadius: "1rem",
            padding: "1rem",
            minHeight: 80,
            fontSize: ".88rem",
            lineHeight: 1.65,
            color: "#374151",
          }}
        >
          <span>{transcript}</span>
          <span style={{ color: "#9ca3af" }}>{interim}</span>
        </div>
      )}

      {/* Action buttons */}
      {!recording && transcript && !done && (
        <div style={{ display: "flex", gap: ".75rem", width: "100%" }}>
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: ".7rem",
              background: "#f3f4f6",
              border: "none",
              borderRadius: "999px",
              fontWeight: 600,
              fontSize: ".85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: ".4rem",
              color: "#6b7280",
            }}
          >
            <RotateCcw size={14} /> Redo
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 2,
              padding: ".7rem",
              background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
              border: "none",
              borderRadius: "999px",
              fontWeight: 700,
              fontSize: ".85rem",
              cursor: "pointer",
              color: "white",
              boxShadow: "0 4px 16px rgba(109,40,217,.3)",
            }}
          >
            Use This Transcript →
          </button>
        </div>
      )}
    </div>
  );
}
