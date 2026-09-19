"use client";

import styles from "./Dashboard.module.css";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  loading?: boolean;
}

export default function DashboardCard({ title, value, icon, trend, loading }: DashboardCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{title}</span>
        <span className={styles.cardIcon}>{icon}</span>
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
          <span className={styles.trendText}>{trend}</span>
        </div>
      )}
    </div>
  );
}
