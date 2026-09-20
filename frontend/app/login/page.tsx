"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.login(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_type", data.token_type);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg-page)" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: 40, boxShadow: "var(--shadow-md)", border: "1px solid var(--border-light)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, background: "var(--color-primary)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: 20 }}>
            C
          </div>
        </div>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, textAlign: "center", color: "var(--text-primary)" }}>Log in to ColdChain</h1>
        <p style={{ marginTop: 0, marginBottom: 32, color: "var(--text-secondary)", textAlign: "center", fontSize: 14 }}>Enter your credentials to continue</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
            />
          </label>

          {error ? (
            <div style={{ background: "var(--bg-danger)", color: "var(--color-danger)", padding: 12, borderRadius: "var(--radius-sm)", fontSize: 14 }}>
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 16px",
              border: 0,
              borderRadius: "var(--radius-sm)",
              background: loading ? "var(--bg-neutral)" : "var(--color-primary)",
              color: loading ? "var(--text-secondary)" : "white",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s ease",
              marginTop: 8
            }}
          >
            {loading ? "Authenticating..." : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}
