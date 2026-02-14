"use client";

import React from "react";

interface PulseProps {
  state: "idle" | "recording" | "processing" | "generating";
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { container: 60, core: 24, rings: [36, 48, 60] },
  md: { container: 120, core: 48, rings: [72, 96, 120] },
  lg: { container: 180, core: 64, rings: [100, 140, 180] },
};

const stateLabels = {
  idle: "Ready",
  recording: "Recording...",
  processing: "Transcribing...",
  generating: "Generating Note...",
};

export default function Pulse({ state, size = "md" }: PulseProps) {
  const dims = sizeMap[size];

  return (
    <div
      className="pulse-container"
      style={{ flexDirection: "column", gap: 12 }}
    >
      <div
        className={`pulse ${state}`}
        style={{ width: dims.container, height: dims.container }}
      >
        <div
          className="pulse-core"
          style={{ width: dims.core, height: dims.core }}
        />
        {dims.rings.map((r, i) => (
          <div key={i} className="pulse-ring" style={{ width: r, height: r }} />
        ))}
      </div>
      <span
        style={{
          fontSize: size === "sm" ? 11 : 13,
          color: "var(--text-tertiary)",
          fontWeight: 500,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        {stateLabels[state]}
      </span>
    </div>
  );
}
