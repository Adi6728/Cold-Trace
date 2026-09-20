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

  async function handleVerify(id: string) {
    if (!id) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.verifyShipmentPublic(parseInt(id, 10));
      setResult(data);
    } catch (err: any) {
      if (err.message.includes("404")) {
        setError("Shipment not found. Please check the ID and try again.");
      } else {
        setError("Verification service unavailable. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleVerify(shipmentId);
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-page)", padding: "48px 24px", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: "40px", marginBottom: 16 }}>⌕</div>
          <h1 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "28px" }}>ColdChain Verify</h1>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>Public shipment traceability and authenticity portal.</p>
        </div>

        <div style={{ background: "var(--bg-surface)", padding: 32, borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)", border: "1px solid var(--border-light)", marginBottom: 24 }}>
          <form onSubmit={onSubmit} style={{ display: "flex", gap: 12 }}>
            <input 
              type="number" 
              placeholder="Enter Shipment ID" 
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              style={{ flex: 1, padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "2px solid var(--border-light)", fontSize: "16px", outline: "none", color: "var(--text-primary)", background: "var(--bg-surface)" }}
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: "12px 24px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--color-primary)", color: "#fff", fontSize: "16px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s" }}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        </div>

        {error && (
          <div style={{ background: "var(--bg-danger)", color: "var(--color-danger)", padding: 20, borderRadius: "var(--radius-sm)", border: "1px solid #FFBDAD", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: 8 }}>✖</div>
            <div style={{ fontWeight: 600 }}>Verification Failed</div>
            <div style={{ fontSize: "14px", marginTop: 4 }}>{error}</div>
          </div>
        )}

        {result && (
          <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)", border: "1px solid var(--border-light)", overflow: "hidden" }}>
            
            <div style={{ background: result.is_blockchain_verified ? "var(--bg-success)" : "var(--bg-warning)", borderBottom: "1px solid var(--border-light)", padding: "24px", textAlign: "center" }}>
              {result.is_blockchain_verified ? (
                <>
                  <div style={{ fontSize: "40px", marginBottom: 8 }}>✔</div>
                  <h2 style={{ margin: 0, color: "var(--color-success)", fontSize: "20px" }}>Authentic Shipment</h2>
                  <div style={{ color: "var(--color-success)", fontSize: "14px", marginTop: 4, fontWeight: 500 }}>Verified by Hyperledger Fabric</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "40px", marginBottom: 8 }}>⚠</div>
                  <h2 style={{ margin: 0, color: "var(--color-warning)", fontSize: "20px" }}>Unverified Origin</h2>
                  <div style={{ color: "var(--color-warning)", fontSize: "14px", marginTop: 4, fontWeight: 500 }}>Blockchain signature missing or unavailable</div>
                </>
              )}
            </div>

            <div style={{ padding: 32 }}>
              <h3 style={{ margin: "0 0 16px 0", color: "var(--text-primary)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Shipment Details</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Shipment ID</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>#{result.shipment_id}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Current Status</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{result.status}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Batch Reference</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>#{result.batch_id}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Created At</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{new Date(result.created_at).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Traceability Events</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{result.events_count} recorded</span>
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
