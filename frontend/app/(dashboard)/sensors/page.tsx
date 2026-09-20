"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Sensor } from "@/lib/api";
import tableStyles from "../../components/Table.module.css";
import dashboardStyles from "../../components/Dashboard.module.css";
import Badge from "../../components/Badge";

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
    
    api.me(token).then((userData) => {
      const isPublicUser = userData.role === 'USER' && !userData.organization_id;
      return isPublicUser ? api.getPublicSensors(token) : api.getSensors(token);
    })
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
    return <main className={dashboardStyles.dashboardContainer} style={{ padding: 32 }}>Loading sensors...</main>;
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

  return (
    <main className={dashboardStyles.dashboardContainer}>
      <div className={dashboardStyles.header}>
        <h1 className={dashboardStyles.pageTitle}>Sensors</h1>
        <p className={dashboardStyles.pageSubtitle}>Manage and monitor active IoT tracking devices.</p>
      </div>

      <div className={tableStyles.tableContainer}>
        <h2 className={tableStyles.tableTitle} style={{ marginBottom: 20 }}>Sensor List</h2>
        {sensors.length === 0 ? (
          <div className={tableStyles.emptyState}>No sensors found.</div>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Sensor Identity</th>
                <th>Shipment Reference</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/sensors/${s.id}`} className={tableStyles.link} style={{ fontWeight: 600 }}>
                      {s.sensor_code}
                    </Link>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>ID: #{s.id}</div>
                  </td>
                  <td>
                    {s.shipment_id ? (
                      <Link href={`/shipments/${s.shipment_id}`} className={tableStyles.link}>
                        Shipment #{s.shipment_id}
                      </Link>
                    ) : (
                      <span style={{ color: "var(--text-secondary)" }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <Badge status={s.status === 'ACTIVE' ? 'active' : 'default'}>{s.status}</Badge>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
