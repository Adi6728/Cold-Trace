"use client";

import { useEffect, useState } from "react";
import { api, Shipment, ShipmentEvent, Alert } from "@/lib/api";
import DashboardCard from "../../components/DashboardCard";
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

        // Fetch events and alerts from ALL active shipments to calculate global KPIs (Client-side aggregation)
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

  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.pageTitle}>Dashboard Overview</h1>

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
          trend="Action Required"
          loading={loading}
        />
        <DashboardCard 
          title="Active Sensors" 
          value={data?.totalSensors ?? 0} 
          icon="🌡️" 
          loading={loading}
        />
      </div>

      <div style={{ marginBottom: 16, fontSize: 12, color: "#64748b" }}>
        * Note: Open Alerts and Recent Activity are aggregated client-side across all active shipments due to missing global backend APIs.
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
                <div key={event.id} className={styles.feedItem}>
                  <div className={styles.feedHeader}>
                    <span className={styles.feedType}>{event.event_type}</span>
                    <span className={styles.feedTime}>{new Date(event.occurred_at).toLocaleString()}</span>
                  </div>
                  <div className={styles.feedDesc}>
                    Shipment #{event.shipmentId} • {event.location || 'No location'}
                    {event.description && ` - ${event.description}`}
                  </div>
                </div>
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
              {data?.recentAlerts.map(alert => (
                <div key={alert.id} className={styles.feedItem}>
                  <div className={styles.feedHeader}>
                    <span className={styles.feedType} style={{ color: alert.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b' }}>
                      {alert.severity} ALERT
                    </span>
                    <span className={styles.feedTime}>{new Date(alert.detected_at).toLocaleString()}</span>
                  </div>
                  <div className={styles.feedDesc}>
                    Shipment #{alert.shipmentId} • Sensor #{alert.sensor_id}
                    <br />
                    {alert.message} ({alert.latest_temperature}°C)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
