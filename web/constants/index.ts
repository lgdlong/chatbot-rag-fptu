// web/constants/index.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const TENANT_ID_HEADER = "x-tenant-id";
export const DEFAULT_TENANT_ID = "org-default";

export type DevLoginRole = "student" | "lecturer" | "admin";

export type DevLoginAccount = {
  role: DevLoginRole;
  name: string;
  email: string;
  password: string;
};
