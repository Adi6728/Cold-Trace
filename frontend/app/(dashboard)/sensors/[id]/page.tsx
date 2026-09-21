"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Sensor, SensorReading } from "@/lib/api";
import { canPerformAction } from "@/lib/rbac";
import dashboardStyles from "../../../components/Dashboard.module.css";
import tableStyles from "../../../components/Table.module.css";
import formStyles from "../../../components/Form.module.css";
import Badge from "../../../components/Badge";

export default function SensorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [simulatorStatus, setSimulatorStatus] = useState<string>("STOPPED");
  const [simulatorMode, setSimulatorMode] = useState<string>("NORMAL");
  const [canControl, setCanControl] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    Promise.all([
      api.me(token),
      api.getSensor(token, Number(id)),
      api.getSensorReadings(token, Number(id)),
      api.getSimulationStatus(token, Number(id)).catch(() => ({ status: "STOPPED", mode: "NORMAL" }))
    ])
      .then(([userData, sensorData, readingsData, simData]) => {
        setCanControl(canPerformAction(userData.role, "CREATE_SENSOR"));
        setSensor(sensorData);
        setReadings(readingsData);
        setSimulatorStatus(simData.status);
        setSimulatorMode(simData.mode);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load sensor details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, router]);

  useEffect(() => {
    if (simulatorStatus !== "RUNNING") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const interval = setInterval(() => {
      api.getSensorReadings(token, Number(id)).then(setReadings).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [simulatorStatus, id]);

  async function handleAction(action: "start" | "stop" | "mode", payload?: string) {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      if (action === "start") {
        const res = await api.startSimulation(token, Number(id));
        setSimulatorStatus(res.status);
        setSimulatorMode(res.mode);
      } else if (action === "stop") {
        const res = await api.stopSimulation(token, Number(id));
        setSimulatorStatus(res.status);
        setSimulatorMode(res.mode);
      } else if (action === "mode" && payload) {
        const res = await api.setSimulationMode(token, Number(id), payload);
        setSimulatorStatus(res.status);
        setSimulatorMode(res.mode);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    }
  }

  if (loading) {
    return <main className={dashboardStyles.dashboardContainer} style={{ padding: 32 }}>Loading sensor details...</main>;
  }

  if (error || !sensor) {
    return (
      <main className={dashboardStyles.dashboardContainer} style={{ padding: 32 }}>
        <div style={{ color: "#dc2626", background: "var(--bg-danger)", padding: 12, borderRadius: 8, border: "1px solid #fecaca" }}>
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
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Assignment</div>
              {sensor.shipment_id ? (
                <Link href={`/shipments/${sensor.shipment_id}`} className={tableStyles.link} style={{ fontSize: "16px", fontWeight: 500 }}>
                  Active on Shipment #{sensor.shipment_id}
                </Link>
              ) : (
                <span style={{ fontSize: "16px", color: "var(--text-secondary)" }}>Unassigned</span>
              )}
            </div>
            
            {latestReading ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
                <div style={{ background: "var(--bg-page)", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: 4 }}>Latest Temperature</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {latestReading.temperature.toFixed(1)}°C
                  </div>
                </div>
                {latestReading.humidity != null && (
                  <div style={{ background: "var(--bg-page)", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: 4 }}>Latest Humidity</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {latestReading.humidity.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: "var(--bg-page)", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0", color: "var(--text-secondary)" }}>
                No telemetry data received yet.
              </div>
            )}
          </div>
        </div>

        {canControl && (
          <div className={dashboardStyles.feedContainer}>
            <h2 className={dashboardStyles.feedTitle}>IoT Simulation Controls</h2>
            <div style={{ background: "var(--bg-page)", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-secondary)" }}>Status:</span>
                <Badge status={simulatorStatus === "RUNNING" ? "active" : "default"}>{simulatorStatus}</Badge>
              </div>
              
              <div style={{ display: "flex", gap: 8 }}>
                {simulatorStatus !== "RUNNING" ? (
                  <button onClick={() => handleAction("start")} style={{ flex: 1, padding: "8px 16px", background: "var(--color-success)", color: "white", border: "none", borderRadius: 6, fontWeight: 500, cursor: "pointer" }}>
                    Start Simulation
                  </button>
                ) : (
                  <button onClick={() => handleAction("stop")} style={{ flex: 1, padding: "8px 16px", background: "var(--color-danger)", color: "white", border: "none", borderRadius: 6, fontWeight: 500, cursor: "pointer" }}>
                    Stop Simulation
                  </button>
                )}
              </div>

              {simulatorStatus === "RUNNING" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Operating Mode</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      onClick={() => handleAction("mode", "NORMAL")} 
                      disabled={simulatorMode === "NORMAL"}
                      style={{ flex: 1, padding: "6px 12px", background: simulatorMode === "NORMAL" ? "#3b82f6" : "#f1f5f9", color: simulatorMode === "NORMAL" ? "white" : "#475569", border: "1px solid #cbd5e1", borderRadius: 6, cursor: simulatorMode === "NORMAL" ? "default" : "pointer" }}>
                      NORMAL
                    </button>
                    <button 
                      onClick={() => handleAction("mode", "EXCURSION")} 
                      disabled={simulatorMode === "EXCURSION"}
                      style={{ flex: 1, padding: "6px 12px", background: simulatorMode === "EXCURSION" ? "#f59e0b" : "#f1f5f9", color: simulatorMode === "EXCURSION" ? "white" : "#475569", border: "1px solid #cbd5e1", borderRadius: 6, cursor: simulatorMode === "EXCURSION" ? "default" : "pointer" }}>
                      EXCURSION
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
                      <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{new Date(r.recorded_at).toLocaleDateString()}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{r.temperature.toFixed(1)}°C</td>
                    <td style={{ color: "var(--text-secondary)" }}>{r.humidity != null ? `${r.humidity.toFixed(1)}%` : "-"}</td>
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
