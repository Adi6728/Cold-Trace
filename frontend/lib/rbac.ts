export const ROLES = {
  ADMIN: "ADMIN",
  MANUFACTURER: "MANUFACTURER",
  LOGISTICS: "LOGISTICS",
  WAREHOUSE: "WAREHOUSE",
  HOSPITAL: "HOSPITAL",
  AUDITOR: "AUDITOR",
  USER: "USER",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Which roles can see which sidebar links
export const SIDEBAR_ACCESS: Record<string, Role[]> = {
  "/dashboard": [ROLES.ADMIN, ROLES.MANUFACTURER, ROLES.LOGISTICS, ROLES.WAREHOUSE, ROLES.HOSPITAL, ROLES.AUDITOR, ROLES.USER],
  "/products": [ROLES.ADMIN, ROLES.MANUFACTURER, ROLES.HOSPITAL, ROLES.AUDITOR, ROLES.USER],
  "/batches": [ROLES.ADMIN, ROLES.MANUFACTURER, ROLES.HOSPITAL, ROLES.AUDITOR, ROLES.USER],
  "/shipments": [ROLES.ADMIN, ROLES.MANUFACTURER, ROLES.LOGISTICS, ROLES.WAREHOUSE, ROLES.HOSPITAL, ROLES.AUDITOR, ROLES.USER],
  "/sensors": [ROLES.ADMIN, ROLES.MANUFACTURER, ROLES.LOGISTICS, ROLES.WAREHOUSE, ROLES.AUDITOR, ROLES.USER], // Logistics/Warehouse/Auditor for sensors. Maybe Manufacturer too? Backend allows it? Manufacturer might just use dashboard/alerts, but let's allow all for now except Hospital.
  "/alerts": [ROLES.ADMIN, ROLES.MANUFACTURER, ROLES.LOGISTICS, ROLES.WAREHOUSE, ROLES.HOSPITAL, ROLES.AUDITOR, ROLES.USER],
};

// Which roles can create/edit master data
export const ACTION_ACCESS: Record<string, Role[]> = {
  CREATE_PRODUCT: [ROLES.ADMIN, ROLES.MANUFACTURER],
  CREATE_BATCH: [ROLES.ADMIN, ROLES.MANUFACTURER],
  CREATE_SHIPMENT_EVENT: [ROLES.ADMIN, ROLES.MANUFACTURER, ROLES.LOGISTICS, ROLES.WAREHOUSE, ROLES.HOSPITAL],
  CREATE_CUSTODY_TRANSFER: [ROLES.ADMIN, ROLES.MANUFACTURER, ROLES.LOGISTICS, ROLES.WAREHOUSE],
  CREATE_SENSOR: [ROLES.ADMIN, ROLES.MANUFACTURER, ROLES.LOGISTICS, ROLES.WAREHOUSE, ROLES.HOSPITAL],
  MANAGE_ALERTS: [ROLES.ADMIN, ROLES.MANUFACTURER, ROLES.LOGISTICS, ROLES.WAREHOUSE, ROLES.HOSPITAL],
};

export function canAccessRoute(role: string | undefined, route: string): boolean {
  if (!role) return false;
  const allowedRoles = SIDEBAR_ACCESS[route];
  if (!allowedRoles) return true; // If not explicitly restricted, allow. Alternatively, we could default to false.
  return allowedRoles.includes(role as Role);
}

export function canPerformAction(role: string | undefined, action: string): boolean {
  if (!role) return false;
  const allowedRoles = ACTION_ACCESS[action as keyof typeof ACTION_ACCESS];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role as Role);
}
