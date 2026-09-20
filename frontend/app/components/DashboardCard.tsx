"use client";

import styles from "./Dashboard.module.css";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  loading?: boolean;
  type?: "default" | "warning" | "error";
}

export default function DashboardCard({ title, value, icon, trend, loading, type = "default" }: DashboardCardProps) {
  let iconClass = styles.cardIconDefault;
  if (type === "warning") iconClass = styles.cardIconWarning;
  if (type === "error") iconClass = styles.cardIconError;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{title}</span>
        <span className={`${styles.cardIcon} ${iconClass}`}>{icon}</span>
      </div>
      <div className={styles.cardBody}>
        {loading ? (
          <div className={styles.skeletonValue}></div>
        ) : (
          <span className={styles.cardValue}>{value}</span>
        )}
      </div>
      {trend && !loading && (
        <div className={styles.cardFooter}>
          <span className={styles.trendText} style={{ color: type === 'error' ? '#dc2626' : type === 'warning' ? '#ea580c' : '#10b981' }}>{trend}</span>
        </div>
      )}
    </div>
  );
}
