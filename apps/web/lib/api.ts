import { TestResult } from '@apimetrics/shared';
import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_APIMETRICS_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function getHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const authHeaders = await getHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to API at ${API_URL}. Make sure the API server is running.`);
    }
    throw error;
  }
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface MeResponse {
  userId: string;
  email?: string;
  tenantId: string;
  role?: 'ADMIN' | 'MEMBER';
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return fetchAPI<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<MeResponse> {
  return fetchAPI<MeResponse>('/auth/me');
}

export async function getTestResults(): Promise<TestResult[]> {
  return fetchAPI<TestResult[]>('/results');
}

export async function getTestResult(id: string): Promise<TestResult> {
  return fetchAPI<TestResult>(`/results/${id}`);
}

// Seed random test results for the current authenticated user's tenant
export interface SeedResultsResponse {
  inserted: number;
  tenantId: string;
  project: string;
}

export async function seedResults(params?: { count?: number; project?: string }): Promise<SeedResultsResponse> {
  return fetchAPI<SeedResultsResponse>('/results/seed', {
    method: 'POST',
    body: JSON.stringify({ count: params?.count, project: params?.project }),
  });
}

// Test Endpoints API
export interface TestEndpoint {
  id: string;
  endpoint: string;
  httpMethod: string;
  requestBody?: string;
  headers?: string;
  createdAt: string;
  createdBy?: string;
}

export interface CreateTestEndpointRequest {
  // tenantId is derived by the server; optional for backward-compat
  tenantId?: string;
  endpoint: string;
  httpMethod: string;
  requestBody?: string;
  headers?: string;
}

export interface GetTestEndpointsResponse {
  tenantId: string;
  endpoints: TestEndpoint[];
}

export async function createTestEndpoint(data: CreateTestEndpointRequest): Promise<TestEndpoint> {
  // Do not send tenantId if undefined; the API derives it from the authenticated user
  const { tenantId, ...rest } = data;
  return fetchAPI<TestEndpoint>('/endpoints', {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}

export async function getTestEndpoints(tenantId?: string): Promise<GetTestEndpointsResponse> {
  const path = tenantId ? `/endpoints?tenantId=${encodeURIComponent(tenantId)}` : '/endpoints';
  return fetchAPI<GetTestEndpointsResponse>(path);
}

export async function deleteTestEndpoint(id: string): Promise<void> {
  return fetchAPI<void>(`/endpoints/${id}`, {
    method: 'DELETE',
  });
}
