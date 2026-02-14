"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import TemplateSelector from "@/components/TemplateSelector";
import AudioRecorder from "@/components/AudioRecorder";
import Pulse from "@/components/Pulse";
import NoteCanvas, { parseNoteIntoSections } from "@/components/NoteCanvas";
import { apiRequest } from "@/lib/api";

type AppState =
  | "setup"
  | "recording"
  | "processing"
  | "generating"
  | "complete";

export default function NewEncounterPage() {
  const router = useRouter();
  const [template, setTemplate] = useState("soap");
  const [specialty, setSpecialty] = useState("general");
  const [appState, setAppState] = useState<AppState>("setup");
  const [transcript, setTranscript] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const pulseState =
    appState === "recording"
      ? "recording"
      : appState === "processing"
        ? "processing"
        : appState === "generating"
          ? "generating"
          : "idle";

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      setAppState("processing");
      setError("");

      try {
        // Step 1: Transcribe
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        const transcribeRes = await apiRequest("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!transcribeRes.ok) throw new Error("Transcription failed");

        const transcribeData = await transcribeRes.json();
        setTranscript(transcribeData.transcript);

        // Step 2: Generate note
        setAppState("generating");

        const noteRes = await apiRequest("/api/generate-note", {
          method: "POST",
          body: JSON.stringify({
            transcript: transcribeData.transcript,
            template,
            specialty,
          }),
        });

        if (!noteRes.ok) throw new Error("Note generation failed");

        const noteData = await noteRes.json();
        setNote(noteData.note);
        setAppState("complete");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setAppState("setup");
      }
    },
    [template, specialty],
  );

  const handleManualSubmit = useCallback(async () => {
    if (!manualTranscript.trim()) return;

    setTranscript(manualTranscript);
    setAppState("generating");
    setError("");

    try {
      const noteRes = await apiRequest("/api/generate-note", {
        method: "POST",
        body: JSON.stringify({
          transcript: manualTranscript,
          template,
          specialty,
        }),
      });

      if (!noteRes.ok) throw new Error("Note generation failed");

      const noteData = await noteRes.json();
      setNote(noteData.note);
      setAppState("complete");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setAppState("setup");
    }
  }, [manualTranscript, template, specialty]);

  const handleCopyNote = () => {
    navigator.clipboard.writeText(note);
  };

  const handleGeneratePatientSummary = async () => {
    try {
      const res = await apiRequest("/api/patient-summary", {
        method: "POST",
        body: JSON.stringify({ transcript, template, specialty }),
      });

      if (!res.ok) throw new Error("Failed to generate patient summary");

      const data = await res.json();
      alert(data.patient_summary || "No summary generated");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleNewEncounter = () => {
    setAppState("setup");
    setTranscript("");
    setManualTranscript("");
    setNote("");
    setError("");
  };

  const sections = note ? parseNoteIntoSections(note, template) : [];

  return (
    <div>
      <div className="page-header">
        <h1>{appState === "complete" ? "Clinical Note" : "New Encounter"}</h1>
        <p>
          {appState === "setup" &&
            "Select a template, then record or paste a transcript."}
          {appState === "recording" && "Recording in progress..."}
          {appState === "processing" && "Transcribing audio..."}
          {appState === "generating" && "Generating clinical note..."}
          {appState === "complete" && "Review, edit, and export your note."}
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "var(--space-md)",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            color: "var(--danger)",
            fontSize: 13,
            marginBottom: "var(--space-lg)",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Pulse Status */}
      {appState !== "setup" && appState !== "complete" && (
        <div style={{ textAlign: "center", margin: "var(--space-2xl) 0" }}>
          <Pulse state={pulseState} size="lg" />
        </div>
      )}

      {/* Setup Phase */}
      {appState === "setup" && (
        <>
          {/* Template Selection */}
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: "var(--space-md)",
              color: "var(--primary-400)",
            }}
          >
            1. Choose Template
          </h2>
          <TemplateSelector selected={template} onSelect={setTemplate} />

          {/* Specialty */}
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              margin: "var(--space-xl) 0 var(--space-md)",
              color: "var(--primary-400)",
            }}
          >
            2. Specialty
          </h2>
          <select
            className="form-select"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            style={{ maxWidth: 320 }}
          >
            <option value="general">General / Primary Care</option>
            <option value="cardiology">Cardiology</option>
            <option value="neurology">Neurology</option>
            <option value="orthopedics">Orthopedics</option>
            <option value="pulmonology">Pulmonology</option>
            <option value="gastroenterology">Gastroenterology</option>
            <option value="psychiatry">Psychiatry</option>
            <option value="emergency">Emergency Medicine</option>
            <option value="pediatrics">Pediatrics</option>
            <option value="surgery">Surgery</option>
          </select>

          {/* Recording */}
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              margin: "var(--space-xl) 0 var(--space-md)",
              color: "var(--primary-400)",
            }}
          >
            3. Record or Paste Transcript
          </h2>
          <div className="glass-card">
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />

            <div
              style={{
                textAlign: "center",
                padding: "var(--space-md) 0",
                color: "var(--text-tertiary)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              — OR —
            </div>

            <div className="form-group">
              <label className="form-label">Paste Transcript</label>
              <textarea
                className="form-input"
                value={manualTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
                placeholder="Paste your clinician-patient conversation transcript here..."
                rows={6}
                style={{ resize: "vertical", fontFamily: "var(--font-sans)" }}
              />
              <button
                className="btn btn-primary"
                onClick={handleManualSubmit}
                disabled={!manualTranscript.trim()}
                style={{
                  alignSelf: "flex-start",
                  marginTop: "var(--space-sm)",
                }}
              >
                Generate Note
              </button>
            </div>
          </div>
        </>
      )}

      {/* Complete Phase — Note Display */}
      {appState === "complete" && (
        <>
          {/* Transcript Preview */}
          {transcript && (
            <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  marginBottom: "var(--space-sm)",
                }}
              >
                TRANSCRIPT
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.8,
                  maxHeight: 120,
                  overflow: "hidden",
                }}
              >
                {transcript}
              </p>
            </div>
          )}

          {/* Note Canvas */}
          <NoteCanvas
            sections={sections}
            onEdit={(i, content) => {
              // In-place editing
              const newSections = [...sections];
              newSections[i] = { ...newSections[i], content };
            }}
          />

          {/* Export Panel */}
          <div
            className="export-panel"
            style={{ marginTop: "var(--space-lg)" }}
          >
            <button className="btn btn-primary" onClick={handleCopyNote}>
              📋 Copy to Clipboard
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleGeneratePatientSummary}
            >
              👤 Patient Summary (AVS)
            </button>
            <button className="btn btn-secondary" onClick={handleNewEncounter}>
              🔄 New Encounter
            </button>
          </div>
        </>
      )}
    </div>
  );
}
