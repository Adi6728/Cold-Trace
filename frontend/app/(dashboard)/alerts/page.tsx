"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Alert } from "@/lib/api";


export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, [router]);

  async function fetchAlerts() {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    
    setLoading(true);
    try {
      // API Gap Workaround: No global /alerts endpoint exists.
      // We must fetch all shipments first, then fetch alerts for each shipment.
      const shipments = await api.getShipments(token);
      
      const allAlertsPromises = shipments.map(s => 
        api.getShipmentAlerts(token, s.id).catch(() => [] as Alert[])
      );
      
      const alertsArrays = await Promise.all(allAlertsPromises);
      const combinedAlerts = alertsArrays.flat();
      
      // Sort by detected_at descending
      combinedAlerts.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
      
      setAlerts(combinedAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(alertId: number) {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      await api.acknowledgeAlert(token, alertId);
      // Refresh alerts after action
      await fetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to acknowledge alert");
    }
  }

  async function handleResolve(alertId: number) {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      await api.resolveAlert(token, alertId);
      // Refresh alerts after action
      await fetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resolve alert");
    }
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Loading alerts...</main>;
  }

  if (error) {
    return <main style={{ padding: 32, color: "#991b1b" }}>{error}</main>;
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 32 }}>


      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 24 }}>
        <h1 style={{ margin: 0 }}>Alerts</h1>
      </div>
      
      {/* API Gap Note */}
      <div style={{ background: "#eff6ff", color: "#1e40af", padding: "12px 16px", borderRadius: 8, marginBottom: 24 }}>
        <strong>Note:</strong> Alerts are aggregated client-side by fetching all shipments. A global <code>GET /api/v1/alerts</code> endpoint would optimize this.
      </div>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
        {alerts.length === 0 ? (
          <p>No alerts found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: 12 }}>ID</th>
                <th style={{ padding: 12 }}>Severity</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Shipment ID</th>
                <th style={{ padding: 12 }}>Sensor ID</th>
                <th style={{ padding: 12 }}>Temp (°C)</th>
                <th style={{ padding: 12 }}>Detected At</th>
                <th style={{ padding: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 12 }}>{a.id}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ 
                      padding: "4px 8px", borderRadius: 4, fontWeight: "bold", fontSize: 12,
                      background: a.severity === 'CRITICAL' ? '#fee2e2' : a.severity === 'HIGH' ? '#ffedd5' : '#fef3c7',
                      color: a.severity === 'CRITICAL' ? '#991b1b' : a.severity === 'HIGH' ? '#9a3412' : '#92400e'
                    }}>
                      {a.severity}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{a.status}</td>
                  <td style={{ padding: 12 }}>
                    <Link href={`/shipments/${a.shipment_id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                      {a.shipment_id}
                    </Link>
                  </td>
                  <td style={{ padding: 12 }}>
                    <Link href={`/sensors/${a.sensor_id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                      {a.sensor_id}
                    </Link>
                  </td>
                  <td style={{ padding: 12 }}>{a.latest_temperature}</td>
                  <td style={{ padding: 12 }}>{new Date(a.detected_at).toLocaleString()}</td>
                  <td style={{ padding: 12, display: "flex", gap: 8 }}>
                    {a.status === 'OPEN' && (
                      <button 
                        onClick={() => handleAcknowledge(a.id)}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "#f59e0b", color: "#fff", cursor: "pointer", fontSize: 12 }}
                      >
                        Ack
                      </button>
                    )}
                    {(a.status === 'OPEN' || a.status === 'ACKNOWLEDGED') && (
                      <button 
                        onClick={() => handleResolve(a.id)}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "#10b981", color: "#fff", cursor: "pointer", fontSize: 12 }}
                      >
                        Resolve
                      </button>
                    )}
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
