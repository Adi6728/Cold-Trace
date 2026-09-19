import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <main style={{ flex: 1, padding: "32px", overflowY: "auto", overflowX: "hidden" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
