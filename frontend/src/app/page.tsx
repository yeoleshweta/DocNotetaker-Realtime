"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Pulse from "@/components/Pulse";

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>{greeting}, Doctor</h1>
        <p>Your ambient AI clinical documentation assistant is ready.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: "var(--space-xl)" }}>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-value">0</div>
          <div className="stat-label">Notes Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">0m</div>
          <div className="stat-label">Time Saved</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎙️</div>
          <div className="stat-value">0</div>
          <div className="stat-label">Encounters</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">—</div>
          <div className="stat-label">Avg Confidence</div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: "var(--space-md)",
          color: "var(--text-primary)",
        }}
      >
        Quick Actions
      </h2>
      <div className="action-grid" style={{ marginBottom: "var(--space-xl)" }}>
        <Link href="/encounter/new" className="action-card">
          <div className="action-icon teal">🎙️</div>
          <div className="action-text">
            <h3>New Encounter</h3>
            <p>Start recording a patient visit</p>
          </div>
        </Link>

        <Link href="/zen" className="action-card">
          <div className="action-icon purple">🧘</div>
          <div className="action-text">
            <h3>Zen Mode</h3>
            <p>Distraction-free recording</p>
          </div>
        </Link>

        <Link href="/encounter/new" className="action-card">
          <div className="action-icon blue">📋</div>
          <div className="action-text">
            <h3>Paste Transcript</h3>
            <p>Generate note from text</p>
          </div>
        </Link>

        <Link href="/settings" className="action-card">
          <div className="action-icon amber">⚙️</div>
          <div className="action-text">
            <h3>Settings</h3>
            <p>Configure templates & preferences</p>
          </div>
        </Link>
      </div>

      {/* System Status */}
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: "var(--space-md)",
          color: "var(--text-primary)",
        }}
      >
        System Status
      </h2>
      <div
        className="glass-card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-xl)",
        }}
      >
        <Pulse state="idle" size="sm" />
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              gap: "var(--space-xl)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  display: "block",
                }}
              >
                AI Model
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Gemma2 9B via Groq
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  display: "block",
                }}
              >
                STT Engine
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Whisper Large v3
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  display: "block",
                }}
              >
                Latency
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--success)",
                }}
              >
                ~500 tok/s
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  display: "block",
                }}
              >
                Status
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--success)",
                }}
              >
                ● Online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Encounters */}
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          margin: "var(--space-xl) 0 var(--space-md)",
          color: "var(--text-primary)",
        }}
      >
        Recent Encounters
      </h2>
      <div className="empty-state" style={{ padding: "var(--space-2xl)" }}>
        <div className="empty-icon">📁</div>
        <h3>No Encounters Yet</h3>
        <p>
          Your documented encounters will appear here. Start your first
          recording to begin.
        </p>
        <Link
          href="/encounter/new"
          className="btn btn-primary"
          style={{ marginTop: "var(--space-md)" }}
        >
          Start First Encounter
        </Link>
      </div>
    </div>
  );
}
