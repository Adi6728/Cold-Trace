"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Shipment, ShipmentEvent, CustodyTransfer, AuthUserResponse, Alert, Batch, Product, Sensor, SensorReading, BlockchainRecord } from "@/lib/api";
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
  const [blockchainHistory, setBlockchainHistory] = useState<BlockchainRecord[] | null>(null);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);
  
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

  const [newSensorCode, setNewSensorCode] = useState("");
  const [sensorFormError, setSensorFormError] = useState<string | null>(null);

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
        const isPublicUser = userData.role === 'USER' && !userData.organization_id;
        
        const shipmentData = await (isPublicUser ? api.getPublicShipment(token!, Number(id)) : api.getShipment(token!, Number(id)));
        setShipment(shipmentData);

        // Load Batch and Product
        let productData: Product | null = null;
        let batchData: Batch | null = null;
        try {
          batchData = await api.getBatch(token!, shipmentData.batch_id);
          setBatch(batchData);
          productData = await api.getProduct(token!, batchData.product_id);
          setProduct(productData);
        } catch (e) {
          console.warn("Failed to load batch or product, falling back to embedded data", e);
          if (shipmentData.batch) {
             setBatch(shipmentData.batch as Batch);
             if (shipmentData.batch.product) {
                setProduct(shipmentData.batch.product as Product);
             }
          }
        }

        // Parallel load of events, custody, alerts, blockchain
        const [eventsData, custodyData, alertsData, bcData] = await Promise.all([
          isPublicUser ? api.getPublicShipmentEvents(token!, Number(id)).catch(() => [] as ShipmentEvent[]) : api.getShipmentEvents(token!, Number(id)).catch(() => [] as ShipmentEvent[]),
          isPublicUser ? Promise.resolve([]) : api.getCustodyTransfers(token!, Number(id)).catch(() => [] as CustodyTransfer[]),
          isPublicUser ? api.getPublicShipmentAlerts(token!, Number(id)).catch(() => [] as Alert[]) : api.getShipmentAlerts(token!, Number(id)).catch(() => [] as Alert[]),
          api.getShipmentBlockchainHistory(token!, Number(id)).catch(err => {
            setBlockchainError(err.message || "Fabric unavailable");
            return null;
          })
        ]);

        setEvents(eventsData);
        setCustodyTransfers(custodyData);
        setAlerts(alertsData);
        setBlockchainHistory(bcData);

        // Load sensors using new shipmentId filter capability
        try {
          const allSensors = await (isPublicUser ? api.getPublicSensorsForShipment(token!, Number(id)) : api.getSensors(token!, Number(id)));
          const matchedSensor = allSensors[0];
          if (matchedSensor) {
            setSensor(matchedSensor);
            if (!isPublicUser) {
              const readingsData = await api.getSensorReadings(token!, matchedSensor.id);
              setReadings(readingsData);
            }
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

    if (user.role !== "ADMIN" && !user.organization_id) {
      setCustodyError("You must be part of an organization to transfer custody.");
      return;
    }

    try {
      const newTransfer = await api.createCustodyTransfer(token, Number(id), {
        from_organization_id: user.organization_id || 0,
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

  async function handleCreateSensor(e: React.FormEvent) {
    e.preventDefault();
    setSensorFormError(null);
    if (!newSensorCode) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const newSensor = await api.createSensor(token, {
        sensor_code: newSensorCode,
        shipment_id: Number(id),
        status: "ACTIVE"
      });
      setSensor(newSensor);
      setNewSensorCode("");
    } catch (err) {
      setSensorFormError(err instanceof Error ? err.message : "Failed to provision sensor.");
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
        <div style={{ background: "var(--bg-danger)", color: "var(--color-danger)", padding: 16, borderRadius: 8 }}>
          {error || "Shipment not found."}
        </div>
      </main>
    );
  }

  const canCreateEvent = user && canPerformAction(user.role, "CREATE_SHIPMENT_EVENT");
  const canCreateCustody = user && canPerformAction(user.role, "CREATE_CUSTODY_TRANSFER");
  const canCreateSensor = user && canPerformAction(user.role, "CREATE_SENSOR");
  const canManageAlerts = user && canPerformAction(user.role, "MANAGE_ALERTS");
  const showControls = canCreateEvent || canCreateCustody || canCreateSensor;

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24, background: "var(--bg-page)", minHeight: "100vh" }}>
      
      {/* Header Section */}
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16,
        background: "var(--bg-surface)", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "var(--shadow-sm)"
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Shipment Record
          </div>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 12, fontSize: 28, color: "var(--text-primary)" }}>
            #{shipment.id}
            <Badge status={shipment.status === "DELIVERED" ? "success" : shipment.status === "IN_TRANSIT" ? "warning" : "default"}>
              {shipment.status}
            </Badge>
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: "8px 0 0 0", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 500 }}>Org {shipment.origin_organization_id}</span>
            <span style={{ color: "var(--text-secondary)" }}>&rarr;</span>
            <span style={{ fontWeight: 500 }}>Org {shipment.destination_organization_id}</span>
          </p>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>Started:</span> {shipment.started_at ? new Date(shipment.started_at).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'}) : "Pending"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>Expected:</span> {shipment.expected_delivery_at ? new Date(shipment.expected_delivery_at).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'}) : "N/A"}
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        
        {/* LEFT COLUMN: Data & Telemetry */}
        <div style={{ flex: "1 1 60%", display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Product / Batch Summary */}
          <section style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 24, border: "1px solid #e2e8f0", boxShadow: "var(--shadow-sm)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 16, color: "var(--text-primary)", borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>Batch & Product Info</h2>
            {!batch || !product ? (
               <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No batch/product information available.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Product Name</div>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 15 }}>{product.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Batch Number</div>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 15, fontFamily: "monospace" }}>{batch.batch_number}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Quantity</div>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 15 }}>{batch.quantity} units</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Storage Temp</div>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 15 }}>{product.storage_min_temp}°C to {product.storage_max_temp}°C</div>
                </div>
              </div>
            )}
          </section>

          {/* Telemetry Section */}
          <section style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 24, border: "1px solid #e2e8f0", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: "var(--text-primary)" }}>Sensor Telemetry</h2>
              {sensor && <Badge status={sensor.status === "ACTIVE" ? "success" : "default"}>{sensor.sensor_code}</Badge>}
            </div>
            
            {!sensor ? (
               <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                 <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>No sensor linked to this shipment.</p>
                 {canCreateSensor && (
                   <div style={{ background: "var(--bg-page)", padding: 16, borderRadius: 8, border: "1px solid #cbd5e1" }}>
                     <h3 style={{ marginTop: 0, fontSize: 14, color: "var(--text-primary)", marginBottom: 12 }}>Register Sensor</h3>
                     <form onSubmit={handleCreateSensor} className={formStyles.form} style={{ gap: 12 }}>
                       {sensorFormError && <div className={formStyles.error}>{sensorFormError}</div>}
                       <input required placeholder="Sensor Code (e.g. SN-12345)" value={newSensorCode} onChange={e => setNewSensorCode(e.target.value)} className={formStyles.input} />
                       <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Status will be ACTIVE by default.</div>
                       <button type="submit" className={formStyles.button} style={{ background: "#2563eb", border: "1px solid #1d4ed8" }}>Attach Sensor</button>
                     </form>
                   </div>
                 )}
               </div>
            ) : readings.length === 0 ? (
               <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No readings available from this sensor.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {/* Telemetry Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                  {(() => {
                    const latest = [...readings].sort((a,b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
                    const isNormal = product ? (latest.temperature >= product.storage_min_temp && latest.temperature <= product.storage_max_temp) : true;
                    return (
                      <>
                        <div style={{ padding: 20, background: isNormal ? "var(--bg-success)" : "var(--bg-danger)", border: `1px solid ${isNormal ? '#ABF5D1' : '#FFBDAD'}`, borderRadius: 12 }}>
                          <div style={{ fontSize: 12, color: isNormal ? "var(--color-success)" : "var(--color-danger)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: isNormal ? "var(--color-success)" : "var(--color-danger)", marginTop: 4 }}>
                             {isNormal ? "NORMAL" : "OUT OF RANGE"}
                          </div>
                        </div>
                        <div style={{ padding: 20, background: "var(--bg-page)", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Latest Temp</div>
                          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: isNormal ? "var(--text-primary)" : "var(--color-danger)" }}>
                             {latest.temperature.toFixed(1)}°C
                          </div>
                        </div>
                        <div style={{ padding: 20, background: "var(--bg-page)", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Latest Humidity</div>
                          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: "var(--text-primary)" }}>
                             {latest.humidity != null ? `${latest.humidity.toFixed(1)}%` : "-"}
                          </div>
                        </div>
                        <div style={{ padding: 20, background: "var(--bg-page)", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Updated</div>
                          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 8, color: "var(--text-primary)" }}>
                             {new Date(latest.recorded_at).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                             {new Date(latest.recorded_at).toLocaleDateString()}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Chart */}
                <div>
                  <h3 style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16, marginTop: 0 }}>Temperature History</h3>
                  <div style={{ height: 300 }}>
                    <TelemetryChart readings={readings} product={product} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Alerts Section */}
          <section style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 24, border: "1px solid #e2e8f0", boxShadow: "var(--shadow-sm)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 16, color: "var(--text-primary)", borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>Active & Past Alerts</h2>
            {alerts.length === 0 ? <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No active alerts.</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {alerts.slice().sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()).map(al => {
                  const isResolved = al.status === "RESOLVED";
                  const isAcknowledged = al.status === "ACKNOWLEDGED";
                  const isOpen = al.status === "OPEN";

                  return (
                  <div key={al.id} style={{ 
                    background: isResolved ? 'var(--bg-page)' : al.severity === 'CRITICAL' ? 'var(--bg-danger)' : al.severity === 'HIGH' ? '#fff7ed' : '#fefce8',
                    padding: 16, borderRadius: 12, 
                    border: `1px solid ${isResolved ? 'var(--border-strong)' : al.severity === 'CRITICAL' ? '#FFBDAD' : al.severity === 'HIGH' ? '#fed7aa' : '#fef08a'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: isResolved ? 'var(--text-secondary)' : al.severity === 'CRITICAL' ? 'var(--color-danger)' : al.severity === 'HIGH' ? '#9a3412' : '#854d0e' }}>
                          {al.severity} Severity Alert
                        </div>
                        <div style={{ fontSize: 13, color: isResolved ? "var(--text-secondary)" : "var(--color-danger)", marginTop: 4 }}>
                          Detected: {new Date(al.detected_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge status={isOpen ? 'error' : isAcknowledged ? 'warning' : 'default'}>{al.status}</Badge>
                    </div>
                    
                    <div style={{ fontSize: 14, color: "var(--text-primary)", background: "rgba(255,255,255,0.5)", padding: 12, borderRadius: 8 }}>
                      <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                        <div><span style={{ color: "var(--text-secondary)" }}>Sensor:</span> {al.sensor_id ?? "N/A"}</div>
                        <div><span style={{ color: "var(--text-secondary)" }}>Latest Temp:</span> <strong>{al.latest_temperature !== undefined ? `${al.latest_temperature}°C` : "N/A"}</strong></div>
                      </div>
                      {product && (
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                          Allowed Range: {product.storage_min_temp}°C to {product.storage_max_temp}°C
                        </div>
                      )}
                      {al.message && <div style={{ color: "var(--text-primary)" }}>{al.message}</div>}
                    </div>
                    
                    {(al.acknowledged_at || al.resolved_at) && (
                      <div style={{ fontSize: 12, marginTop: 12, color: "var(--text-secondary)", display: "flex", gap: 16 }}>
                        {al.acknowledged_at && <div>Ack: {new Date(al.acknowledged_at).toLocaleString()}</div>}
                        {al.resolved_at && <div>Res: {new Date(al.resolved_at).toLocaleString()}</div>}
                      </div>
                    )}
                    
                    {canManageAlerts && !isResolved && (
                      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                        {isOpen && (
                          <button 
                            onClick={() => handleAcknowledgeAlert(al.id)}
                            className={formStyles.button}
                            style={{ padding: "8px 16px", background: "var(--bg-surface)", border: "1px solid #cbd5e1", color: "var(--text-primary)", width: "auto" }}
                          >
                            Acknowledge
                          </button>
                        )}
                        <button 
                          onClick={() => handleResolveAlert(al.id)}
                          className={formStyles.button}
                          style={{ padding: "8px 16px", background: "#10b981", border: "1px solid #059669", width: "auto" }}
                        >
                          Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            )}
          </section>

          {/* Blockchain Verification Section */}
          <section style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 24, border: "1px solid #e2e8f0", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                ⚯ Blockchain Verification
              </h2>
              <Badge status={blockchainHistory ? "success" : blockchainError ? "error" : "default"}>
                {blockchainHistory ? "VERIFIED" : blockchainError ? "UNAVAILABLE" : "LOADING"}
              </Badge>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
              Immutable records fetched directly from the Hyperledger Fabric ledger to audit operational events. This is independent of operational data.
            </p>

            {blockchainError ? (
               <div style={{ background: "var(--bg-danger)", color: "var(--color-danger)", padding: 12, borderRadius: 8, fontSize: 14, border: "1px solid #fecaca" }}>
                 {blockchainError}
               </div>
            ) : !blockchainHistory ? (
               <div style={{ color: "var(--text-secondary)", fontSize: 14, fontStyle: "italic" }}>Loading ledger data...</div>
            ) : blockchainHistory.length === 0 ? (
               <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>No blockchain records found for this shipment.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {blockchainHistory.map((rec, idx) => (
                  <div key={idx} style={{ background: "var(--bg-page)", border: "1px solid #e2e8f0", padding: 16, borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{rec.eventType}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace", background: "var(--border-strong)", padding: "2px 6px", borderRadius: 4 }}>ID: {rec.eventId}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, fontSize: 13, color: "var(--text-secondary)" }}>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Location:</span> <br/> {rec.location || "N/A"}
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Recorded At:</span> <br/> {new Date(rec.timestamp).toLocaleString()}
                      </div>
                      {rec.recordedBy && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Recorded By:</span> <br/> {rec.recordedBy}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN: Operations & Timeline */}
        <div style={{ flex: "1 1 35%", minWidth: 320, display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Action Controls (Role Aware) */}
          {showControls ? (
            <section style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 24, border: "1px solid #e2e8f0", boxShadow: "var(--shadow-sm)" }}>
              <h2 style={{ margin: "0 0 20px 0", fontSize: 16, color: "var(--text-primary)", borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>Operational Controls</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {canCreateEvent && (
                  <div>
                    <h3 style={{ marginTop: 0, fontSize: 14, color: "var(--text-primary)", marginBottom: 12 }}>Record New Event</h3>
                    <form onSubmit={handleCreateEvent} className={formStyles.form} style={{ gap: 12 }}>
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
                      <textarea placeholder="Description" value={eventDesc} onChange={e => setEventDesc(e.target.value)} className={formStyles.input} style={{ resize: "vertical", minHeight: 60 }} />
                      <button type="submit" className={formStyles.button}>Submit Event</button>
                    </form>
                  </div>
                )}
                
                {canCreateCustody && (
                  <div>
                    <h3 style={{ marginTop: 0, fontSize: 14, color: "var(--text-primary)", marginBottom: 12 }}>Transfer Custody</h3>
                    <form onSubmit={handleCreateCustody} className={formStyles.form} style={{ gap: 12 }}>
                      {custodyError && <div className={formStyles.error}>{custodyError}</div>}
                      <input required type="number" min="1" placeholder="To Org ID" value={toOrgId} onChange={e => setToOrgId(e.target.value === "" ? "" : Number(e.target.value))} className={formStyles.input} />
                      <textarea placeholder="Notes" value={custodyNotes} onChange={e => setCustodyNotes(e.target.value)} className={formStyles.input} style={{ resize: "vertical", minHeight: 60 }} />
                      <button type="submit" className={formStyles.button} style={{ background: "#8b5cf6", border: "1px solid #7c3aed" }}>Transfer Custody</button>
                    </form>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section style={{ background: "var(--bg-page)", borderRadius: 12, padding: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center" }}>You have read-only (Auditor) access to this shipment. Controls disabled.</p>
            </section>
          )}

          {/* Shipment Journey Timeline */}
          <section style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 24, border: "1px solid #e2e8f0", boxShadow: "var(--shadow-sm)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 16, color: "var(--text-primary)", borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>Journey Timeline</h2>
            
            {events.length === 0 && custodyTransfers.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No journey activity recorded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative", marginTop: 8 }}>
                {/* Vertical Line */}
                <div style={{ position: "absolute", left: 15, top: 16, bottom: 20, width: 2, background: "var(--border-strong)" }} />
                
                {[
                  ...events.map(ev => ({ type: 'EVENT' as const, date: new Date(ev.occurred_at), data: ev })),
                  ...custodyTransfers.map(ct => ({ type: 'CUSTODY' as const, date: new Date(ct.transferred_at), data: ct }))
                ]
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((item, idx) => (
                  <div key={`${item.type}-${item.data.id}`} style={{ display: "flex", gap: 16, position: "relative", paddingBottom: 24 }}>
                    {/* Node marker */}
                    <div style={{ 
                      width: 32, height: 32, borderRadius: 16, flexShrink: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      background: item.type === 'CUSTODY' ? "#8b5cf6" : "#3b82f6", color: "white", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                      border: "4px solid #fff", boxShadow: "0 0 0 1px #e2e8f0", marginTop: 2
                    }}>
                      {item.type === 'CUSTODY' ? 'CT' : 'EV'}
                    </div>
                    
                    {/* Content Card */}
                    <div style={{ 
                      flex: 1, padding: 16, borderRadius: 12,
                      background: item.type === 'CUSTODY' ? "#faf5ff" : "#f0fdfa",
                      border: `1px solid ${item.type === 'CUSTODY' ? '#e9d5ff' : '#ccfbf1'}`
                    }}>
                      {item.type === 'EVENT' ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{(item.data as ShipmentEvent).event_type}</div>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "right" }}>
                              {item.date.toLocaleDateString()}<br/>{item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                          {(item.data as ShipmentEvent).location && (
                            <div style={{ fontSize: 13, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ color: "var(--text-secondary)" }}>⌖</span> {(item.data as ShipmentEvent).location}
                            </div>
                          )}
                          {(item.data as ShipmentEvent).description && (
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, padding: 8, background: "rgba(255,255,255,0.6)", borderRadius: 6 }}>
                              {(item.data as ShipmentEvent).description}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div style={{ fontWeight: 600, color: "#5b21b6", fontSize: 14 }}>Custody Transfer</div>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "right" }}>
                              {item.date.toLocaleDateString()}<br/>{item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: "#4c1d95", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.6)", padding: 8, borderRadius: 6 }}>
                            <span style={{ fontWeight: 500 }}>Org {(item.data as CustodyTransfer).from_organization_id}</span>
                            <span style={{ color: "#a78bfa" }}>&rarr;</span>
                            <span style={{ fontWeight: 500 }}>Org {(item.data as CustodyTransfer).to_organization_id}</span>
                          </div>
                          {(item.data as CustodyTransfer).notes && (
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
                              <span style={{ color: "var(--text-secondary)" }}>Notes:</span> {(item.data as CustodyTransfer).notes}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
