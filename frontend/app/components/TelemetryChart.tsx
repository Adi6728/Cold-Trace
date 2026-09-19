import React from 'react';
import { SensorReading, Product } from '@/lib/api';

export default function TelemetryChart({ readings, product }: { readings: SensorReading[], product: Product | null }) {
  if (!readings || readings.length === 0) {
    return <div style={{ color: "#6b7280", padding: "24px 0" }}>No telemetry data available.</div>;
  }

  // Sort ascending for chronological drawing (left to right)
  const sorted = [...readings].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  
  const minT = Math.min(...sorted.map(r => r.temperature), product ? product.storage_min_temp - 5 : 0) - 2;
  const maxT = Math.max(...sorted.map(r => r.temperature), product ? product.storage_max_temp + 5 : 40) + 2;
  
  const range = maxT - minT;
  
  const width = 800;
  const height = 240;
  
  const paddingX = 40;
  const paddingY = 20;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const t0 = new Date(sorted[0].recorded_at).getTime();
  const t1 = new Date(sorted[sorted.length - 1].recorded_at).getTime();
  const timeRange = t1 - t0 || 1; // avoid division by zero if only 1 reading

  const getX = (t: string) => paddingX + ((new Date(t).getTime() - t0) / timeRange) * innerWidth;
  const getY = (v: number) => paddingY + innerHeight - ((v - minT) / range) * innerHeight;

  // Build path
  const tempPath = sorted.map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(r.recorded_at)} ${getY(r.temperature)}`).join(" ");
  
  // Safe zones
  let safeZone = null;
  if (product) {
    const safeTop = getY(product.storage_max_temp);
    const safeBottom = getY(product.storage_min_temp);
    safeZone = (
      <rect 
        x={paddingX} 
        y={safeTop} 
        width={innerWidth} 
        height={Math.max(0, safeBottom - safeTop)} 
        fill="#dcfce7" 
        opacity={0.3} 
      />
    );
  }

  return (
    <div style={{ width: "100%", overflowX: "auto", background: "#f8fafc", borderRadius: 8, padding: "16px 0" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ minWidth: 600 }}>
        {/* Grid lines */}
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#e2e8f0" strokeDasharray="4" />
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#cbd5e1" />
        
        {safeZone}

        {/* Min/Max Lines */}
        {product && (
          <>
            <line x1={paddingX} y1={getY(product.storage_max_temp)} x2={width - paddingX} y2={getY(product.storage_max_temp)} stroke="#ef4444" strokeDasharray="4" opacity={0.5} />
            <text x={paddingX - 5} y={getY(product.storage_max_temp)} fontSize="10" fill="#ef4444" textAnchor="end" alignmentBaseline="middle">{product.storage_max_temp}°</text>
            
            <line x1={paddingX} y1={getY(product.storage_min_temp)} x2={width - paddingX} y2={getY(product.storage_min_temp)} stroke="#3b82f6" strokeDasharray="4" opacity={0.5} />
            <text x={paddingX - 5} y={getY(product.storage_min_temp)} fontSize="10" fill="#3b82f6" textAnchor="end" alignmentBaseline="middle">{product.storage_min_temp}°</text>
          </>
        )}
        
        {/* Humidity subtle bars (scaled 0-100% on the bottom 40px) */}
        {sorted.map((r, i) => {
          if (r.humidity == null) return null;
          const h = (r.humidity / 100) * 40; 
          return (
            <rect key={`h-${i}`} x={getX(r.recorded_at) - 2} y={height - paddingY - h} width={4} height={h} fill="#bae6fd" opacity={0.5} />
          );
        })}

        {/* Temperature Line */}
        <path d={tempPath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" />
        
        {/* Points */}
        {sorted.map((r, i) => {
          const isOut = product && (r.temperature > product.storage_max_temp || r.temperature < product.storage_min_temp);
          return (
            <g key={`p-${i}`}>
              {/* Invisible larger circle for tooltip hover targets in the future */}
              <circle cx={getX(r.recorded_at)} cy={getY(r.temperature)} r="8" fill="transparent" />
              <circle 
                cx={getX(r.recorded_at)} 
                cy={getY(r.temperature)} 
                r="4" 
                fill={isOut ? "#ef4444" : "#ffffff"} 
                stroke={isOut ? "#ef4444" : "#2563eb"} 
                strokeWidth="2" 
              />
            </g>
          );
        })}

        {/* X Axis Labels */}
        {sorted.length > 0 && (
          <>
             <text x={paddingX} y={height - 4} fontSize="11" fill="#64748b">{new Date(sorted[0].recorded_at).toLocaleTimeString()}</text>
             {sorted.length > 2 && (
               <text x={paddingX + innerWidth/2} y={height - 4} fontSize="11" fill="#64748b" textAnchor="middle">
                 {new Date(sorted[Math.floor(sorted.length/2)].recorded_at).toLocaleTimeString()}
               </text>
             )}
             <text x={width - paddingX} y={height - 4} fontSize="11" fill="#64748b" textAnchor="end">
               {new Date(sorted[sorted.length - 1].recorded_at).toLocaleTimeString()}
             </text>
          </>
        )}
      </svg>
    </div>
  );
}
