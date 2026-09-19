"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Shipment, ShipmentEvent, CustodyTransfer, AuthUserResponse, Alert, Batch, Product, Sensor, SensorReading } from "@/lib/api";
import { canPerformAction } from "@/lib/rbac";
import Badge from "@/app/components/Badge";

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

        // Load sensors (Missing API capability: Cannot query sensors by shipment_id directly)
        // Workaround: fetch sensors (up to limit) and find the one for this shipment.
        try {
          // LIMITATION: GET /sensors currently has no shipment_id filter.
          // We fetch all sensors and filter on the client side.
          // This will be addressed during Step 9.3B telemetry work.
          const allSensors = await api.getSensors(token!);
          const matchedSensor = allSensors.find(s => s.shipment_id === Number(id));
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Timeline */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)" }}>
          <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Timeline</h2>
          {events.length === 0 ? <p style={{ color: "#6b7280" }}>No events recorded.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {events.slice().sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()).map(ev => (
                <div key={ev.id} style={{ borderLeft: "3px solid #e5e7eb", paddingLeft: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 600 }}>{ev.event_type}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(ev.occurred_at).toLocaleString()}</div>
                  </div>
                  {ev.location && <div style={{ fontSize: 14, color: "#374151", marginTop: 4 }}>{ev.location}</div>}
                  {ev.description && <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>{ev.description}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Custody Transfers */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)" }}>
          <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Custody Transfers</h2>
          {custodyTransfers.length === 0 ? <p style={{ color: "#6b7280" }}>No transfers recorded.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {custodyTransfers.slice().sort((a, b) => new Date(b.transferred_at).getTime() - new Date(a.transferred_at).getTime()).map(ct => (
                <div key={ct.id} style={{ background: "#f9fafb", padding: 12, borderRadius: 8, border: "1px solid #f3f4f6" }}>
                  <div style={{ fontWeight: 500 }}>Org {ct.from_organization_id} &rarr; Org {ct.to_organization_id}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", margin: "4px 0" }}>{new Date(ct.transferred_at).toLocaleString()}</div>
                  {ct.notes && <div style={{ fontSize: 14, color: "#4b5563" }}>{ct.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Alerts Section */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)" }}>
          <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Alerts</h2>
          {alerts.length === 0 ? <p style={{ color: "#6b7280" }}>No active alerts.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.slice().sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()).map(al => (
                <div key={al.id} style={{ 
                  background: al.severity === 'CRITICAL' ? '#fee2e2' : al.severity === 'HIGH' ? '#ffedd5' : '#fef3c7',
                  padding: 16, borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)" 
                }}>
                  <div style={{ fontWeight: 600, color: al.severity === 'CRITICAL' ? '#991b1b' : al.severity === 'HIGH' ? '#9a3412' : '#92400e', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{al.severity} Alert</span>
                    <Badge status={al.status === 'OPEN' ? 'error' : 'success'}>{al.status}</Badge>
                  </div>
                  <div style={{ fontSize: 14, marginTop: 8 }}>Sensor: {al.sensor_id} | Latest: {al.latest_temperature}°C</div>
                  {al.message && <div style={{ fontSize: 14, marginTop: 4 }}>{al.message}</div>}
                  <div style={{ fontSize: 12, marginTop: 8, color: "#4b5563" }}>
                    Detected: {new Date(al.detected_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Telemetry Section */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Sensor Telemetry</h2>
            {sensor && <Badge status={sensor.status === "ACTIVE" ? "success" : "default"}>{sensor.sensor_code}</Badge>}
          </div>
          
          {!sensor ? (
             <p style={{ color: "#6b7280" }}>No sensor linked to this shipment.</p>
          ) : readings.length === 0 ? (
             <p style={{ color: "#6b7280" }}>No readings available from this sensor.</p>
          ) : (
             <div style={{ maxHeight: 300, overflowY: "auto" }}>
               <table className={tableStyles.table}>
                 <thead>
                   <tr>
                     <th>Time</th>
                     <th>Temp (°C)</th>
                     <th>Humidity (%)</th>
                   </tr>
                 </thead>
                 <tbody>
                   {readings.slice().sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()).map(r => (
                     <tr key={r.id}>
                       <td>{new Date(r.recorded_at).toLocaleString()}</td>
                       <td>
                         <span style={{ 
                           fontWeight: 500,
                           color: product && (r.temperature < product.storage_min_temp || r.temperature > product.storage_max_temp) ? "#dc2626" : "inherit"
                         }}>
                           {r.temperature.toFixed(1)}
                         </span>
                       </td>
                       <td>{r.humidity != null ? r.humidity.toFixed(1) : "-"}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          )}
        </section>
      </div>

    </main>
  );
}
