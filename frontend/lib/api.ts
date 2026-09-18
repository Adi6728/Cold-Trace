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
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  me: (token: string) => apiRequest<AuthUserResponse>("/api/v1/auth/me", { token }),
};
