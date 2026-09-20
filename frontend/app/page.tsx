"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./landing.module.css";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      {/* 1. HEADER */}
      <header className={styles.header}>
        <div className={styles.logo}>Cold Trace</div>
        <nav className={styles.nav}>
          <a href="#how-it-works" className={styles.navLink}>How It Works</a>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="#users" className={styles.navLink}>Users</a>
          <a href="#blockchain" className={styles.navLink}>Blockchain</a>
          <a href="#about" className={styles.navLink}>About</a>
        </nav>
        <Link href="/login" className={styles.loginBtn}>
          Log In &rarr;
        </Link>
      </header>

      {/* 2. HERO */}
      <section className={styles.heroSection}>
        <div className={styles.heroInner}>
          <div>
            <span className={styles.heroKicker}>Trace &nbsp; Monitor &nbsp; Protect</span>
            <h1 className={styles.heroHeadline}>Safer Medicines<br/>Through Complete Visibility.</h1>
            <p className={styles.heroSub}>
              Cold Trace provides end-to-end traceability, real-time temperature monitoring and tamper-evident records for pharmaceutical cold chain shipments.
            </p>
            <div className={styles.heroCtaGroup}>
              <Link href="/login" className={styles.primaryBtn}>Get Started &rarr;</Link>
              <Link href="/verify" className={styles.outlineBtn}>Explore the System</Link>
            </div>
            
            <div className={styles.heroStatsRow}>
              <div className={styles.statBlock}>
                <h4>100%</h4>
                <p>Traceability</p>
              </div>
              <div className={styles.statBlock}>
                <h4>Real-time</h4>
                <p>Temperature Monitoring</p>
              </div>
              <div className={styles.statBlock}>
                <h4>Tamper-evident</h4>
                <p>Blockchain Records</p>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.floatingCard}>
              <div className={styles.floatingCardHeader}>
                <span className={styles.floatingCardKicker}>Live Shipment</span>
                <span className={styles.floatingCardPlane}>➔</span>
              </div>
              <h3 className={styles.floatingCardTitle}>SHIP-001</h3>
              <p className={styles.floatingCardRoute}>Delhi &rarr; Mumbai</p>
              
              <div className={styles.floatingCardMetrics}>
                <div className={styles.floatingCardTemp}>
                  T: 4.8°C
                </div>
                <div className={styles.floatingCardStatus}>In Transit</div>
              </div>

              <div className={styles.floatingCardDetails}>
                <div>
                  <div className={styles.floatingCardLabel}>Product</div>
                  <div className={styles.floatingCardVal}>Vaccine</div>
                </div>
                <div>
                  <div className={styles.floatingCardLabel}>Batch</div>
                  <div className={styles.floatingCardVal}>VAC-2026-01</div>
                </div>
                <div>
                  <div className={styles.floatingCardLabel}>Last Updated</div>
                  <div className={styles.floatingCardVal}>2 mins ago</div>
                </div>
              </div>
            </div>
            
            <div className={styles.heroNote}>Because every degree matters.</div>
          </div>
        </div>
      </section>

      {/* WAVE 1 (Dark to Cream) */}
      <div className={styles.waveContainer} style={{ background: '#F4EBE1' }}>
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path fill="#111111" d="M0,0 C480,120 960,60 1440,20 L1440,0 L0,0 Z"></path>
        </svg>
      </div>

      {/* 3. WHAT IS COLD TRACE */}
      <section className={styles.bgCream}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionGrid}>
            <div>
              <span className={styles.sectionHeaderKicker}>What is Cold Trace?</span>
              <h2 className={styles.sectionHeaderTitle}>A complete traceability platform for pharmaceutical cold chains.</h2>
              <p className={styles.sectionHeaderText}>
                Cold Trace connects manufacturers, logistics providers, warehouses, hospitals and regulators on a single, transparent platform to ensure medicines remain safe, effective and traceable from origin to delivery.
              </p>
              <Link href="/login" className={styles.darkBtn}>Learn More &rarr;</Link>
            </div>
            <div className={styles.featureGrid}>
              <div className={styles.featureItem}>
                <div className={`${styles.shapeBase} ${styles.shapeSquare}`}></div>
                <h4 className={styles.featureTitle}>Products & Batches</h4>
                <p className={styles.featureText}>Register and manage pharmaceutical products and batches.</p>
              </div>
              <div className={styles.featureItem}>
                <div className={`${styles.shapeBase} ${styles.shapePill}`}></div>
                <h4 className={styles.featureTitle}>Shipments</h4>
                <p className={styles.featureText}>Track shipments across the supply chain in real time.</p>
              </div>
              <div className={styles.featureItem}>
                <div className={`${styles.shapeBase} ${styles.shapeCircle}`}></div>
                <h4 className={styles.featureTitle}>Sensors</h4>
                <p className={styles.featureText}>Monitor temperature and environmental conditions.</p>
              </div>
              <div className={styles.featureItem}>
                <div className={`${styles.shapeBase} ${styles.shapeLeaf}`}></div>
                <h4 className={styles.featureTitle}>Blockchain</h4>
                <p className={styles.featureText}>Tamper-evident records on Hyperledger Fabric.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WAVE 2 (Cream to White) */}
      <div className={styles.waveContainer} style={{ background: '#ffffff' }}>
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path fill="#F4EBE1" d="M0,40 C320,100 960,-20 1440,80 L1440,0 L0,0 Z"></path>
        </svg>
      </div>

      {/* 4. HOW IT WORKS */}
      <section className={styles.bgWhite} id="how-it-works">
        <div className={styles.sectionInner}>
          <div className={styles.sectionGrid}>
            <div>
              <span className={styles.sectionHeaderKicker}>How it works</span>
              <h2 className={styles.sectionHeaderTitle}>From manufacturer to patient, every step is recorded.</h2>
            </div>
            <div className={styles.flowContainer}>
              <div className={styles.flowItem}>
                <div className={`${styles.flowIconWrapper} ${styles.shapeSquare}`}></div>
                <h4 className={styles.flowTitle}>Manufacturer</h4>
                <p className={styles.flowText}>Create product and batch</p>
              </div>
              <div className={styles.flowArrow}>&rarr;</div>
              
              <div className={styles.flowItem}>
                <div className={`${styles.flowIconWrapper} ${styles.shapePill}`}></div>
                <h4 className={styles.flowTitle}>Batch</h4>
                <p className={styles.flowText}>Assign details and compliance</p>
              </div>
              <div className={styles.flowArrow}>&rarr;</div>
              
              <div className={styles.flowItem}>
                <div className={`${styles.flowIconWrapper} ${styles.shapeArch}`}></div>
                <h4 className={styles.flowTitle}>Shipment</h4>
                <p className={styles.flowText}>Dispatch with IoT sensors</p>
              </div>
              <div className={styles.flowArrow}>&rarr;</div>
              
              <div className={styles.flowItem}>
                <div className={`${styles.flowIconWrapper} ${styles.shapeCircle}`}></div>
                <h4 className={styles.flowTitle}>Monitoring</h4>
                <p className={styles.flowText}>Track conditions in real time</p>
              </div>
              <div className={styles.flowArrow}>&rarr;</div>
              
              <div className={styles.flowItem}>
                <div className={`${styles.flowIconWrapper} ${styles.shapeBlob}`}></div>
                <h4 className={styles.flowTitle}>Alerts</h4>
                <p className={styles.flowText}>Detect and handle anomalies</p>
              </div>
              <div className={styles.flowArrow}>&rarr;</div>
              
              <div className={styles.flowItem}>
                <div className={`${styles.flowIconWrapper} ${styles.shapeLeaf}`}></div>
                <h4 className={styles.flowTitle}>Blockchain</h4>
                <p className={styles.flowText}>Record key events tamper-evidently</p>
              </div>
              <div className={styles.flowArrow}>&rarr;</div>
              
              <div className={styles.flowItem}>
                <div className={`${styles.flowIconWrapper} ${styles.shapeSquare}`}></div>
                <h4 className={styles.flowTitle}>Hospital</h4>
                <p className={styles.flowText}>Receive and verify</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WAVE 3 (White to Cream) */}
      <div className={styles.waveContainer} style={{ background: '#F4EBE1' }}>
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path fill="#ffffff" d="M0,100 C640,0 960,120 1440,40 L1440,0 L0,0 Z"></path>
        </svg>
      </div>

      {/* 5. WHY CHOOSE COLD TRACE */}
      <section className={styles.bgCream}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionGrid}>
            <div>
              <span className={styles.sectionHeaderKicker}>Why choose Cold Trace?</span>
              <h2 className={styles.sectionHeaderTitle}>Built for a safer, more transparent supply chain.</h2>
            </div>
            <div className={styles.capGrid}>
              <div className={styles.capItem}>
                <div className={`${styles.shapeBase} ${styles.shapeCircle}`}></div>
                <div>
                  <h4 className={styles.featureTitle}>End-to-end Visibility</h4>
                  <p className={styles.featureText}>Track every shipment across the supply chain.</p>
                </div>
              </div>
              <div className={styles.capItem}>
                <div className={`${styles.shapeBase} ${styles.shapeSquare}`}></div>
                <div>
                  <h4 className={styles.featureTitle}>Product Integrity</h4>
                  <p className={styles.featureText}>Ensure medicines stay within safe conditions.</p>
                </div>
              </div>
              <div className={styles.capItem}>
                <div className={`${styles.shapeBase} ${styles.shapePill}`}></div>
                <div>
                  <h4 className={styles.featureTitle}>Multi-party Collaboration</h4>
                  <p className={styles.featureText}>Connect all stakeholders on one platform.</p>
                </div>
              </div>
              <div className={styles.capItem}>
                <div className={`${styles.shapeBase} ${styles.shapeArch}`}></div>
                <div>
                  <h4 className={styles.featureTitle}>Regulatory Confidence</h4>
                  <p className={styles.featureText}>Provide transparent, verifiable records.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WAVE 4 (Cream to Dark) */}
      <div className={styles.waveContainer} style={{ background: '#111111' }}>
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path fill="#F4EBE1" d="M0,80 C480,120 960,20 1440,60 L1440,0 L0,0 Z"></path>
        </svg>
      </div>

      {/* 6. FINAL CTA & FOOTER */}
      <section className={styles.bgDark}>
        <div className={styles.sectionInner}>
          
          <div className={styles.finalCta}>
            <div className={styles.finalCtaLeft}>
              <span className={styles.sectionHeaderKicker} style={{ color: '#888' }}>Ready to trace the journey?</span>
              <h2 className={styles.finalCtaTitle}>Follow the journey. Verify the record.</h2>
              <p className={styles.finalCtaText}>
                Join Cold Trace to build a safer, more transparent pharmaceutical supply chain. 
                Log in to your workspace or explore our public verification tools.
              </p>
            </div>
            <div className={styles.finalCtaRight}>
              <Link href="/login" className={styles.primaryBtn} style={{ background: '#F4EBE1' }}>Get Started &rarr;</Link>
              <Link href="/login" className={styles.outlineBtn}>Log In</Link>
              <div className={styles.finalNote}>
                A safer<br/>tomorrow<br/>is traceable.
              </div>
            </div>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerInner}>
              <div>
                <div className={styles.footerBrand}>
                  Cold Trace
                  <div className={styles.footerBrandDivider}></div>
                  <span className={styles.footerBrandDesc}>Enterprise-grade traceability for the pharmaceutical cold chain.</span>
                </div>
              </div>
              
              <div>
                <h4 className={styles.footerColTitle}>Product</h4>
                <ul className={styles.footerList}>
                  <li><a href="#how-it-works">How It Works</a></li>
                  <li><a href="#capabilities">Capabilities</a></li>
                  <li><a href="#users">Users</a></li>
                </ul>
              </div>

              <div>
                <h4 className={styles.footerColTitle}>System</h4>
                <ul className={styles.footerList}>
                  <li><Link href="/login">Operational Workspace</Link></li>
                  <li><Link href="/verify">Public Verification</Link></li>
                  <li><Link href="/dashboard">Dashboard</Link></li>
                </ul>
              </div>

              <div>
                <h4 className={styles.footerColTitle}>Company</h4>
                <ul className={styles.footerList}>
                  <li><a href="#about">About</a></li>
                  <li><a href="#docs">Documentation</a></li>
                  <li><a href="#contact">Contact</a></li>
                </ul>
              </div>
            </div>
            
            <div className={styles.footerBottom}>
              <span>&copy; {new Date().getFullYear()} Cold Trace. All rights reserved.</span>
              <div className={styles.socialIcons}>
                <span>in</span>
                <span>gh</span>
                <span>@</span>
              </div>
            </div>
          </footer>
          
        </div>
      </section>
    </div>
  );
}
