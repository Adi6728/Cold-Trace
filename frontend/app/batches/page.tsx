"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Batch, Product, AuthUserResponse } from "@/lib/api";
import Navbar from "../components/Navbar";

export default function BatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // form state
  const [productId, setProductId] = useState<number | "">("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [manufacturedAt, setManufacturedAt] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    
    Promise.all([api.me(token), api.getBatches(token), api.getProducts(token)])
      .then(([userData, batchesData, productsData]) => {
        setUser(userData);
        setBatches(batchesData);
        setProducts(productsData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    
    if (!productId || !quantity || quantity <= 0) {
      setFormError("Please fill out all required fields with valid values.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token || !user) return;

    try {
      const newBatch = await api.createBatch(token, {
        product_id: Number(productId),
        batch_number: batchNumber,
        manufactured_at: new Date(manufacturedAt).toISOString(),
        expiry_date: new Date(expiryDate).toISOString(),
        quantity: Number(quantity),
      });
      setBatches([...batches, newBatch]);
      setProductId("");
      setBatchNumber("");
      setQuantity("");
      setManufacturedAt("");
      setExpiryDate("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create batch.");
    }
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Loading batches...</main>;
  }

  if (error) {
    return <main style={{ padding: 32, color: "#991b1b" }}>{error}</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <Navbar />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 24 }}>
        <h1 style={{ margin: 0 }}>Batches</h1>
      </div>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)", marginBottom: 32 }}>
        <h2 style={{ marginTop: 0 }}>Create Batch</h2>
        <form onSubmit={handleCreateBatch} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
          {formError && <div style={{ color: "#991b1b", fontSize: 14 }}>{formError}</div>}
          
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label>Product</label>
            <select required value={productId} onChange={(e) => setProductId(e.target.value === "" ? "" : Number(e.target.value))} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }}>
              <option value="" disabled>Select a product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label>Batch Number</label>
            <input required value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label>Quantity</label>
            <input required type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label>Manufactured At</label>
              <input required type="datetime-local" value={manufacturedAt} onChange={(e) => setManufacturedAt(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label>Expiry Date</label>
              <input required type="datetime-local" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
            </div>
          </div>

          <button type="submit" style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>
            Create Batch
          </button>
        </form>
      </section>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
        <h2 style={{ marginTop: 0 }}>Batch List</h2>
        {batches.length === 0 ? (
          <p>No batches found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: 12 }}>ID</th>
                <th style={{ padding: 12 }}>Product ID</th>
                <th style={{ padding: 12 }}>Batch #</th>
                <th style={{ padding: 12 }}>Quantity</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 12 }}>{b.id}</td>
                  <td style={{ padding: 12 }}>{b.product_id}</td>
                  <td style={{ padding: 12 }}>{b.batch_number}</td>
                  <td style={{ padding: 12 }}>{b.quantity}</td>
                  <td style={{ padding: 12 }}>{b.status}</td>
                  <td style={{ padding: 12 }}>{new Date(b.expiry_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
