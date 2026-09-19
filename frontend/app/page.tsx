"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./landing.module.css";

export default function LandingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      router.push("/dashboard");
    } else {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return <div style={{ minHeight: "100vh", background: "#ffffff" }} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.bgPattern} />
      <div className={styles.bgGlow} />
      <div className={styles.bgGlow2} />

      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon} />
          ColdChain Trace
        </div>
        <nav className={styles.nav}>
          <Link href="/login" className={styles.loginBtn}>
            Log in
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>Next-Gen Pharmaceutical Supply Chain</div>
            <h1 className={styles.headline}>
              Where trust meets <span>transparency.</span>
            </h1>
            <p className={styles.subheadline}>
              End-to-end traceability and temperature monitoring for the modern pharmaceutical cold chain. Backed by immutable blockchain records.
            </p>
            <div className={styles.ctaGroup}>
              <Link href="/login" className={styles.primaryCta}>
                Get Started
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={`${styles.floatingCard} ${styles.card1}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrap} ${styles.blueIcon}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                Temperature Alert
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Shipment limit exceeded (8°C)</div>
              <div style={{ height: 4, width: "100%", background: "#e2e8f0", borderRadius: 2 }}>
                <div style={{ height: "100%", width: "75%", background: "#ef4444", borderRadius: 2 }} />
              </div>
            </div>

            <div className={`${styles.floatingCard} ${styles.card2}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrap} ${styles.greenIcon}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/></svg>
                </div>
                Custody Transferred
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Manufacturer &rarr; Logistics</div>
              <div style={{ display: "flex", gap: 4 }}>
                <div style={{ height: 24, width: 24, borderRadius: "50%", background: "#f1f5f9" }} />
                <div style={{ height: 24, width: 24, borderRadius: "50%", background: "#e2e8f0" }} />
              </div>
            </div>

            <div className={`${styles.floatingCard} ${styles.card3}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrap} ${styles.purpleIcon}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </div>
                Blockchain Verified
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Fabric ledger synchronized</div>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.featuresInner}>
            <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, margin: "0 0 16px 0" }}>Unified Supply Chain Intelligence</h2>
              <p style={{ color: "#94a3b8", fontSize: 18, lineHeight: 1.6, margin: 0 }}>Every touchpoint monitored. Every transition verified. Ensure compliance without compromising efficiency.</p>
            </div>
            
            <div className={styles.featuresGrid}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>📦</div>
                <div className={styles.featureTitle}>Shipment Traceability</div>
                <div className={styles.featureDesc}>Track batches across the entire supply chain with pinpoint accuracy and granular event logging.</div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🌡️</div>
                <div className={styles.featureTitle}>Temperature Monitoring</div>
                <div className={styles.featureDesc}>Integrate IoT sensors for real-time temperature logs and strict adherence to storage ranges.</div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>⚠️</div>
                <div className={styles.featureTitle}>Anomaly Detection</div>
                <div className={styles.featureDesc}>Proactive alerts for temperature excursions and expected delivery delays.</div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🔗</div>
                <div className={styles.featureTitle}>Blockchain Records</div>
                <div className={styles.featureDesc}>Immutable custody and event history backed by Hyperledger Fabric for unquestionable audits.</div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>📱</div>
                <div className={styles.featureTitle}>QR Verification</div>
                <div className={styles.featureDesc}>Instant validation at the point of care for hospitals and pharmacies.</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
