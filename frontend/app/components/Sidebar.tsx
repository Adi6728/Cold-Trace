"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./Sidebar.module.css";
import { api, AuthUserResponse } from "@/lib/api";
import { canAccessRoute } from "@/lib/rbac";

const MENU_ITEMS = [
  { href: "/dashboard", label: "Dashboard", section: "Main" },
  { href: "/products", label: "Products", section: "Master Data" },
  { href: "/batches", label: "Batches", section: "Master Data" },
  { href: "/shipments", label: "Shipments", section: "Traceability" },
  { href: "/sensors", label: "Sensors", section: "Traceability" },
  { href: "/alerts", label: "Alerts", section: "Traceability" },
  { href: "/blockchain", label: "Blockchain Audit", section: "Verification" },
  { href: "/verify", label: "Public QR Verify", section: "Verification" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUserResponse | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    
    api.me(token)
      .then(setUser)
      .catch(() => {
        // Ignore error here, Header handles logout
      });
  }, []);

  const allowedItems = MENU_ITEMS.filter(item => 
    canAccessRoute(user?.role, item.href)
  );

  const groupedItems = allowedItems.reduce((acc, item) => {
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
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
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
