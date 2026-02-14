"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (!isLogin) body.full_name = fullName;

      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Authentication failed");
      }

      const data = await response.json();
      localStorage.setItem("medscribe_token", data.access_token);
      localStorage.setItem(
        "medscribe_user",
        JSON.stringify({
          role: data.role,
          full_name: data.full_name,
        }),
      );

      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Allow bypassing login for dev
  const handleDevBypass = () => {
    localStorage.setItem("medscribe_token", "dev-token");
    localStorage.setItem(
      "medscribe_user",
      JSON.stringify({
        role: "physician",
        full_name: "Dev Doctor",
      }),
    );
    router.push("/");
  };

  return (
    <div
      className="login-container"
      style={{ marginLeft: 0, maxWidth: "100vw" }}
    >
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏥</div>
          <h1>MedScribe</h1>
          <p>Ambient AI Clinical Intelligence</p>
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
              marginBottom: "var(--space-md)",
            }}
          >
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Jane Smith"
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "var(--space-lg)" }}>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            style={{ fontSize: 13 }}
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            marginTop: "var(--space-lg)",
            paddingTop: "var(--space-lg)",
            textAlign: "center",
          }}
        >
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDevBypass}
            style={{ fontSize: 12 }}
          >
            🔧 Dev Mode — Skip Login
          </button>
        </div>
      </div>
    </div>
  );
}
