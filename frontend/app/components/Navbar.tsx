import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    router.replace("/login");
  }

  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #e5e7eb" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>ColdChain</h2>
        <nav style={{ display: "flex", gap: 16 }}>
          <Link href="/dashboard" style={{ textDecoration: "none", color: "#374151" }}>Dashboard</Link>
          <Link href="/products" style={{ textDecoration: "none", color: "#374151" }}>Products</Link>
          <Link href="/batches" style={{ textDecoration: "none", color: "#374151" }}>Batches</Link>
          <Link href="/shipments" style={{ textDecoration: "none", color: "#374151" }}>Shipments</Link>
        </nav>
      </div>
      <button onClick={handleLogout} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>
        Logout
      </button>
    </header>
  );
}
