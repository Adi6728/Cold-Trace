"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type VerifyResult = {
  shipment_id: number;
  status: string;
  batch_id: number;
  origin_organization_id: number;
  destination_organization_id: number;
  created_at: string;
  delivered_at: string | null;
  is_blockchain_verified: boolean;
  events_count: number;
};

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams?.get("id") || "";
  
  const [shipmentId, setShipmentId] = useState(initialId);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-verify if ID is in URL
  useEffect(() => {
    if (initialId) {
      handleVerify(initialId);
    }
  }, [initialId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleVerify(shipmentId);
  }

  async function handleVerify(idStr: string) {
    if (!idStr) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const id = parseInt(idStr, 10);
      if (isNaN(id)) throw new Error("Invalid shipment ID format.");
      
      const res = await api.verifyShipmentPublic(id);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shipment not found or verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "48px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: "48px", marginBottom: 16 }}>❄️</div>
          <h1 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "28px" }}>ColdChain Verify</h1>
          <p style={{ margin: 0, color: "#64748b" }}>Public shipment traceability and authenticity portal.</p>
        </div>

        <div style={{ background: "#fff", padding: 32, borderRadius: 16, boxShadow: "0 10px 25px rgba(15, 23, 42, 0.05)", marginBottom: 24 }}>
          <form onSubmit={onSubmit} style={{ display: "flex", gap: 12 }}>
            <input
              type="text"
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              placeholder="Enter Shipment ID"
              style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "16px", outline: "none" }}
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: "12px 24px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontSize: "16px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", color: "#dc2626", padding: 20, borderRadius: 12, border: "1px solid #fecaca", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: 8 }}>❌</div>
            <div style={{ fontWeight: 600 }}>Verification Failed</div>
            <div style={{ fontSize: "14px", marginTop: 4 }}>{error}</div>
          </div>
        )}

        {result && (
          <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 10px 25px rgba(15, 23, 42, 0.05)", overflow: "hidden" }}>
            
            <div style={{ background: result.is_blockchain_verified ? "#f0fdf4" : "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
              {result.is_blockchain_verified ? (
                <>
                  <div style={{ fontSize: "40px", marginBottom: 8 }}>✅</div>
                  <h2 style={{ margin: 0, color: "#166534", fontSize: "20px" }}>Authentic Shipment</h2>
                  <div style={{ color: "#15803d", fontSize: "14px", marginTop: 4, fontWeight: 500 }}>Verified by Hyperledger Fabric</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "40px", marginBottom: 8 }}>⚠️</div>
                  <h2 style={{ margin: 0, color: "#92400e", fontSize: "20px" }}>Unverified Origin</h2>
                  <div style={{ color: "#b45309", fontSize: "14px", marginTop: 4, fontWeight: 500 }}>Blockchain signature missing or unavailable</div>
                </>
              )}
            </div>

            <div style={{ padding: 32 }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Shipment Details</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Shipment ID</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>#{result.shipment_id}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Current Status</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{result.status}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Batch Reference</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>#{result.batch_id}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Created At</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{new Date(result.created_at).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Traceability Events</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{result.events_count} recorded</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main style={{ padding: 48, textAlign: "center" }}>Loading...</main>}>
      <VerifyPageContent />
    </Suspense>
  );
}
