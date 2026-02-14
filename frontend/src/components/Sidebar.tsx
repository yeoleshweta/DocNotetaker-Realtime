"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/", icon: "📊" },
  { label: "New Encounter", href: "/encounter/new", icon: "🎙️" },
  { label: "Zen Mode", href: "/zen", icon: "🧘" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Don't show sidebar on login page
  if (pathname === "/login") return null;

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
        <span style={{ fontWeight: 700, fontSize: 18 }}>MedScribe</span>
        <div style={{ width: 40 }} />
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">🏥</div>
          <div className="sidebar-brand">
            <h1>MedScribe</h1>
            <span>AI Clinical Scribe</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname === item.href ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div
            className="sidebar-section-label"
            style={{ marginTop: "var(--space-md)" }}
          >
            Recent Notes
          </div>
          <div
            style={{
              padding: "0 var(--space-md)",
              fontSize: 13,
              color: "var(--text-tertiary)",
            }}
          >
            No recent encounters
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <div className="status-dot" />
            <span>System Ready</span>
          </div>
        </div>
      </aside>
    </>
  );
}
