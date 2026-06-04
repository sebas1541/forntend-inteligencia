import { API_BASE_URL } from './config';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está corriendo el API?');
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail ?? data?.message;
    throw new ApiError(res.status, typeof detail === 'string' ? detail : `Error ${res.status}`);
  }
  return data as T;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface Plate {
  id: number;
  plate: string;
  plate_type: string;
  color: string | null;
  confidence: number | null;
  note: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface PlateInput {
  plate: string;
  plate_type?: string;
  color?: string | null;
  confidence?: number | null;
  note?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export const api = {
  register: (email: string, password: string, fullName?: string) =>
    request<AuthToken>('/auth/register', {
      method: 'POST',
      body: { email, password, full_name: fullName ?? null },
    }),
  login: (email: string, password: string) =>
    request<AuthToken>('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token: string) => request<User>('/auth/me', { token }),
  listPlates: (token: string) => request<Plate[]>('/plates', { token }),
  createPlate: (token: string, input: PlateInput) =>
    request<Plate>('/plates', { method: 'POST', body: input, token }),
  deletePlate: (token: string, id: number) =>
    request<void>(`/plates/${id}`, { method: 'DELETE', token }),
};
