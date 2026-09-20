"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, AuthUserResponse } from "@/lib/api";
import dashboardStyles from "../../components/Dashboard.module.css";
import formStyles from "../../components/Form.module.css";
import tableStyles from "../../components/Table.module.css";
import DashboardCard from "../../components/DashboardCard";

export default function BlockchainAuditPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [shipmentId, setShipmentId] = useState("");
  const [history, setHistory] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    api.me(token).then(setUser).catch(() => router.replace("/login"));
  }, [router]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!shipmentId) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    setLoading(true);
    setError(null);
    setHistory(null);

    try {
      const id = parseInt(shipmentId, 10);
      if (isNaN(id)) throw new Error("Shipment ID must be a number");
      const records = await api.getShipmentBlockchainHistory(token, id);
      setHistory(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch blockchain history");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <main className={dashboardStyles.dashboardContainer} style={{ padding: 32 }}>Loading...</main>;
  }

  return (
    <main className={dashboardStyles.dashboardContainer}>
      <div className={dashboardStyles.header}>
        <h1 className={dashboardStyles.pageTitle}>Blockchain Audit</h1>
        <p className={dashboardStyles.pageSubtitle}>
          Verify immutable supply chain events securely anchored on Hyperledger Fabric.
        </p>
      </div>

      <div style={{ background: "var(--bg-info)", color: "var(--text-primary)", padding: "16px 20px", borderRadius: "var(--radius-md)", marginBottom: 24, fontSize: "14px", border: "1px solid var(--border-light)" }}>
        <strong>Architecture Note:</strong> PostgreSQL remains the primary operational database for real-time visibility. 
        Hyperledger Fabric is used as a secondary, tamper-evident verification layer. Records shown here are cryptographically signed and immutable.
      </div>

      <div className={formStyles.formContainer} style={{ marginBottom: 32 }}>
        <h2 className={formStyles.formTitle}>Audit Shipment</h2>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
          <div className={formStyles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
            <label className={formStyles.label}>Shipment ID</label>
            <input 
              type="text" 
              className={formStyles.input} 
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              placeholder="e.g. 1"
              required
            />
          </div>
          <button type="submit" className={formStyles.button} disabled={loading} style={{ height: "42px" }}>
            {loading ? "Searching..." : "Verify on Blockchain"}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ color: "var(--color-danger)", background: "var(--bg-danger)", padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid #FFBDAD", marginBottom: 32 }}>
          {error}
        </div>
      )}

      {history && (
        <div className={tableStyles.tableContainer}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 className={tableStyles.tableTitle} style={{ margin: 0 }}>Fabric Ledger History</h2>
            <Link href={`/shipments/${shipmentId}`} className={tableStyles.link} style={{ fontWeight: 600 }}>
              View Operational Shipment &rarr;
            </Link>
          </div>
          
          {history.length === 0 ? (
            <div className={tableStyles.emptyState}>No blockchain records found for this shipment.</div>
          ) : (
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Location</th>
                  <th>Recorded By</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, idx) => (
                  <tr key={idx}>
                    <td>
                      <span style={{ 
                        padding: "2px 6px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                        background: "var(--bg-neutral)", color: "var(--text-secondary)", border: "1px solid var(--border-light)"
                      }}>
                        {record.eventType}
                      </span>
                    </td>
                    <td>{record.location || <span style={{ color: "var(--text-secondary)" }}>-</span>}</td>
                    <td>{record.recordedBy}</td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {record.timestamp ? new Date(record.timestamp).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}
