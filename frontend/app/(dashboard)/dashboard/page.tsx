"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Shipment, ShipmentEvent, Alert } from "@/lib/api";
import DashboardCard from "../../components/DashboardCard";
import Badge from "../../components/Badge";
import styles from "../../components/Dashboard.module.css";

interface DashboardData {
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
        const [products, batches, shipments, sensors] = await Promise.all([
          api.getProducts(validToken).catch(() => []),
          api.getBatches(validToken).catch(() => []),
          api.getShipments(validToken).catch(() => []),
          api.getSensors(validToken).catch(() => [])
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
                api.getShipmentEvents(validToken, s.id).catch(() => []),
                api.getShipmentAlerts(validToken, s.id).catch(() => [])
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
        <div style={{ padding: 24, background: "#fef2f2", color: "#991b1b", borderRadius: 8, border: "1px solid #fecaca" }}>
          {error}
        </div>
      </div>
    );
  }

  const hasAlerts = (data?.openAlerts ?? 0) > 0;

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Dashboard Overview</h1>
        <p className={styles.pageSubtitle}>Monitor global shipment operations, active sensors, and critical alerts.</p>
      </div>

      <div className={styles.statsGrid}>
        <DashboardCard 
          title="Total Products" 
          value={data?.totalProducts ?? 0} 
          icon="📦" 
          loading={loading}
        />
        <DashboardCard 
          title="Total Batches" 
          value={data?.totalBatches ?? 0} 
          icon="🏭" 
          loading={loading}
        />
        <DashboardCard 
          title="Active Shipments" 
          value={data?.activeShipments ?? 0} 
          icon="🚚" 
          trend="In Transit"
          loading={loading}
        />
        <DashboardCard 
          title="Open Alerts" 
          value={data?.openAlerts ?? 0} 
          icon="⚠️"
          trend={hasAlerts ? "Action Required" : "All Clear"}
          type={hasAlerts ? "error" : "default"}
          loading={loading}
        />
        <DashboardCard 
          title="Active Sensors" 
          value={data?.totalSensors ?? 0} 
          icon="🌡️" 
          loading={loading}
        />
      </div>

      <div className={styles.activitySection}>
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
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className={styles.feedType}>{event.event_type}</span>
                      </div>
                      <span className={styles.feedTime}>
                        {new Date(event.occurred_at).toLocaleDateString()} <br/>
                        {new Date(event.occurred_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className={styles.feedDesc}>
                      <span style={{ fontWeight: 500, color: "#334155" }}>Shipment #{event.shipmentId}</span>
                      <br/>
                      <span style={{ color: "#94a3b8" }}>📍</span> {event.location || 'Location unspecified'}
                      {event.description && <div style={{ marginTop: 4, padding: 8, background: "rgba(255,255,255,0.6)", borderRadius: 6 }}>{event.description}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

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
                        <span className={styles.feedType} style={{ color: isCritical ? '#991b1b' : isHigh ? '#9a3412' : '#854d0e' }}>
                          {alert.severity} Alert
                        </span>
                        <Badge status={alert.status === 'OPEN' ? 'error' : alert.status === 'ACKNOWLEDGED' ? 'warning' : 'default'}>{alert.status}</Badge>
                      </div>
                      <span className={styles.feedTime}>
                        {new Date(alert.detected_at).toLocaleDateString()} <br/>
                        {new Date(alert.detected_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className={styles.feedDesc}>
                      <div style={{ display: "flex", gap: 16, marginBottom: 8, fontWeight: 500, color: "#334155" }}>
                        <span>Shipment #{alert.shipmentId}</span>
                        <span>Sensor {alert.sensor_id}</span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.5)", padding: 8, borderRadius: 6 }}>
                        <span style={{ color: "#64748b" }}>Latest Temp:</span> <strong>{alert.latest_temperature}°C</strong>
                        {alert.message && <div style={{ marginTop: 4 }}>{alert.message}</div>}
                      </div>
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
