"use client";

import React from "react";

interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  useCase: string;
}

const templates: Template[] = [
  {
    id: "soap",
    name: "SOAP Note",
    icon: "📋",
    description: "Subjective, Objective, Assessment, Plan",
    useCase: "Standard follow-up visits",
  },
  {
    id: "hp",
    name: "H&P",
    icon: "🏥",
    description: "Complete History & Physical",
    useCase: "New patient / admission",
  },
  {
    id: "consult",
    name: "Consultation",
    icon: "🔍",
    description: "Specialist referral note",
    useCase: "Specialist consultation",
  },
  {
    id: "procedure",
    name: "Procedure Note",
    icon: "🔬",
    description: "Surgical / technical documentation",
    useCase: "Procedures & surgeries",
  },
];

interface TemplateSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

export default function TemplateSelector({
  selected,
  onSelect,
}: TemplateSelectorProps) {
  return (
    <div className="template-grid">
      {templates.map((t) => (
        <button
          key={t.id}
          className={`template-card ${selected === t.id ? "selected" : ""}`}
          onClick={() => onSelect(t.id)}
        >
          <div className="template-icon">{t.icon}</div>
          <h3>{t.name}</h3>
          <p>{t.description}</p>
          <p
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "var(--primary-400)",
              fontWeight: 500,
            }}
          >
            {t.useCase}
          </p>
        </button>
      ))}
    </div>
  );
}
