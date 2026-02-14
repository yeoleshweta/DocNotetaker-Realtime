"use client";

import React, { useState } from "react";

interface NoteSection {
  title: string;
  content: string;
  confidence: number;
}

interface NoteCanvasProps {
  sections: NoteSection[];
  onEdit?: (index: number, content: string) => void;
}

export default function NoteCanvas({ sections, onEdit }: NoteCanvasProps) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const toggleSection = (index: number) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  if (sections.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <h3>No Note Generated Yet</h3>
        <p>
          Record a conversation or paste a transcript to generate a structured
          clinical note.
        </p>
      </div>
    );
  }

  return (
    <div>
      {sections.map((section, i) => (
        <div key={i} className="note-section">
          <div className="note-section-header" onClick={() => toggleSection(i)}>
            <div className="note-section-title">
              <span
                className={`collapse-icon ${collapsed[i] ? "collapsed" : ""}`}
              >
                ▼
              </span>
              {section.title}
            </div>
            <div className="note-section-confidence">
              Confidence: {section.confidence}%
            </div>
          </div>
          <div
            className={`note-section-body ${collapsed[i] ? "collapsed" : ""}`}
          >
            <div
              contentEditable={!!onEdit}
              suppressContentEditableWarning
              onBlur={(e) => onEdit?.(i, e.currentTarget.textContent || "")}
              dangerouslySetInnerHTML={{
                __html: section.content.replace(
                  /\[VERIFY\]/g,
                  '<span class="verify-tag">[VERIFY]</span>',
                ),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper to parse a generated note into sections
export function parseNoteIntoSections(
  note: string,
  template: string,
): NoteSection[] {
  const sections: NoteSection[] = [];

  const sectionHeaders: Record<string, string[]> = {
    soap: ["SUBJECTIVE", "OBJECTIVE", "ASSESSMENT", "PLAN"],
    hp: [
      "CHIEF COMPLAINT",
      "HISTORY OF PRESENT ILLNESS",
      "PAST MEDICAL HISTORY",
      "FAMILY HISTORY",
      "SOCIAL HISTORY",
      "MEDICATIONS",
      "ALLERGIES",
      "REVIEW OF SYSTEMS",
      "PHYSICAL EXAM",
      "ASSESSMENT",
      "PLAN",
    ],
    consult: [
      "REASON FOR CONSULTATION",
      "HISTORY OF PRESENT ILLNESS",
      "RELEVANT PAST HISTORY",
      "MEDICATIONS",
      "PHYSICAL EXAM",
      "DIAGNOSTIC REVIEW",
      "ASSESSMENT",
      "RECOMMENDATIONS",
    ],
    procedure: [
      "PROCEDURE",
      "INDICATION",
      "CONSENT",
      "ANESTHESIA",
      "TECHNIQUE",
      "FINDINGS",
      "COMPLICATIONS",
      "DISPOSITION",
    ],
  };

  const headers = sectionHeaders[template] || sectionHeaders.soap;

  // Try to split the note by headers
  let remainingText = note;
  const foundSections: { title: string; start: number }[] = [];

  for (const header of headers) {
    const patterns = [
      new RegExp(`\\*\\*${header}:?\\*\\*`, "i"),
      new RegExp(`^#+\\s*${header}:?`, "im"),
      new RegExp(`^${header}:`, "im"),
    ];

    for (const pattern of patterns) {
      const match = note.match(pattern);
      if (match && match.index !== undefined) {
        foundSections.push({ title: header, start: match.index });
        break;
      }
    }
  }

  // Sort by position
  foundSections.sort((a, b) => a.start - b.start);

  if (foundSections.length > 0) {
    for (let i = 0; i < foundSections.length; i++) {
      const start = foundSections[i].start;
      const end =
        i + 1 < foundSections.length ? foundSections[i + 1].start : note.length;
      let content = note.slice(start, end).trim();

      // Remove the header line itself
      const firstNewline = content.indexOf("\n");
      if (firstNewline > 0) {
        content = content.slice(firstNewline).trim();
      }

      sections.push({
        title: foundSections[i].title,
        content,
        confidence: Math.floor(Math.random() * 10) + 88, // Demo: 88-97%
      });
    }
  } else {
    // Fallback: single section
    sections.push({
      title: "CLINICAL NOTE",
      content: note,
      confidence: 90,
    });
  }

  return sections;
}
