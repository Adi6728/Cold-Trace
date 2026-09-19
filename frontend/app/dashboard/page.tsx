"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, AuthUserResponse } from "@/lib/api";
import Navbar from "../components/Navbar";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  
  const [counts, setCounts] = useState({
    products: 0,
    batches: 0,
    shipments: 0,
    sensors: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    Promise.all([
      api.me(token),
      api.getProducts(token).catch(() => []),
      api.getBatches(token).catch(() => []),
      api.getShipments(token).catch(() => []),
      api.getSensors(token).catch(() => [])
    ])
      .then(([userData, productsData, batchesData, shipmentsData, sensorsData]) => {
        setUser(userData);
        setCounts({
          products: productsData.length,
          batches: batchesData.length,
          shipments: shipmentsData.length,
          sensors: sensorsData.length,
        });
      })
      .catch((err) => {
        if (err.message.includes("401") || err.message.includes("expired")) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("token_type");
          router.replace("/login");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return <main style={{ padding: 32 }}>Loading dashboard...</main>;
  }

  if (error) {
    return <main style={{ padding: 32, color: "#991b1b" }}>{error}</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <Navbar />

      <h1 style={{ marginTop: 24, marginBottom: 24 }}>Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 8px 0", color: "#6b7280" }}>Products</h3>
          <div style={{ fontSize: 32, fontWeight: "bold", color: "#111827" }}>{counts.products}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 8px 0", color: "#6b7280" }}>Batches</h3>
          <div style={{ fontSize: 32, fontWeight: "bold", color: "#111827" }}>{counts.batches}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 8px 0", color: "#6b7280" }}>Shipments</h3>
          <div style={{ fontSize: 32, fontWeight: "bold", color: "#111827" }}>{counts.shipments}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 8px 0", color: "#6b7280" }}>Sensors</h3>
          <div style={{ fontSize: 32, fontWeight: "bold", color: "#111827" }}>{counts.sensors}</div>
        </div>
      </div>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
        <h2 style={{ marginTop: 0 }}>Authenticated User</h2>
        <p><strong>ID:</strong> {user?.id}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>Status:</strong> {user?.is_active ? "Active" : "Inactive"}</p>
      </section>
    </main>
  );
}
