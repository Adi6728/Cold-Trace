"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Shipment, ShipmentEvent, Alert, AuthUserResponse } from "@/lib/api";
import styles from "../../components/Dashboard.module.css";

interface DashboardData {
  user: AuthUserResponse | null;
  totalProducts: number;
  totalBatches: number;
  activeShipments: number;
  totalSensors: number;
  openAlerts: number;
  recentEvents: (ShipmentEvent & { shipmentId: number })[];
  recentAlerts: (Alert & { shipmentId: number })[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    async function fetchDashboard(validToken: string) {
      try {
        const user = await api.me(validToken).catch(() => null);
        if (!user) throw new Error("Not logged in");

        const isPublicUser = user.role === 'USER' && !user.organization_id;

        const [products, batches, shipments, sensors] = await Promise.all([
          api.getProducts(validToken).catch(() => []),
          api.getBatches(validToken).catch(() => []),
          isPublicUser ? api.getPublicShipments(validToken).catch(() => []) : api.getShipments(validToken).catch(() => []),
          isPublicUser ? api.getPublicSensors(validToken).catch(() => []) : api.getSensors(validToken).catch(() => [])
        ]);

        const activeShipments = shipments.filter((s: Shipment) => s.status !== "DELIVERED");
        const activeSensors = sensors.filter((s: any) => s.status === 'ACTIVE');

        // Fetch events and alerts from ALL active shipments to calculate global KPIs
        let allEvents: (ShipmentEvent & { shipmentId: number })[] = [];
        let allAlerts: (Alert & { shipmentId: number })[] = [];

        await Promise.all(
          activeShipments.map(async (s: Shipment) => {
            try {
              const [events, alerts] = await Promise.all([
                isPublicUser ? api.getPublicShipmentEvents(validToken, s.id).catch(() => []) : api.getShipmentEvents(validToken, s.id).catch(() => []),
                isPublicUser ? api.getPublicShipmentAlerts(validToken, s.id).catch(() => []) : api.getShipmentAlerts(validToken, s.id).catch(() => [])
              ]);
              allEvents.push(...events.map((e: ShipmentEvent) => ({ ...e, shipmentId: s.id })));
              allAlerts.push(...alerts.map((a: Alert) => ({ ...a, shipmentId: s.id })));
            } catch (err) {
              console.warn("Failed fetching details for shipment", s.id);
            }
          })
        );

        // Sort descending by timestamp
        allEvents.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
        allAlerts.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());

        const openAlertsCount = allAlerts.filter(a => a.status === 'OPEN').length;

        setData({
          user,
          totalProducts: products.length,
          totalBatches: batches.length,
          activeShipments: activeShipments.length,
          totalSensors: activeSensors.length,
          openAlerts: openAlertsCount,
          recentEvents: allEvents.slice(0, 5),
          recentAlerts: allAlerts.slice(0, 5),
        });
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard(token);
  }, []);

  if (error) {
    return (
      <div className={styles.dashboardContainer}>
        <div style={{ padding: 24, background: "var(--bg-danger)", color: "var(--color-danger)", borderRadius: 8, border: "1px solid #fecaca" }}>
          {error}
        </div>
      </div>
    );
  }

