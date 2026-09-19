"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Sensor } from "@/lib/api";
import Navbar from "../components/Navbar";

export default function SensorsPage() {
  const router = useRouter();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    
    api.getSensors(token)
      .then((sensorsData) => {
        setSensors(sensorsData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load sensors.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return <main style={{ padding: 32 }}>Loading sensors...</main>;
  }

  if (error) {
    return <main style={{ padding: 32, color: "#991b1b" }}>{error}</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <Navbar />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 24 }}>
        <h1 style={{ margin: 0 }}>Sensors</h1>
      </div>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
        <h2 style={{ marginTop: 0 }}>Sensor List</h2>
        {sensors.length === 0 ? (
          <p>No sensors found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: 12 }}>ID</th>
                <th style={{ padding: 12 }}>Sensor Code</th>
                <th style={{ padding: 12 }}>Shipment ID</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Created At</th>
                <th style={{ padding: 12 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 12 }}>{s.id}</td>
                  <td style={{ padding: 12 }}>{s.sensor_code}</td>
                  <td style={{ padding: 12 }}>{s.shipment_id}</td>
                  <td style={{ padding: 12 }}>{s.status}</td>
                  <td style={{ padding: 12 }}>{new Date(s.created_at).toLocaleString()}</td>
                  <td style={{ padding: 12 }}>
                    <Link href={`/sensors/${s.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
