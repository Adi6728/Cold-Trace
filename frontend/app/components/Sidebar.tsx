"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

const MENU_ITEMS = [
  { href: "/dashboard", label: "Dashboard", section: "Main" },
  { href: "/products", label: "Products", section: "Master Data" },
  { href: "/batches", label: "Batches", section: "Master Data" },
  { href: "/shipments", label: "Shipments", section: "Traceability" },
  { href: "/sensors", label: "Sensors", section: "Traceability" },
  { href: "/alerts", label: "Alerts", section: "Traceability" },
  { href: "#", label: "Blockchain (Coming Soon)", section: "Verification", disabled: true },
  { href: "#", label: "QR Verify (Coming Soon)", section: "Verification", disabled: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  const groupedItems = MENU_ITEMS.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof MENU_ITEMS>);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>❄️</span>
        ColdChain
      </div>
      <div className={styles.navContainer}>
        {Object.entries(groupedItems).map(([section, items]) => (
          <div key={section}>
            <div className={styles.navSection}>{section}</div>
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.disabled ? "#" : item.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                  style={{ opacity: item.disabled ? 0.5 : 1, cursor: item.disabled ? "not-allowed" : "pointer" }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
