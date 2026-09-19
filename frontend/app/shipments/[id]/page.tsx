"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Shipment, ShipmentEvent, CustodyTransfer, AuthUserResponse, Alert } from "@/lib/api";
import Navbar from "../../components/Navbar";

export default function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [custodyTransfers, setCustodyTransfers] = useState<CustodyTransfer[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
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

    Promise.all([
      api.me(token),
      api.getShipment(token, Number(id)),
      api.getShipmentEvents(token, Number(id)),
      api.getCustodyTransfers(token, Number(id)),
      api.getShipmentAlerts(token, Number(id)).catch(() => [] as Alert[])
    ])
      .then(([userData, shipmentData, eventsData, custodyData, alertsData]) => {
        setUser(userData);
        setShipment(shipmentData);
        setEvents(eventsData);
        setCustodyTransfers(custodyData);
        setAlerts(alertsData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load shipment details.");
      })
      .finally(() => {
        setLoading(false);
      });
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
    return <main style={{ padding: 32, color: "#991b1b" }}>{error || "Shipment not found."}</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <Navbar />

      <h1 style={{ marginTop: 24, marginBottom: 24 }}>Shipment #{shipment.id} Details</h1>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)", marginBottom: 32 }}>
        <p><strong>Batch ID:</strong> {shipment.batch_id}</p>
        <p><strong>Status:</strong> {shipment.status}</p>
        <p><strong>Origin Org ID:</strong> {shipment.origin_organization_id}</p>
        <p><strong>Destination Org ID:</strong> {shipment.destination_organization_id}</p>
      </section>

      <div style={{ display: "flex", gap: 32 }}>
        <section style={{ flex: 1, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
          <h2 style={{ marginTop: 0 }}>Add Event</h2>
          <form onSubmit={handleCreateEvent} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {eventError && <div style={{ color: "#991b1b", fontSize: 14 }}>{eventError}</div>}
            
            <select value={eventType} onChange={e => setEventType(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }}>
              <option value="CREATED">Created</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="RECEIVED">Received</option>
              <option value="DELAYED">Delayed</option>
              <option value="HAZARD">Hazard</option>
              <option value="CUSTODY_TRANSFER">Custody Transfer</option>
            </select>
            
            <input placeholder="Location" value={eventLocation} onChange={e => setEventLocation(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
            <input placeholder="Description" value={eventDesc} onChange={e => setEventDesc(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
            <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
            
            <button type="submit" style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>Add Event</button>
          </form>
        </section>

        <section style={{ flex: 1, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
          <h2 style={{ marginTop: 0 }}>Transfer Custody</h2>
          <form onSubmit={handleCreateCustody} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {custodyError && <div style={{ color: "#991b1b", fontSize: 14 }}>{custodyError}</div>}
            
            <input required type="number" min="1" placeholder="To Org ID" value={toOrgId} onChange={e => setToOrgId(e.target.value === "" ? "" : Number(e.target.value))} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
            <input placeholder="Notes" value={custodyNotes} onChange={e => setCustodyNotes(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
            <input type="datetime-local" value={custodyDate} onChange={e => setCustodyDate(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
            
            <button type="submit" style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>Transfer</button>
          </form>
        </section>
      </div>

      <div style={{ display: "flex", gap: 32, marginTop: 32 }}>
        <section style={{ flex: 1 }}>
          <h2>Chronological Events</h2>
          {events.length === 0 ? <p>No events recorded.</p> : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {events.slice().sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()).map(ev => (
                <li key={ev.id} style={{ background: "#fff", padding: 16, borderRadius: 8, marginBottom: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontWeight: "bold", marginBottom: 4 }}>{ev.event_type} - {new Date(ev.occurred_at).toLocaleString()}</div>
                  {ev.location && <div>Location: {ev.location}</div>}
                  {ev.description && <div>Desc: {ev.description}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={{ flex: 1 }}>
          <h2>Custody Transfers</h2>
          {custodyTransfers.length === 0 ? <p>No transfers recorded.</p> : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {custodyTransfers.slice().sort((a, b) => new Date(b.transferred_at).getTime() - new Date(a.transferred_at).getTime()).map(ct => (
                <li key={ct.id} style={{ background: "#fff", padding: 16, borderRadius: 8, marginBottom: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontWeight: "bold", marginBottom: 4 }}>Org {ct.from_organization_id} &rarr; Org {ct.to_organization_id}</div>
                  <div>Date: {new Date(ct.transferred_at).toLocaleString()}</div>
                  {ct.notes && <div>Notes: {ct.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      
      <div style={{ marginTop: 32 }}>
        <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
          <h2 style={{ marginTop: 0 }}>Alerts</h2>
          {alerts.length === 0 ? <p>No alerts recorded for this shipment.</p> : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {alerts.slice().sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()).map(al => (
                <li key={al.id} style={{ 
                  background: al.severity === 'CRITICAL' ? '#fee2e2' : al.severity === 'HIGH' ? '#ffedd5' : '#fef3c7',
                  padding: 16, borderRadius: 8, marginBottom: 12, border: "1px solid rgba(0,0,0,0.05)" 
                }}>
                  <div style={{ fontWeight: "bold", marginBottom: 4, color: al.severity === 'CRITICAL' ? '#991b1b' : al.severity === 'HIGH' ? '#9a3412' : '#92400e' }}>
                    {al.severity} Alert (Status: {al.status})
                  </div>
                  <div>Sensor ID: {al.sensor_id} | Latest Temp: {al.latest_temperature}°C</div>
                  {al.message && <div style={{ marginTop: 8 }}>Message: {al.message}</div>}
                  <div style={{ fontSize: 12, marginTop: 8, color: "#4b5563" }}>
                    Detected: {new Date(al.detected_at).toLocaleString()}
                    {al.resolved_at && ` | Resolved: ${new Date(al.resolved_at).toLocaleString()}`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
