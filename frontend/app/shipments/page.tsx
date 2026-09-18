"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Shipment, Batch, AuthUserResponse } from "@/lib/api";
import Navbar from "../components/Navbar";

export default function ShipmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // form state
  const [batchId, setBatchId] = useState<number | "">("");
  const [destOrgId, setDestOrgId] = useState<number | "">("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    
    Promise.all([api.me(token), api.getShipments(token), api.getBatches(token)])
      .then(([userData, shipmentsData, batchesData]) => {
        setUser(userData);
        setShipments(shipmentsData);
        setBatches(batchesData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  async function handleCreateShipment(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    
    if (!batchId || !destOrgId) {
      setFormError("Please fill out all required fields.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token || !user) return;

    try {
      const newShipment = await api.createShipment(token, {
        batch_id: Number(batchId),
        origin_organization_id: user.organization_id || user.id, // using user's org
        destination_organization_id: Number(destOrgId),
      });
      setShipments([...shipments, newShipment]);
      setBatchId("");
      setDestOrgId("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create shipment.");
    }
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Loading shipments...</main>;
  }

  if (error) {
    return <main style={{ padding: 32, color: "#991b1b" }}>{error}</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <Navbar />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 24 }}>
        <h1 style={{ margin: 0 }}>Shipments</h1>
      </div>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)", marginBottom: 32 }}>
        <h2 style={{ marginTop: 0 }}>Create Shipment</h2>
        <form onSubmit={handleCreateShipment} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
          {formError && <div style={{ color: "#991b1b", fontSize: 14 }}>{formError}</div>}
          
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label>Batch</label>
            <select required value={batchId} onChange={(e) => setBatchId(e.target.value === "" ? "" : Number(e.target.value))} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }}>
              <option value="" disabled>Select a batch...</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.batch_number} (Product ID: {b.product_id})</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label>Destination Organization ID</label>
            <input required type="number" min="1" value={destOrgId} onChange={(e) => setDestOrgId(e.target.value === "" ? "" : Number(e.target.value))} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
          </div>

          <button type="submit" style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>
            Create Shipment
          </button>
        </form>
      </section>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
        <h2 style={{ marginTop: 0 }}>Shipment List</h2>
        {shipments.length === 0 ? (
          <p>No shipments found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: 12 }}>ID</th>
                <th style={{ padding: 12 }}>Batch ID</th>
                <th style={{ padding: 12 }}>Origin Org</th>
                <th style={{ padding: 12 }}>Dest Org</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 12 }}>{s.id}</td>
                  <td style={{ padding: 12 }}>{s.batch_id}</td>
                  <td style={{ padding: 12 }}>{s.origin_organization_id}</td>
                  <td style={{ padding: 12 }}>{s.destination_organization_id}</td>
                  <td style={{ padding: 12 }}>{s.status}</td>
                  <td style={{ padding: 12 }}>
                    <Link href={`/shipments/${s.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
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
