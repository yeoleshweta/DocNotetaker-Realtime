"use client";

import React, { useState, useEffect } from "react";

export default function SettingsPage() {
  const [defaultTemplate, setDefaultTemplate] = useState("soap");
  const [defaultSpecialty, setDefaultSpecialty] = useState("general");
  const [sttProvider, setSttProvider] = useState("groq");
  const [autoSave, setAutoSave] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const settings = localStorage.getItem("medscribe_settings");
    if (settings) {
      const parsed = JSON.parse(settings);
      setDefaultTemplate(parsed.defaultTemplate || "soap");
      setDefaultSpecialty(parsed.defaultSpecialty || "general");
      setSttProvider(parsed.sttProvider || "groq");
      setAutoSave(parsed.autoSave !== false);
      setShowConfidence(parsed.showConfidence !== false);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(
      "medscribe_settings",
      JSON.stringify({
        defaultTemplate,
        defaultSpecialty,
        sttProvider,
        autoSave,
        showConfidence,
      }),
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your default preferences and system options.</p>
      </div>

      <div className="settings-grid">
        {/* Clinical Defaults */}
        <div className="settings-section">
          <h2>📋 Clinical Defaults</h2>

          <div
            className="settings-row"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: "var(--space-sm)",
            }}
          >
            <label>Default Note Template</label>
            <select
              className="form-select"
              value={defaultTemplate}
              onChange={(e) => setDefaultTemplate(e.target.value)}
            >
              <option value="soap">SOAP Note</option>
              <option value="hp">History & Physical</option>
              <option value="consult">Consultation Note</option>
              <option value="procedure">Procedure Note</option>
            </select>
          </div>

          <div
            className="settings-row"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: "var(--space-sm)",
            }}
          >
            <label>Default Specialty</label>
            <select
              className="form-select"
              value={defaultSpecialty}
              onChange={(e) => setDefaultSpecialty(e.target.value)}
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
          </div>
        </div>

        {/* System Configuration */}
        <div className="settings-section">
          <h2>⚙️ System Configuration</h2>

          <div
            className="settings-row"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: "var(--space-sm)",
            }}
          >
            <label>Speech-to-Text Provider</label>
            <select
              className="form-select"
              value={sttProvider}
              onChange={(e) => setSttProvider(e.target.value)}
            >
              <option value="groq">
                Groq Whisper API (Cloud — Recommended)
              </option>
              <option value="local">Local Faster-Whisper (CPU)</option>
            </select>
          </div>

          <div className="settings-row">
            <div>
              <label>Auto-Save Notes</label>
              <span style={{ display: "block" }}>
                Automatically save notes after generation
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="settings-row">
            <div>
              <label>Show Confidence Scores</label>
              <span style={{ display: "block" }}>
                Display AI confidence for each section
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={showConfidence}
                onChange={(e) => setShowConfidence(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* API Status */}
        <div className="settings-section">
          <h2>🔌 API Connection</h2>

          <div className="settings-row">
            <label>Backend URL</label>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--primary-400)",
              }}
            >
              localhost:8000
            </span>
          </div>

          <div className="settings-row">
            <label>AI Model</label>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
              gemma2-9b-it
            </span>
          </div>

          <div className="settings-row">
            <label>STT Model</label>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
              whisper-large-v3
            </span>
          </div>

          <div className="settings-row">
            <label>Status</label>
            <span
              style={{ color: "var(--success)", fontWeight: 600, fontSize: 13 }}
            >
              ● Connected
            </span>
          </div>
        </div>

        {/* Account */}
        <div className="settings-section">
          <h2>👤 Account</h2>

          <div className="settings-row">
            <label>Role</label>
            <span style={{ fontSize: 13 }}>Physician</span>
          </div>

          <div className="settings-row">
            <label>Session Timeout</label>
            <span style={{ fontSize: 13 }}>30 minutes</span>
          </div>

          <div style={{ marginTop: "var(--space-md)" }}>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                localStorage.removeItem("medscribe_token");
                localStorage.removeItem("medscribe_user");
                window.location.href = "/login";
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div
        style={{
          marginTop: "var(--space-xl)",
          display: "flex",
          gap: "var(--space-md)",
          alignItems: "center",
        }}
      >
        <button className="btn btn-primary" onClick={handleSave}>
          💾 Save Settings
        </button>
        {saved && (
          <span
            style={{ color: "var(--success)", fontSize: 14, fontWeight: 500 }}
          >
            ✓ Settings saved
          </span>
        )}
      </div>
    </div>
  );
}
