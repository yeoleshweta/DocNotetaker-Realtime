"use client";

import React from "react";
import NoteCanvas, { parseNoteIntoSections } from "@/components/NoteCanvas";

// This page would typically fetch the encounter by ID from the backend.
// For now, it shows a placeholder that demonstrates the note canvas UI.

export default function EncounterDetailPage() {
  // Demo SOAP note to showcase the canvas
  const demoNote = `**SUBJECTIVE:**
CC: "My blood pressure has been running high"
HPI: 58-year-old male presents for follow-up of hypertension. Reports home BP readings averaging 150/90 over the past 2 weeks. Denies headache, chest pain, or visual changes. Reports compliance with current medication regimen. Diet has been "okay" — admits to increased sodium intake during recent holiday season.
ROS:
- Constitutional: Denies fever, chills, weight loss
- Cardiovascular: Denies chest pain, palpitations, edema
- Respiratory: Denies shortness of breath, cough
- Neurological: Denies headache, dizziness, syncope [VERIFY]

Current Medications: Lisinopril 10mg daily, Metformin 1000mg BID
Allergies: NKDA

**OBJECTIVE:**
Vitals: BP 158/92, HR 78, T 98.6°F, SpO2 99% RA
Physical Exam:
- General: Well-appearing male, no acute distress
- Cardiovascular: Regular rate and rhythm, no murmurs
- Lungs: Clear to auscultation bilaterally
- Extremities: No edema

**ASSESSMENT:**
#1 Hypertension, uncontrolled (I10)
#2 Type 2 Diabetes Mellitus, stable (E11.9) [VERIFY]

**PLAN:**
#1 Hypertension:
- Increase Lisinopril 10mg → 20mg daily
- Recheck BP in 2 weeks
- Continue low-sodium diet counseling
- Consider adding HCTZ if not controlled at follow-up

#2 Diabetes:
- Continue Metformin 1000mg BID
- A1c due next visit (last 7.1% three months ago)
- Reinforce dietary modifications`;

  const sections = parseNoteIntoSections(demoNote, "soap");

  return (
    <div>
      <div className="page-header">
        <h1>Encounter Note</h1>
        <p>
          This is a demo note showcasing the canvas UI. In production, notes
          load from saved encounters.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--space-md)",
          marginBottom: "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        <span className="encounter-template-badge badge-soap">SOAP</span>
        <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          General / Primary Care
        </span>
        <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>•</span>
        <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Demo Encounter
        </span>
      </div>

      <NoteCanvas
        sections={sections}
        onEdit={(i, content) => {
          console.log(`Section ${i} edited:`, content);
        }}
      />

      <div className="export-panel" style={{ marginTop: "var(--space-lg)" }}>
        <button
          className="btn btn-primary"
          onClick={() => navigator.clipboard.writeText(demoNote)}
        >
          📋 Copy to Clipboard
        </button>
        <button className="btn btn-secondary">📄 Export PDF</button>
        <button className="btn btn-secondary">👤 Patient Summary</button>
      </div>
    </div>
  );
}
