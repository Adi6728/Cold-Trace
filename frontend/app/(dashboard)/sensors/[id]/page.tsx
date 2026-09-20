"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Sensor, SensorReading } from "@/lib/api";
import dashboardStyles from "../../../components/Dashboard.module.css";
import tableStyles from "../../../components/Table.module.css";
import Badge from "../../../components/Badge";

export default function SensorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    Promise.all([
      api.getSensor(token, Number(id)),
      api.getSensorReadings(token, Number(id))
    ])
      .then(([sensorData, readingsData]) => {
        setSensor(sensorData);
        setReadings(readingsData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load sensor details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, router]);

  if (loading) {
    return <main className={dashboardStyles.dashboardContainer} style={{ padding: 32 }}>Loading sensor details...</main>;
  }

  if (error || !sensor) {
    return (
      <main className={dashboardStyles.dashboardContainer} style={{ padding: 32 }}>
        <div style={{ color: "#dc2626", background: "#fef2f2", padding: 12, borderRadius: 8, border: "1px solid #fecaca" }}>
          {error || "Sensor not found."}
        </div>
      </main>
    );
  }

  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;

  return (
    <main className={dashboardStyles.dashboardContainer}>
      <div className={dashboardStyles.header}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
          <h1 className={dashboardStyles.pageTitle} style={{ margin: 0 }}>Sensor {sensor.sensor_code}</h1>
          <Badge status={sensor.status === 'ACTIVE' ? 'active' : 'default'}>{sensor.status}</Badge>
        </div>
        <p className={dashboardStyles.pageSubtitle}>
          Internal ID: #{sensor.id} | Registered on {new Date(sensor.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className={dashboardStyles.activitySection}>
        <div className={dashboardStyles.feedContainer}>
          <h2 className={dashboardStyles.feedTitle}>Sensor Status</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Assignment</div>
              {sensor.shipment_id ? (
                <Link href={`/shipments/${sensor.shipment_id}`} className={tableStyles.link} style={{ fontSize: "16px", fontWeight: 500 }}>
                  Active on Shipment #{sensor.shipment_id}
                </Link>
              ) : (
                <span style={{ fontSize: "16px", color: "#475569" }}>Unassigned</span>
              )}
            </div>
            
            {latestReading ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
                <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: 4 }}>Latest Temperature</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a" }}>
                    {latestReading.temperature.toFixed(1)}°C
                  </div>
                </div>
                {latestReading.humidity != null && (
                  <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: 4 }}>Latest Humidity</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a" }}>
                      {latestReading.humidity.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0", color: "#64748b" }}>
                No telemetry data received yet.
              </div>
            )}
          </div>
        </div>

        <div className={tableStyles.tableContainer} style={{ flex: "1 1 100%", margin: 0 }}>
          <h2 className={tableStyles.tableTitle} style={{ marginBottom: 20 }}>Telemetry History</h2>
          
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Recorded At</th>
                <th>Temperature</th>
                <th>Humidity</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr>
                  <td colSpan={3} className={tableStyles.emptyState}>
                    No readings available.
                  </td>
                </tr>
              ) : (
                [...readings].reverse().map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: "#334155" }}>{new Date(r.recorded_at).toLocaleDateString()}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ fontWeight: 500, color: "#0f172a" }}>{r.temperature.toFixed(1)}°C</td>
                    <td style={{ color: "#475569" }}>{r.humidity != null ? `${r.humidity.toFixed(1)}%` : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