  const hasAlerts = (data?.openAlerts ?? 0) > 0;
  const userName = data?.user ? data.user.email.split('@')[0] : "User";
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.dashboardContainer}>
      
      {/* Welcome Header */}
      <div className={styles.welcomeHeader}>
        <h1 className={styles.welcomeTitle}>Welcome, {loading ? "..." : userName}</h1>
        <p className={styles.welcomeSubtitle}>ColdChain Traceability - {currentDate}</p>
      </div>

      {/* Start Here Banner (Primary Overview) */}
      <div className={styles.startHereBanner}>
        <div className={styles.startHereTop}>
          <div>
            <div className={styles.startHereTitle}>System Overview</div>
            <h2 className={styles.startHereMetric}>
              {loading ? "..." : `${data?.activeShipments} Shipments in Transit`}
            </h2>
            <p className={styles.startHereDesc}>
              {loading 
                ? "Loading system status..." 
                : hasAlerts 
                  ? `Attention required: ${data?.openAlerts} open alerts detected across active shipments.` 
                  : "All active shipments are healthy and within required thresholds."}
            </p>
          </div>
          <Link href="/shipments">
            <button className={styles.startHereAction}>View Shipments</button>
          </Link>
        </div>
        
        {/* Simple inline progress indicator style for visual fill */}
        <div style={{ display: 'flex', gap: '2px', height: '6px', width: '100%', marginTop: '8px' }}>
          <div style={{ flex: 1, background: hasAlerts ? 'var(--color-warning)' : '#111111', borderRadius: '4px' }}></div>
          <div style={{ flex: 3, background: 'var(--bg-neutral)', borderRadius: '4px' }}></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Total Products</span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardValue}>{loading ? "-" : data?.totalProducts}</div>
          </div>
          <div className={styles.cardFooter}>Master Data</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Total Batches</span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardValue}>{loading ? "-" : data?.totalBatches}</div>
          </div>
          <div className={styles.cardFooter}>Master Data</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Active Sensors</span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardValue}>{loading ? "-" : data?.totalSensors}</div>
          </div>
          <div className={styles.cardFooter}>Hardware Devices</div>
        </div>
      </div>

      {/* Activity Columns */}
      <div className={styles.activitySection}>
        {/* Events Column */}
        <div className={styles.feedContainer}>
          <h2 className={styles.feedTitle}>Recent Shipment Events</h2>
          {loading ? (
            <div>
              <div className={styles.skeletonFeed}></div>
              <div className={styles.skeletonFeed}></div>
              <div className={styles.skeletonFeed}></div>
            </div>
          ) : data?.recentEvents.length === 0 ? (
            <div className={styles.emptyState}>No recent events to display.</div>
          ) : (
            <div className={styles.feedList}>
              {data?.recentEvents.map(event => (
                <Link key={event.id} href={`/shipments/${event.shipmentId}`} className={styles.linkItem}>
                  <div className={styles.feedItem}>
                    <div className={styles.feedHeader}>
                      <span className={styles.feedType}>{event.event_type}</span>
                      <span className={styles.feedTime}>
                        {new Date(event.occurred_at).toLocaleDateString()} <br/>
                        {new Date(event.occurred_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className={styles.feedDesc}>
                      <span style={{ fontWeight: 600 }}>Shipment #{event.shipmentId}</span>
                      <br/>
                      <span style={{ color: "var(--text-secondary)" }}>{event.location || 'Location unspecified'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Alerts Column */}
        <div className={styles.feedContainer}>
          <h2 className={styles.feedTitle}>Recent Alerts</h2>
          {loading ? (
            <div>
              <div className={styles.skeletonFeed}></div>
              <div className={styles.skeletonFeed}></div>
              <div className={styles.skeletonFeed}></div>
            </div>
          ) : data?.recentAlerts.length === 0 ? (
            <div className={styles.emptyState}>No recent alerts found.</div>
          ) : (
            <div className={styles.feedList}>
              {data?.recentAlerts.map(alert => {
                const isCritical = alert.severity === 'CRITICAL';
                const isHigh = alert.severity === 'HIGH';
                const feedClass = `${styles.feedItem} ${isCritical ? styles.feedItemAlertCritical : isHigh ? styles.feedItemAlertHigh : styles.feedItemAlert}`;
                
                return (
                <Link key={alert.id} href={`/shipments/${alert.shipmentId}`} className={styles.linkItem}>
                  <div className={feedClass}>
                    <div className={styles.feedHeader}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className={styles.feedType} style={{ color: isCritical ? 'var(--color-danger)' : isHigh ? '#9a3412' : '#854d0e' }}>
                          {alert.severity} Alert
                        </span>
                      </div>
                      <span className={styles.feedTime}>
                        {new Date(alert.detected_at).toLocaleDateString()} <br/>
                        {new Date(alert.detected_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className={styles.feedDesc}>
                      <div style={{ fontWeight: 600 }}>Shipment #{alert.shipmentId} &middot; Sensor {alert.sensor_id}</div>
                      <div>Latest Temp: <strong>{alert.latest_temperature}°C</strong></div>
                      {alert.message && <div style={{ marginTop: 4, color: "var(--text-secondary)" }}>{alert.message}</div>}
                    </div>
                  </div>
                </Link>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
