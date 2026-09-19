"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Sensor, SensorReading } from "@/lib/api";


export default function SensorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    Promise.all([
      api.getSensor(token, Number(id)),
      api.getSensorReadings(token, Number(id))
    ])
      .then(([sensorData, readingsData]) => {
        setSensor(sensorData);
        setReadings(readingsData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load sensor details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, router]);

  if (loading) {
    return <main style={{ padding: 32 }}>Loading sensor details...</main>;
  }

  if (error || !sensor) {
    return <main style={{ padding: 32, color: "#991b1b" }}>{error || "Sensor not found."}</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>


      <h1 style={{ marginTop: 24, marginBottom: 24 }}>Sensor #{sensor.id} Details</h1>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)", marginBottom: 32 }}>
        <p><strong>Sensor Code:</strong> {sensor.sensor_code}</p>
        <p><strong>Shipment ID:</strong> {sensor.shipment_id}</p>
        <p><strong>Status:</strong> {sensor.status}</p>
        <p><strong>Created At:</strong> {new Date(sensor.created_at).toLocaleString()}</p>
      </section>

      <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
        <h2 style={{ marginTop: 0 }}>Telemetry History</h2>
        
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: 12 }}>Time</th>
              <th style={{ padding: 12 }}>Temperature (°C)</th>
              <th style={{ padding: 12 }}>Humidity (%)</th>
            </tr>
          </thead>
          <tbody>
            {readings.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 12, textAlign: "center", fontStyle: "italic", color: "#6b7280" }}>
                  No readings available.
                </td>
              </tr>
            ) : (
              readings.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 12 }}>{new Date(r.recorded_at).toLocaleString()}</td>
                  <td style={{ padding: 12 }}>{r.temperature.toFixed(1)}</td>
                  <td style={{ padding: 12 }}>{r.humidity != null ? r.humidity.toFixed(1) : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
