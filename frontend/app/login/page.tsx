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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>ColdChain Trace</h1>
        <p style={{ marginTop: 0, marginBottom: 24, color: "#4b5563" }}>Sign in to continue</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          {error ? (
            <div style={{ background: "#fef2f2", color: "#991b1b", padding: 10, borderRadius: 8 }}>{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 16px",
              border: 0,
              borderRadius: 8,
              background: loading ? "#94a3b8" : "#111827",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}
