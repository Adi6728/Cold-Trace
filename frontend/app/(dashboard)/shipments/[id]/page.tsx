"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Shipment, ShipmentEvent, CustodyTransfer, AuthUserResponse, Alert, Batch, Product, Sensor, SensorReading } from "@/lib/api";
import { canPerformAction } from "@/lib/rbac";
import Badge from "@/app/components/Badge";
import TelemetryChart from "@/app/components/TelemetryChart";

// Reusing CSS modules
import tableStyles from "@/app/components/Table.module.css";
import formStyles from "@/app/components/Form.module.css";

export default function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [custodyTransfers, setCustodyTransfers] = useState<CustodyTransfer[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // Sensor state
  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [eventType, setEventType] = useState("CREATED");
  const [eventDesc, setEventDesc] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventError, setEventError] = useState<string | null>(null);

  const [toOrgId, setToOrgId] = useState<number | "">("");
  const [custodyNotes, setCustodyNotes] = useState("");
  const [custodyDate, setCustodyDate] = useState("");
  const [custodyError, setCustodyError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadData() {
      try {
        const userData = await api.me(token!);
        setUser(userData);
        
        const shipmentData = await api.getShipment(token!, Number(id));
        setShipment(shipmentData);

        // Load Batch and Product
        let productData: Product | null = null;
        try {
          const batchData = await api.getBatch(token!, shipmentData.batch_id);
          setBatch(batchData);
          productData = await api.getProduct(token!, batchData.product_id);
          setProduct(productData);
        } catch (e) {
          console.warn("Failed to load batch or product", e);
        }

        // Parallel load of events, custody, alerts
        const [eventsData, custodyData, alertsData] = await Promise.all([
          api.getShipmentEvents(token!, Number(id)).catch(() => [] as ShipmentEvent[]),
          api.getCustodyTransfers(token!, Number(id)).catch(() => [] as CustodyTransfer[]),
          api.getShipmentAlerts(token!, Number(id)).catch(() => [] as Alert[])
        ]);

        setEvents(eventsData);
        setCustodyTransfers(custodyData);
        setAlerts(alertsData);

        // Load sensors using new shipmentId filter capability
        try {
          const allSensors = await api.getSensors(token!, Number(id));
          const matchedSensor = allSensors[0];
          if (matchedSensor) {
            setSensor(matchedSensor);
            const readingsData = await api.getSensorReadings(token!, matchedSensor.id);
            setReadings(readingsData);
          }
        } catch (e) {
          console.warn("Failed to load sensors or readings", e);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shipment details.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router]);

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setEventError(null);
    const token = localStorage.getItem("access_token");
    if (!token || !user) return;

    try {
      const newEvent = await api.createShipmentEvent(token, Number(id), {
        event_type: eventType,
        description: eventDesc,
        location: eventLocation,
        occurred_at: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
      });
      setEvents([...events, newEvent]);
      setEventDesc("");
      setEventLocation("");
      setEventDate("");
    } catch (err) {
      setEventError(err instanceof Error ? err.message : "Failed to create event.");
    }
  }

  async function handleCreateCustody(e: React.FormEvent) {
    e.preventDefault();
    setCustodyError(null);
    if (!toOrgId) return;

    const token = localStorage.getItem("access_token");
    if (!token || !user) return;

    try {
      const newTransfer = await api.createCustodyTransfer(token, Number(id), {
        from_organization_id: user.organization_id || user.id,
        to_organization_id: Number(toOrgId),
        transferred_at: custodyDate ? new Date(custodyDate).toISOString() : new Date().toISOString(),
        notes: custodyNotes,
      });
      setCustodyTransfers([...custodyTransfers, newTransfer]);
      setToOrgId("");
      setCustodyNotes("");
      setCustodyDate("");
    } catch (err) {
      setCustodyError(err instanceof Error ? err.message : "Failed to record custody transfer.");
    }
  }

  async function handleAcknowledgeAlert(alertId: number) {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const updatedAlert = await api.acknowledgeAlert(token, alertId);
      setAlerts(alerts.map(a => a.id === alertId ? updatedAlert : a));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to acknowledge alert");
    }
  }

  async function handleResolveAlert(alertId: number) {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const updatedAlert = await api.resolveAlert(token, alertId);
      setAlerts(alerts.map(a => a.id === alertId ? updatedAlert : a));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resolve alert");
    }
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Loading shipment details...</main>;
  }

  if (error || !shipment) {
    return (
      <main style={{ padding: 32 }}>
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 16, borderRadius: 8 }}>
          {error || "Shipment not found."}
        </div>
      </main>
    );
  }

  const canCreateEvent = user && canPerformAction(user.role, "CREATE_SHIPMENT_EVENT");
  const canCreateCustody = user && canPerformAction(user.role, "CREATE_CUSTODY_TRANSFER");
  const canManageAlerts = user && canPerformAction(user.role, "MANAGE_ALERTS");
  const showControls = canCreateEvent || canCreateCustody;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 32, display: "flex", flexDirection: "column", gap: 32 }}>
      
      {/* Header Section */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 16 }}>
            Shipment #{shipment.id}
            <Badge status={shipment.status === "DELIVERED" ? "success" : shipment.status === "IN_TRANSIT" ? "warning" : "default"}>
              {shipment.status}
            </Badge>
          </h1>
          <p style={{ color: "#4b5563", margin: "8px 0 0 0" }}>
            Route: Org {shipment.origin_organization_id} &rarr; Org {shipment.destination_organization_id}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, color: "#4b5563" }}>Started: {shipment.started_at ? new Date(shipment.started_at).toLocaleDateString() : "Pending"}</div>
          <div style={{ fontSize: 14, color: "#4b5563" }}>Expected: {shipment.expected_delivery_at ? new Date(shipment.expected_delivery_at).toLocaleDateString() : "N/A"}</div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Product / Batch Summary */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)" }}>
          <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Batch & Product Info</h2>
          {!batch || !product ? (
             <p style={{ color: "#6b7280" }}>No batch/product information available.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>Product Name</div>
                <div style={{ fontWeight: 500 }}>{product.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>Batch Number</div>
                <div style={{ fontWeight: 500 }}>{batch.batch_number}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>Quantity</div>
                <div style={{ fontWeight: 500 }}>{batch.quantity} units</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>Storage Temp</div>
                <div style={{ fontWeight: 500 }}>{product.storage_min_temp}°C to {product.storage_max_temp}°C</div>
              </div>
            </div>
          )}
        </section>

        {/* Action Controls (Role Aware) */}
        {showControls ? (
          <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)", display: "flex", gap: 24 }}>
            {canCreateEvent && (
              <div style={{ flex: 1 }}>
                <h3 style={{ marginTop: 0, fontSize: 16 }}>Add Event</h3>
                <form onSubmit={handleCreateEvent} className={formStyles.form} style={{ gap: 8 }}>
                  {eventError && <div className={formStyles.error}>{eventError}</div>}
                  <select value={eventType} onChange={e => setEventType(e.target.value)} className={formStyles.input}>
                    <option value="CREATED">Created</option>
                    <option value="DISPATCHED">Dispatched</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="RECEIVED">Received</option>
                    <option value="DELAYED">Delayed</option>
                    <option value="HAZARD">Hazard</option>
                  </select>
                  <input placeholder="Location" value={eventLocation} onChange={e => setEventLocation(e.target.value)} className={formStyles.input} />
                  <input placeholder="Description" value={eventDesc} onChange={e => setEventDesc(e.target.value)} className={formStyles.input} />
                  <button type="submit" className={formStyles.button}>Submit Event</button>
                </form>
              </div>
            )}
            
            {canCreateCustody && (
              <div style={{ flex: 1 }}>
                <h3 style={{ marginTop: 0, fontSize: 16 }}>Transfer Custody</h3>
                <form onSubmit={handleCreateCustody} className={formStyles.form} style={{ gap: 8 }}>
                  {custodyError && <div className={formStyles.error}>{custodyError}</div>}
                  <input required type="number" min="1" placeholder="To Org ID" value={toOrgId} onChange={e => setToOrgId(e.target.value === "" ? "" : Number(e.target.value))} className={formStyles.input} />
                  <input placeholder="Notes" value={custodyNotes} onChange={e => setCustodyNotes(e.target.value)} className={formStyles.input} />
                  <button type="submit" className={formStyles.button} style={{ background: "#10b981" }}>Transfer</button>
                </form>
              </div>
            )}
          </section>
        ) : (
          <section style={{ background: "#f9fafb", borderRadius: 12, padding: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #d1d5db" }}>
            <p style={{ color: "#6b7280" }}>You have read-only access to this shipment.</p>
          </section>
        )}
      </div>

      {/* Shipment Journey Timeline */}
      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)", marginTop: 32 }}>
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Shipment Journey</h2>
        {events.length === 0 && custodyTransfers.length === 0 ? <p style={{ color: "#6b7280" }}>No journey activity recorded yet.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
            {/* Vertical Line */}
            <div style={{ position: "absolute", left: 15, top: 20, bottom: 20, width: 2, background: "#e2e8f0" }} />
            
            {[
              ...events.map(ev => ({ type: 'EVENT' as const, date: new Date(ev.occurred_at), data: ev })),
              ...custodyTransfers.map(ct => ({ type: 'CUSTODY' as const, date: new Date(ct.transferred_at), data: ct }))
            ]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((item, idx) => (
              <div key={`${item.type}-${item.data.id}`} style={{ display: "flex", gap: 16, position: "relative", paddingBottom: 32 }}>
                {/* Node marker */}
                <div style={{ 
                  width: 32, height: 32, borderRadius: 16, flexShrink: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  background: item.type === 'CUSTODY' ? "#8b5cf6" : "#3b82f6", color: "white", fontSize: 12, fontWeight: "bold",
                  border: "4px solid #fff", boxShadow: "0 0 0 1px #e2e8f0"
                }}>
                  {item.type === 'CUSTODY' ? 'CT' : 'EV'}
                </div>
                
                {/* Content Card */}
                <div style={{ 
                  flex: 1, padding: 16, borderRadius: 8,
                  background: item.type === 'CUSTODY' ? "#f5f3ff" : "#f0fdfa",
                  border: `1px solid ${item.type === 'CUSTODY' ? '#ddd6fe' : '#ccfbf1'}`
                }}>
                  {item.type === 'EVENT' ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>Event: {(item.data as ShipmentEvent).event_type}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{item.date.toLocaleString()}</div>
                      </div>
                      {(item.data as ShipmentEvent).location && <div style={{ fontSize: 14, color: "#334155", marginTop: 4 }}>📍 {(item.data as ShipmentEvent).location}</div>}
                      {(item.data as ShipmentEvent).description && <div style={{ fontSize: 14, color: "#475569", marginTop: 4 }}>{(item.data as ShipmentEvent).description}</div>}
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontWeight: 600, color: "#4c1d95" }}>Custody Transfer</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{item.date.toLocaleString()}</div>
                      </div>
                      <div style={{ fontSize: 14, color: "#5b21b6", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>Org {(item.data as CustodyTransfer).from_organization_id}</span>
                        <span>&rarr;</span>
                        <span>Org {(item.data as CustodyTransfer).to_organization_id}</span>
                      </div>
                      {(item.data as CustodyTransfer).notes && <div style={{ fontSize: 14, color: "#475569", marginTop: 8 }}>{(item.data as CustodyTransfer).notes}</div>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Alerts Section */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)" }}>
          <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Alerts</h2>
          {alerts.length === 0 ? <p style={{ color: "#6b7280" }}>No active alerts.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.slice().sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()).map(al => {
                const isResolved = al.status === "RESOLVED";
                const isAcknowledged = al.status === "ACKNOWLEDGED";
                const isOpen = al.status === "OPEN";

                return (
                <div key={al.id} style={{ 
                  background: isResolved ? '#f8fafc' : al.severity === 'CRITICAL' ? '#fee2e2' : al.severity === 'HIGH' ? '#ffedd5' : '#fef3c7',
                  padding: 16, borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)" 
                }}>
                  <div style={{ fontWeight: 600, color: isResolved ? '#475569' : al.severity === 'CRITICAL' ? '#991b1b' : al.severity === 'HIGH' ? '#9a3412' : '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: "center" }}>
                    <span>{al.severity} Alert</span>
                    <Badge status={isOpen ? 'error' : isAcknowledged ? 'warning' : 'success'}>{al.status}</Badge>
                  </div>
                  <div style={{ fontSize: 14, marginTop: 8 }}>Sensor: {al.sensor_id} | Latest Temp: {al.latest_temperature}°C</div>
                  {product && (
                    <div style={{ fontSize: 12, marginTop: 2, color: "#64748b" }}>
                      Allowed Range: {product.storage_min_temp}°C to {product.storage_max_temp}°C
                    </div>
                  )}
                  {al.message && <div style={{ fontSize: 14, marginTop: 8 }}>{al.message}</div>}
                  <div style={{ fontSize: 12, marginTop: 12, color: "#4b5563" }}>
                    <div>Detected: {new Date(al.detected_at).toLocaleString()}</div>
                    {al.acknowledged_at && <div>Acknowledged: {new Date(al.acknowledged_at).toLocaleString()}</div>}
                    {al.resolved_at && <div>Resolved: {new Date(al.resolved_at).toLocaleString()}</div>}
                  </div>
                  
                  {canManageAlerts && !isResolved && (
                    <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                      {isOpen && (
                        <button 
                          onClick={() => handleAcknowledgeAlert(al.id)}
                          style={{ padding: "6px 12px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                        >
                          Acknowledge
                        </button>
                      )}
                      <button 
                        onClick={() => handleResolveAlert(al.id)}
                        style={{ padding: "6px 12px", background: "#10b981", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32, marginTop: 32 }}>
        {/* Telemetry Section */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Sensor Telemetry</h2>
            {sensor && <Badge status={sensor.status === "ACTIVE" ? "success" : "default"}>{sensor.sensor_code}</Badge>}
          </div>
          
          {!sensor ? (
             <p style={{ color: "#6b7280" }}>No sensor linked to this shipment.</p>
          ) : readings.length === 0 ? (
             <p style={{ color: "#6b7280" }}>No readings available from this sensor.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {/* Telemetry Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                {(() => {
                  const latest = [...readings].sort((a,b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
                  const isNormal = product ? (latest.temperature >= product.storage_min_temp && latest.temperature <= product.storage_max_temp) : true;
                  return (
                    <>
                      <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Status</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: isNormal ? "#16a34a" : "#ef4444", marginTop: 4 }}>
                           {isNormal ? "NORMAL" : "OUT OF RANGE"}
                        </div>
                      </div>
                      <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Latest Temperature</div>
                        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: isNormal ? "#0f172a" : "#ef4444" }}>
                           {latest.temperature.toFixed(1)}°C
                        </div>
                      </div>
                      <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Latest Humidity</div>
                        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                           {latest.humidity != null ? `${latest.humidity.toFixed(1)}%` : "-"}
                        </div>
                      </div>
                      <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Last Updated</div>
                        <div style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>
                           {new Date(latest.recorded_at).toLocaleString()}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Chart */}
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 16, marginTop: 0 }}>Temperature History</h3>
                <TelemetryChart readings={readings} product={product} />
              </div>
            </div>
          )}
        </section>
      </div>

    </main>
  );
}
