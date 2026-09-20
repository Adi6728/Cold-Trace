const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type AuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type AuthUserResponse = {
  id: number;
  email: string;
  role: string;
  organization_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export interface RegisterPayload {
  email: string;
  password: string;
  role: string;
  admin_registration_key?: string;
  organization_name?: string;
}

export type Product = {
  id: number;
  name: string;
  description?: string;
  manufacturer_id: number;
  storage_min_temp: number;
  storage_max_temp: number;
  created_at: string;
  updated_at: string;
};

export type ProductCreate = {
  name: string;
  description?: string;
  manufacturer_id: number;
  storage_min_temp: number;
  storage_max_temp: number;
};

export type Batch = {
  id: number;
  product_id: number;
  batch_number: string;
  manufactured_at: string;
  expiry_date: string;
  quantity: number;
  status: string;
  created_at: string;
};

export type BatchCreate = {
  product_id: number;
  batch_number: string;
  manufactured_at: string;
  expiry_date: string;
  quantity: number;
  status?: string;
};

export type Shipment = {
  id: number;
  batch_id: number;
  origin_organization_id: number;
  destination_organization_id: number;
  status: string;
  started_at?: string;
  expected_delivery_at?: string;
  delivered_at?: string;
  created_at: string;
};

export type ShipmentCreate = {
  batch_id: number;
  origin_organization_id: number;
  destination_organization_id: number;
  status?: string;
  started_at?: string;
  expected_delivery_at?: string;
};

export type ShipmentEvent = {
  id: number;
  shipment_id: number;
  event_type: string;
  description?: string;
  location?: string;
  occurred_at: string;
  created_at: string;
};

export type ShipmentEventCreate = {
  event_type: string;
  description?: string;
  location?: string;
  occurred_at: string;
};

export type CustodyTransfer = {
  id: number;
  shipment_id: number;
  from_organization_id: number;
  to_organization_id: number;
  transferred_at: string;
  notes?: string;
  created_at: string;
};

export type BlockchainRecord = {
  eventId: string;
  shipmentId: string;
  eventType: string;
  location: string;
  timestamp: string;
  recordedBy: string;
};

export type CustodyTransferCreate = {
  from_organization_id: number;
  to_organization_id: number;
  transferred_at: string;
  notes?: string;
};

export type Sensor = {
  id: number;
  sensor_code: string;
  shipment_id: number;
  status: string;
  created_at: string;
};

export type SensorReading = {
  id: number;
  sensor_id: number;
  shipment_id: number;
  temperature: number;
  humidity?: number;
  recorded_at: string;
  received_at: string;
};

export type Alert = {
  id: number;
  shipment_id: number;
  sensor_id: number;
  severity: string;
  status: string;
  message: string;
  latest_temperature: number;
  detected_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
};

function getAuthHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(options.token),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail: unknown = "Request failed";
    try {
      const payload = await response.json();
      detail = payload?.detail ?? payload;
    } catch {
      // ignore JSON parsing failure and fall back to generic error
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return (await response.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    apiRequest<AuthTokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (payload: RegisterPayload) =>
    apiRequest<AuthUserResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: (token: string) => apiRequest<AuthUserResponse>("/api/v1/auth/me", { token }),
  
  // Products
  getProducts: (token: string) => apiRequest<Product[]>("/api/v1/products", { token }),
  getProduct: (token: string, id: number) => apiRequest<Product>(`/api/v1/products/${id}`, { token }),
  createProduct: (token: string, payload: ProductCreate) =>
    apiRequest<Product>("/api/v1/products", {
      token,
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Batches
  getBatches: (token: string) => apiRequest<Batch[]>("/api/v1/batches", { token }),
  getBatch: (token: string, id: number) => apiRequest<Batch>(`/api/v1/batches/${id}`, { token }),
  createBatch: (token: string, payload: BatchCreate) =>
    apiRequest<Batch>("/api/v1/batches", {
      token,
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Shipments
  getShipments: (token: string) => apiRequest<Shipment[]>("/api/v1/shipments", { token }),
  getShipment: (token: string, id: number) => apiRequest<Shipment>(`/api/v1/shipments/${id}`, { token }),
  createShipment: (token: string, payload: ShipmentCreate) =>
    apiRequest<Shipment>("/api/v1/shipments", {
      token,
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getShipmentEvents: (token: string, shipmentId: number) =>
    apiRequest<ShipmentEvent[]>(`/api/v1/shipments/${shipmentId}/events`, { token }),
  createShipmentEvent: (token: string, shipmentId: number, payload: ShipmentEventCreate) =>
    apiRequest<ShipmentEvent>(`/api/v1/shipments/${shipmentId}/events`, {
      token,
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCustodyTransfers: (token: string, shipmentId: number) =>
    apiRequest<CustodyTransfer[]>(`/api/v1/shipments/${shipmentId}/custody`, { token }),
  createCustodyTransfer: (token: string, shipmentId: number, payload: CustodyTransferCreate) =>
    apiRequest<CustodyTransfer>(`/api/v1/shipments/${shipmentId}/custody`, {
      token,
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getShipmentBlockchainHistory: (token: string, shipmentId: number) =>
    apiRequest<BlockchainRecord[]>(`/api/v1/shipments/${shipmentId}/blockchain-history`, { token }),
  verifyShipmentPublic: (shipmentId: number) =>
    apiRequest<{
      shipment_id: number;
      status: string;
      batch_id: number;
      origin_organization_id: number;
      destination_organization_id: number;
      created_at: string;
      delivered_at: string | null;
      is_blockchain_verified: boolean;
      events_count: number;
    }>(`/api/v1/shipments/${shipmentId}/verify`),

  // Public General Read
  getPublicShipments: (token: string) => apiRequest<Shipment[]>("/api/v1/public/shipments", { token }),
  getPublicShipment: (token: string, id: number) => apiRequest<Shipment>(`/api/v1/public/shipments/${id}`, { token }),
  getPublicShipmentEvents: (token: string, shipmentId: number) =>
    apiRequest<ShipmentEvent[]>(`/api/v1/public/shipments/${shipmentId}/events`, { token }),
  getPublicSensorsForShipment: (token: string, shipmentId: number) => 
    apiRequest<Sensor[]>(`/api/v1/public/shipments/${shipmentId}/sensors`, { token }),
  getPublicShipmentAlerts: (token: string, shipmentId: number) =>
    apiRequest<Alert[]>(`/api/v1/public/shipments/${shipmentId}/alerts`, { token }),
  getPublicSensors: (token: string) => apiRequest<Sensor[]>("/api/v1/public/sensors", { token }),

  // Sensors
  getSensors: (token: string, shipmentId?: number) => {
    const url = shipmentId ? `/api/v1/sensors/?shipment_id=${shipmentId}` : "/api/v1/sensors/";
    return apiRequest<Sensor[]>(url, { token });
  },
  getSensor: (token: string, id: number) => apiRequest<Sensor>(`/api/v1/sensors/${id}`, { token }),
  getSensorReadings: (token: string, id: number) => apiRequest<SensorReading[]>(`/api/v1/sensors/${id}/readings`, { token }),

  // Alerts
  getShipmentAlerts: (token: string, shipmentId: number) =>
    apiRequest<Alert[]>(`/api/v1/shipments/${shipmentId}/alerts`, { token }),
  acknowledgeAlert: (token: string, alertId: number) =>
    apiRequest<Alert>(`/api/v1/alerts/${alertId}/acknowledge`, {
      token,
      method: "PATCH",
    }),
  resolveAlert: (token: string, alertId: number) =>
    apiRequest<Alert>(`/api/v1/alerts/${alertId}/resolve`, {
      token,
      method: "PATCH",
    }),
};
