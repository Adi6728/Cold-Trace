"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, Alert, AuthUserResponse } from "@/lib/api";
import { canPerformAction } from "@/lib/rbac";
import dashboardStyles from "../../components/Dashboard.module.css";
import tableStyles from "../../components/Table.module.css";
import formStyles from "../../components/Form.module.css";
import Badge from "../../components/Badge";
import DashboardCard from "../../components/DashboardCard";

export default function AlertsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);


  const fetchAlerts = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    
    setLoading(true);
    try {
      const [userData, shipments] = await Promise.all([
        api.me(token),
        api.getShipments(token)
      ]);
      setUser(userData);
      
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
  }, [router]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function handleAcknowledge(alertId: number) {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setActionLoading(alertId);
    try {
      await api.acknowledgeAlert(token, alertId);
      await fetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to acknowledge alert");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResolve(alertId: number) {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setActionLoading(alertId);
    try {
      await api.resolveAlert(token, alertId);
      await fetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resolve alert");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <main className={dashboardStyles.dashboardContainer} style={{ padding: 32 }}>Loading alerts...</main>;
  }

  if (error) {
    return (
      <main className={dashboardStyles.dashboardContainer} style={{ padding: 32 }}>
        <div style={{ color: "#dc2626", background: "var(--bg-danger)", padding: 12, borderRadius: 8, border: "1px solid #fecaca" }}>
          {error}
        </div>
      </main>
    );
  }

  const openCount = alerts.filter(a => a.status === 'OPEN').length;
  const ackCount = alerts.filter(a => a.status === 'ACKNOWLEDGED').length;
  const resolvedCount = alerts.filter(a => a.status === 'RESOLVED').length;
  const hasActiveAlerts = openCount > 0;

  return (
    <main className={dashboardStyles.dashboardContainer}>
      <div className={dashboardStyles.header}>
        <h1 className={dashboardStyles.pageTitle}>Alert Center</h1>
        <p className={dashboardStyles.pageSubtitle}>Monitor and resolve temperature anomalies across active shipments.</p>
      </div>
      
      <div className={dashboardStyles.statsGrid}>
        <DashboardCard 
          title="Open Alerts" 
          value={openCount} 
          icon="⚠️" 
          type={hasActiveAlerts ? "error" : "default"}
        />
        <DashboardCard 
          title="Acknowledged" 
          value={ackCount} 
          icon="👀" 
          type={ackCount > 0 ? "warning" : "default"}
        />
        <DashboardCard 
          title="Resolved" 
          value={resolvedCount} 
          icon="✅" 
          type="default"
        />
      </div>

      <div className={tableStyles.tableContainer}>
        <h2 className={tableStyles.tableTitle} style={{ marginBottom: 20 }}>All Alerts</h2>
        {alerts.length === 0 ? (
          <div className={tableStyles.emptyState}>No alerts found.</div>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Status</th>
                <th>Shipment & Sensor</th>
                <th>Latest Temp</th>
                <th>Detected At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const isCritical = a.severity === 'CRITICAL';
                const isHigh = a.severity === 'HIGH';
                const severityStyle = isCritical ? { color: "#dc2626", background: "var(--bg-danger)" } : isHigh ? { color: "#ea580c", background: "#fff7ed" } : { color: "#d97706", background: "#fefce8" };
                
                let badgeStatus: "error" | "warning" | "default" | "success" = "default";
                if (a.status === 'OPEN') badgeStatus = "error";
                else if (a.status === 'ACKNOWLEDGED') badgeStatus = "warning";
                else if (a.status === 'RESOLVED') badgeStatus = "success";

                return (
                  <tr key={a.id}>
                    <td>
                      <span style={{ 
                        padding: "4px 8px", borderRadius: 6, fontWeight: 700, fontSize: "12px",
                        ...severityStyle
                      }}>
                        {a.severity}
                      </span>
                    </td>
                    <td><Badge status={badgeStatus}>{a.status}</Badge></td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        <Link href={`/shipments/${a.shipment_id}`} className={tableStyles.link}>
                          Shipment #{a.shipment_id}
                        </Link>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        Sensor: <Link href={`/sensors/${a.sensor_id}`} className={tableStyles.link}>#{a.sensor_id}</Link>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{a.latest_temperature.toFixed(1)}°C</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{new Date(a.detected_at).toLocaleDateString()}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{new Date(a.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        {canPerformAction(user?.role, "MUTATE_SHIPMENT") && (
                          <>
                            {a.status === 'OPEN' && (
                              <button 
                                onClick={() => handleAcknowledge(a.id)}
                                className={formStyles.button}
                                disabled={actionLoading === a.id}
                                style={{ background: "#f59e0b", padding: "6px 12px", fontSize: "12px" }}
                              >
                                {actionLoading === a.id ? "Wait..." : "Acknowledge"}
                              </button>
                            )}
                            {(a.status === 'OPEN' || a.status === 'ACKNOWLEDGED') && (
                              <button 
                                onClick={() => handleResolve(a.id)}
                                className={formStyles.button}
                                disabled={actionLoading === a.id}
                                style={{ background: "#10b981", padding: "6px 12px", fontSize: "12px" }}
                              >
                                {actionLoading === a.id ? "Wait..." : "Resolve"}
                              </button>
                            )}
                          </>
                        )}
                        {!canPerformAction(user?.role, "MUTATE_SHIPMENT") && (a.status !== 'RESOLVED') && (
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic" }}>Read Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
