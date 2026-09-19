import React from "react";
import styles from "./Badge.module.css";

interface BadgeProps {
  status: "success" | "warning" | "error" | "default" | "active" | "expired" | "pending" | "neutral";
  children: React.ReactNode;
}

export default function Badge({ status, children }: BadgeProps) {
  let statusClass = styles.neutral;
  if (status === "success" || status === "active") statusClass = styles.active;
  if (status === "error" || status === "expired") statusClass = styles.expired;
  if (status === "warning" || status === "pending") statusClass = styles.pending;

  return <span className={`${styles.badge} ${statusClass}`}>{children}</span>;
}
