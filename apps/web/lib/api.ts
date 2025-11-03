import { TestResult } from '@apimetrics/shared';

const API_URL = process.env.NEXT_PUBLIC_APIMETRICS_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(),
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

export async function login(email: string, password: string): Promise<LoginResponse> {
  return fetchAPI<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getTestResults(): Promise<TestResult[]> {
  return fetchAPI<TestResult[]>('/results');
}

export async function getTestResult(id: string): Promise<TestResult> {
  return fetchAPI<TestResult>(`/results/${id}`);
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
  tenantId: string;
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
  return fetchAPI<TestEndpoint>('/endpoints', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTestEndpoints(tenantId: string): Promise<GetTestEndpointsResponse> {
  return fetchAPI<GetTestEndpointsResponse>(`/endpoints?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function deleteTestEndpoint(id: string): Promise<void> {
  return fetchAPI<void>(`/endpoints/${id}`, {
    method: 'DELETE',
  });
}
