"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, AuthUserResponse } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    api
      .me(token)
      .then((data) => {
        setUser(data);
      })
      .catch((err) => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token_type");
        setError(err instanceof Error ? err.message : "Session expired.");
        router.replace("/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    router.replace("/login");
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Loading user profile...</main>;
  }

  if (error) {
    return <main style={{ padding: 32, color: "#991b1b" }}>{error}</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>
          Logout
        </button>
      </header>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
        <h2 style={{ marginTop: 0 }}>Authenticated user</h2>
        <p><strong>ID:</strong> {user?.id}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>Status:</strong> {user?.is_active ? "Active" : "Inactive"}</p>
      </section>
    </main>
  );
}
