"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Product, AuthUserResponse } from "@/lib/api";


export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minTemp, setMinTemp] = useState(2);
  const [maxTemp, setMaxTemp] = useState(8);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    
    // load user and products
    Promise.all([api.me(token), api.getProducts(token)])
      .then(([userData, productsData]) => {
        setUser(userData);
        setProducts(productsData);
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
    
    if (minTemp > maxTemp) {
      setFormError("Minimum temperature cannot be greater than maximum temperature.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token || !user) return;

    try {
      const newProduct = await api.createProduct(token, {
        name,
        description,
        manufacturer_id: user.organization_id || user.id, // Fallback if org missing, but API requires org match
        storage_min_temp: minTemp,
        storage_max_temp: maxTemp,
      });
      setProducts([...products, newProduct]);
      setName("");
      setDescription("");
      setMinTemp(2);
      setMaxTemp(8);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create product.");
    }
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Loading products...</main>;
  }

  if (error) {
    return <main style={{ padding: 32, color: "#991b1b" }}>{error}</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>


      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 24 }}>
        <h1 style={{ margin: 0 }}>Products</h1>
      </div>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)", marginBottom: 32 }}>
        <h2 style={{ marginTop: 0 }}>Create Product</h2>
        <form onSubmit={handleCreateProduct} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
          {formError && <div style={{ color: "#991b1b", fontSize: 14 }}>{formError}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label>Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label>Min Temp (°C)</label>
              <input required type="number" step="0.1" value={minTemp} onChange={(e) => setMinTemp(parseFloat(e.target.value))} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label>Max Temp (°C)</label>
              <input required type="number" step="0.1" value={maxTemp} onChange={(e) => setMaxTemp(parseFloat(e.target.value))} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
            </div>
          </div>
          <button type="submit" style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>
            Create Product
          </button>
        </form>
      </section>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
        <h2 style={{ marginTop: 0 }}>Product List</h2>
        {products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: 12 }}>ID</th>
                <th style={{ padding: 12 }}>Name</th>
                <th style={{ padding: 12 }}>Description</th>
                <th style={{ padding: 12 }}>Manufacturer ID</th>
                <th style={{ padding: 12 }}>Storage Range</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 12 }}>{p.id}</td>
                  <td style={{ padding: 12 }}>{p.name}</td>
                  <td style={{ padding: 12 }}>{p.description || "-"}</td>
                  <td style={{ padding: 12 }}>{p.manufacturer_id}</td>
                  <td style={{ padding: 12 }}>{p.storage_min_temp}°C to {p.storage_max_temp}°C</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
