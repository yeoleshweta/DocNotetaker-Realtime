"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Pulse from "@/components/Pulse";
import { apiRequest, WS_BASE } from "@/lib/api";

type ZenState = "idle" | "recording" | "processing" | "generating" | "complete";

export default function ZenModePage() {
  const [state, setState] = useState<ZenState>("idle");
  const [noteText, setNoteText] = useState("");
  const [timer, setTimer] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await processRecording(blob);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setState("recording");
      setTimer(0);
      setNoteText("");

      timerRef.current = setInterval(() => setTimer((p) => p + 1), 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const processRecording = async (blob: Blob) => {
    setState("processing");

    try {
      // Transcribe
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const transcribeRes = await apiRequest("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error("Transcription failed");
      const { transcript } = await transcribeRes.json();

      // Stream note generation
      setState("generating");
      setNoteText("");

      try {
        const ws = new WebSocket(`${WS_BASE}/ws/stream-note`);

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              transcript,
              template: "soap",
              specialty: "general",
            }),
          );
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.done) {
            setState("complete");
            ws.close();
          } else if (data.token) {
            setNoteText((prev) => prev + data.token);
          } else if (data.error) {
            console.error("WS error:", data.error);
            setState("complete");
            ws.close();
          }
        };

        ws.onerror = async () => {
          // Fallback to REST if WebSocket fails
          ws.close();
          const noteRes = await apiRequest("/api/generate-note", {
            method: "POST",
            body: JSON.stringify({
              transcript,
              template: "soap",
              specialty: "general",
            }),
          });

          if (noteRes.ok) {
            const noteData = await noteRes.json();
            setNoteText(noteData.note);
          }
          setState("complete");
        };
      } catch {
        // REST fallback
        const noteRes = await apiRequest("/api/generate-note", {
          method: "POST",
          body: JSON.stringify({
            transcript,
            template: "soap",
            specialty: "general",
          }),
        });

        if (noteRes.ok) {
          const noteData = await noteRes.json();
          setNoteText(noteData.note);
        }
        setState("complete");
      }
    } catch (err) {
      console.error("Processing error:", err);
      setState("idle");
    }
  };

  const handleMainAction = () => {
    if (state === "idle" || state === "complete") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  };

  const exitZen = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    window.history.back();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const pulseState =
    state === "recording"
      ? "recording"
      : state === "processing"
        ? "processing"
        : state === "generating"
          ? "generating"
          : "idle";

  return (
    <div className="zen-container">
      {/* Exit Button */}
      <button
        onClick={exitZen}
        className="btn btn-ghost"
        style={{
          position: "absolute",
          top: "var(--space-lg)",
          right: "var(--space-lg)",
        }}
      >
        ✕ Exit Zen
      </button>

      {/* Pulse */}
      <Pulse state={pulseState} size="lg" />

      {/* Timer or Status */}
      {state === "recording" && (
        <div
          className="recording-timer"
          style={{ marginTop: "var(--space-lg)" }}
        >
          {formatTime(timer)}
        </div>
      )}

      {/* Note Output */}
      {noteText && (
        <div
          className={`zen-note-output ${state === "generating" ? "typewriter-cursor" : ""}`}
        >
          {noteText}
        </div>
      )}

      {/* Main Action Button */}
      <button
        className={`btn ${state === "recording" ? "btn-danger" : "btn-primary"} btn-lg`}
        onClick={handleMainAction}
        disabled={state === "processing" || state === "generating"}
        style={{ marginTop: "var(--space-xl)" }}
      >
        {state === "idle" && "🎙️ Start Recording"}
        {state === "recording" && "⏹ Stop Recording"}
        {state === "processing" && "⏳ Transcribing..."}
        {state === "generating" && "✨ Generating..."}
        {state === "complete" && "🎙️ New Recording"}
      </button>

      {/* Copy button when complete */}
      {state === "complete" && noteText && (
        <button
          className="btn btn-secondary"
          style={{ marginTop: "var(--space-sm)" }}
          onClick={() => navigator.clipboard.writeText(noteText)}
        >
          📋 Copy Note
        </button>
      )}
    </div>
  );
}
