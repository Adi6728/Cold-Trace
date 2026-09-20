"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { api, AuthUserResponse } from "@/lib/api";
import styles from "./Header.module.css";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);



  const handleLogout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    
    api.me(token)
      .then(setUser)
      .catch(() => {
        // Token invalid, logout
        handleLogout();
      });
  }, [handleLogout]);

  return (
    <header className={styles.header}>
      <div className={styles.userInfo}>
        <div className={styles.userDetails}>
          <span className={styles.userName}>{user?.email || "Loading..."}</span>
          {user?.role && <span className={styles.userRole}>{user.role}</span>}
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </header>
  );
}
