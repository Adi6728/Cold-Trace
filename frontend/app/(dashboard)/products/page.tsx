"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Product, AuthUserResponse, Batch } from "@/lib/api";
import { canPerformAction } from "@/lib/rbac";
import tableStyles from "../../components/Table.module.css";
import formStyles from "../../components/Form.module.css";

export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minTemp, setMinTemp] = useState(2);
  const [maxTemp, setMaxTemp] = useState(8);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    
    // load user, products, and batches (for count)
    Promise.all([
      api.me(token), 
      api.getProducts(token).catch(() => []),
      api.getBatches(token).catch(() => [])
    ])
      .then(([userData, productsData, batchesData]) => {
        setUser(userData);
        setProducts(productsData);
        setBatches(batchesData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load products.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    if (minTemp > maxTemp) {
      setFormError("Minimum temperature cannot be greater than maximum temperature.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token || !user) return;

    setIsSubmitting(true);
    try {
      const newProduct = await api.createProduct(token, {
        name,
        description,
        manufacturer_id: user.organization_id || user.id, // Fallback if org missing
        storage_min_temp: minTemp,
        storage_max_temp: maxTemp,
      });
      setProducts([...products, newProduct]);
      setFormSuccess(`Product "${newProduct.name}" created successfully!`);
      setName("");
      setDescription("");
      setMinTemp(2);
      setMaxTemp(8);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const getBatchCount = (productId: number) => {
    return batches.filter(b => b.product_id === productId).length;
  };

  if (loading) {
    return <main style={{ padding: 32 }}>Loading products...</main>;
  }

  if (error) {
    return (
      <main style={{ padding: 32 }}>
        <div className={formStyles.errorText}>{error}</div>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <div className={tableStyles.tableHeader}>
        <h1 className={tableStyles.tableTitle}>Products Management</h1>
      </div>

      {canPerformAction(user?.role, "CREATE_PRODUCT") && (
        <div className={formStyles.formContainer}>
          <h2 className={formStyles.formTitle}>Register New Product</h2>
          <form onSubmit={handleCreateProduct} className={formStyles.form}>
            {formError && <div className={formStyles.errorText}>{formError}</div>}
            {formSuccess && <div className={formStyles.successText}>{formSuccess}</div>}
            
            <div className={formStyles.formRow}>
              <div className={formStyles.formGroup}>
                <label className={formStyles.label}>Product Name *</label>
                <input 
                  required 
                  className={formStyles.input}
                  placeholder="e.g. mRNA Vaccine Batch"
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>
              <div className={formStyles.formGroup}>
                <label className={formStyles.label}>Description</label>
                <input 
                  className={formStyles.input}
                  placeholder="Optional details"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                />
              </div>
            </div>

            <div className={formStyles.formRow}>
              <div className={formStyles.formGroup}>
                <label className={formStyles.label}>Min Temp (°C) *</label>
                <input 
                  required 
                  type="number" 
                  step="0.1" 
                  className={formStyles.input}
                  value={minTemp} 
                  onChange={(e) => setMinTemp(parseFloat(e.target.value))} 
                />
              </div>
              <div className={formStyles.formGroup}>
                <label className={formStyles.label}>Max Temp (°C) *</label>
                <input 
                  required 
                  type="number" 
                  step="0.1" 
                  className={formStyles.input}
                  value={maxTemp} 
                  onChange={(e) => setMaxTemp(parseFloat(e.target.value))} 
                />
              </div>
            </div>

            <button type="submit" className={formStyles.button} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Product"}
            </button>
          </form>
        </div>
      )}

      <div className={tableStyles.tableContainer}>
        <h2 className={tableStyles.tableTitle} style={{ marginBottom: 20 }}>Product List</h2>
        {products.length === 0 ? (
          <div className={tableStyles.emptyState}>No products registered yet.</div>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Storage Range</th>
                <th>Batches</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ color: "#64748b" }}>{p.description || "-"}</td>
                  <td>{p.storage_min_temp}°C to {p.storage_max_temp}°C</td>
                  <td>
                    <Link href={`/batches?product_id=${p.id}`} className={tableStyles.link}>
                      {getBatchCount(p.id)} batches
                    </Link>
                  </td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
