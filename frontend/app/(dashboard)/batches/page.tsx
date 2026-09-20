"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Batch, Product, AuthUserResponse } from "@/lib/api";
import { canPerformAction } from "@/lib/rbac";
import tableStyles from "../../components/Table.module.css";
import formStyles from "../../components/Form.module.css";
import dashboardStyles from "../../components/Dashboard.module.css";
import Badge from "../../components/Badge";

export default function BatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // filtering
  const [filterProductId, setFilterProductId] = useState<number | null>(null);

  // form state
  const [productId, setProductId] = useState<number | "">("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [manufacturedAt, setManufacturedAt] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    
    // Check if there is a product_id filter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const prodIdParam = urlParams.get("product_id");
    if (prodIdParam) {
      setFilterProductId(Number(prodIdParam));
      setProductId(Number(prodIdParam)); // pre-select in form
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
    setFormSuccess(null);
    
    if (!productId || !quantity || quantity <= 0) {
      setFormError("Please fill out all required fields with valid values.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token || !user) return;

    setIsSubmitting(true);
    try {
      const newBatch = await api.createBatch(token, {
        product_id: Number(productId),
        batch_number: batchNumber,
        manufactured_at: new Date(manufacturedAt).toISOString(),
        expiry_date: new Date(expiryDate).toISOString(),
        quantity: Number(quantity),
      });
      setBatches([...batches, newBatch]);
      setFormSuccess(`Batch "${newBatch.batch_number}" created successfully!`);
      
      // Reset form (keep productId if it was filtered)
      if (!filterProductId) setProductId("");
      setBatchNumber("");
      setQuantity("");
      setManufacturedAt("");
      setExpiryDate("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create batch.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const getProductName = (id: number) => {
    const p = products.find(prod => prod.id === id);
    return p ? p.name : `Unknown (ID: ${id})`;
  };

  const getStatusBadge = (batch: Batch) => {
    const isExpired = new Date(batch.expiry_date) < new Date();
    if (isExpired) {
      return <Badge status="error">Expired</Badge>;
    }
    return <Badge status="active">Active</Badge>;
  };

  const displayedBatches = filterProductId 
    ? batches.filter(b => b.product_id === filterProductId)
    : batches;

  if (loading) {
    return <main className={dashboardStyles.dashboardContainer} style={{ padding: 32 }}>Loading batches...</main>;
  }

  if (error) {
    return (
      <main className={dashboardStyles.dashboardContainer} style={{ padding: 32 }}>
        <div className={formStyles.errorText}>{error}</div>
      </main>
    );
  }

  return (
    <main className={dashboardStyles.dashboardContainer}>
      <div className={dashboardStyles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className={dashboardStyles.pageTitle}>Production Batches</h1>
            <p className={dashboardStyles.pageSubtitle}>Monitor manufacturing runs and track expiry dates.</p>
          </div>
          {filterProductId && (
            <button 
              onClick={() => {
                setFilterProductId(null);
                setProductId("");
                window.history.pushState({}, '', '/batches');
              }}
              className={formStyles.button} 
              style={{ background: "var(--border-light)", color: "var(--text-secondary)" }}
            >
              Clear Product Filter
            </button>
          )}
        </div>
      </div>

      {canPerformAction(user?.role, "CREATE_BATCH") && (
        <div className={formStyles.formContainer}>
          <h2 className={formStyles.formTitle}>Register New Batch</h2>
          <form onSubmit={handleCreateBatch} className={formStyles.form}>
            {formError && <div className={formStyles.errorText}>{formError}</div>}
            {formSuccess && <div className={formStyles.successText}>{formSuccess}</div>}
            
            <div className={formStyles.formRow}>
              <div className={formStyles.formGroup}>
                <label className={formStyles.label}>Product *</label>
                <select 
                  required 
                  className={formStyles.select}
                  value={productId} 
                  onChange={(e) => setProductId(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={filterProductId !== null}
                >
                  <option value="" disabled>Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
                  ))}
                </select>
              </div>

              <div className={formStyles.formGroup}>
                <label className={formStyles.label}>Batch Number *</label>
                <input 
                  required 
                  className={formStyles.input}
                  placeholder="e.g. BATCH-2024-001"
                  value={batchNumber} 
                  onChange={(e) => setBatchNumber(e.target.value)} 
                />
              </div>
            </div>

            <div className={formStyles.formRow}>
              <div className={formStyles.formGroup}>
                <label className={formStyles.label}>Quantity *</label>
                <input 
                  required 
                  type="number" 
                  min="1" 
                  className={formStyles.input}
                  placeholder="Number of units"
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))} 
                />
              </div>
              
              <div className={formStyles.formGroup}>
                <label className={formStyles.label}>Manufacture Date *</label>
                <input 
                  required 
                  type="datetime-local" 
                  className={formStyles.input}
                  value={manufacturedAt} 
                  onChange={(e) => setManufacturedAt(e.target.value)} 
                />
              </div>

              <div className={formStyles.formGroup}>
                <label className={formStyles.label}>Expiry Date *</label>
                <input 
                  required 
                  type="datetime-local" 
                  className={formStyles.input}
                  value={expiryDate} 
                  onChange={(e) => setExpiryDate(e.target.value)} 
                />
              </div>
            </div>

            <button type="submit" className={formStyles.button} disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register Batch"}
            </button>
          </form>
        </div>
      )}

      <div className={tableStyles.tableContainer}>
        <h2 className={tableStyles.tableTitle} style={{ marginBottom: 20 }}>
          {filterProductId ? `Batches for Product: ${getProductName(filterProductId)}` : "All Batches"}
        </h2>
        
        {displayedBatches.length === 0 ? (
          <div className={tableStyles.emptyState}>No batches found.</div>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Manufactured</th>
                <th>Expiry Date</th>
              </tr>
            </thead>
            <tbody>
              {displayedBatches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{b.batch_number}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>ID: #{b.id}</div>
                  </td>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{getProductName(b.product_id)}</td>
                  <td>{b.quantity} units</td>
                  <td>{getStatusBadge(b)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{new Date(b.manufactured_at).toLocaleDateString()}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{new Date(b.expiry_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
