"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";

const ROLES = [
  "USER",
  "MANUFACTURER",
  "LOGISTICS",
  "WAREHOUSE",
  "HOSPITAL",
  "AUDITOR",
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [adminKey, setAdminKey] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const payload: any = { email, password, role };
      if (role !== "USER") {
        payload.admin_registration_key = adminKey;
        payload.organization_name = organizationName;
      }
      await api.register(payload);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
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
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, textAlign: "center", color: "var(--text-primary)" }}>Create Account</h1>
        <p style={{ marginTop: 0, marginBottom: 32, color: "var(--text-secondary)", textAlign: "center", fontSize: 14 }}>Sign up for ColdChain Trace</p>

        {success ? (
          <div style={{ background: "var(--bg-success)", color: "var(--color-success)", padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid #B7E4C7", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 8px 0" }}>Account Created!</h3>
            <p style={{ margin: 0, fontSize: 14 }}>Redirecting to login...</p>
          </div>
        ) : (
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
                minLength={8}
                style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            {role !== "USER" && (
              <>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Organization Name</span>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    required
                    style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Admin Registration Key (Required for privileged roles)</span>
                  <input
                    type="password"
                    value={adminKey}
                    onChange={(event) => setAdminKey(event.target.value)}
                    required
                    style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
                  />
                </label>
              </>
            )}

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
              {loading ? "Creating Account..." : "Create Account"}
            </button>
            <div style={{ textAlign: "center", fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
              Already have an account? <Link href="/login" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>Log in</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
