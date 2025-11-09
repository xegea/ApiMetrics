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

async function fetchAPI<T>(endpoint: string, options?: RequestInit & { requireAuth?: boolean }): Promise<T> {
  try {
    const token = await getAuthToken();
    if (options?.requireAuth && !token) {
      // Do not even attempt a network call if auth is required and no token is present
      throw new Error('Not authenticated');
    }

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
  return fetchAPI<MeResponse>('/auth/me', { requireAuth: true });
}

export async function getTestResults(): Promise<TestResult[]> {
  return fetchAPI<TestResult[]>('/results', { requireAuth: true });
}

export async function getTestResult(id: string): Promise<TestResult> {
  return fetchAPI<TestResult>(`/results/${id}`, { requireAuth: true });
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
    requireAuth: true,
  });
}

// Execution Plans API
export interface TestRequest {
  id: string;
  endpoint: string;
  httpMethod: string;
  requestBody?: string;
  headers?: string;
  createdAt: string;
  createdBy?: string;
}

export interface ExecutionPlan {
  id: string;
  name: string;
  createdAt: string;
  createdBy?: string;
  testRequests: TestRequest[];
}

export interface CreateExecutionPlanRequest {
  name: string;
}

export interface GetExecutionPlansResponse {
  tenantId: string;
  executionPlans: ExecutionPlan[];
}

export async function createExecutionPlan(data: CreateExecutionPlanRequest): Promise<ExecutionPlan> {
  return fetchAPI<ExecutionPlan>('/executionplans', {
    method: 'POST',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function getExecutionPlans(tenantId?: string): Promise<GetExecutionPlansResponse> {
  const path = tenantId ? `/executionplans?tenantId=${encodeURIComponent(tenantId)}` : '/executionplans';
  return fetchAPI<GetExecutionPlansResponse>(path, { requireAuth: true });
}

export interface CreateTestRequestRequest {
  executionPlanId: string;
  endpoint: string;
  httpMethod: string;
  requestBody?: string;
  headers?: string;
}

export async function createTestRequest(data: CreateTestRequestRequest): Promise<TestRequest> {
  return fetchAPI<TestRequest>('/executionplans/requests', {
    method: 'POST',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function deleteExecutionPlan(id: string): Promise<void> {
  return fetchAPI<void>(`/executionplans/${id}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export interface UpdateExecutionPlanRequest {
  name: string;
}

export interface UpdateTestRequestRequest {
  endpoint?: string;
  httpMethod?: string;
  requestBody?: string;
  headers?: string;
}

export async function updateExecutionPlan(id: string, data: UpdateExecutionPlanRequest): Promise<ExecutionPlan> {
  return fetchAPI<ExecutionPlan>(`/executionplans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function updateTestRequest(planId: string, requestId: string, data: UpdateTestRequestRequest): Promise<TestRequest> {
  return fetchAPI<TestRequest>(`/executionplans/${planId}/requests/${requestId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function deleteTestRequest(planId: string, requestId: string): Promise<void> {
  return fetchAPI<void>(`/executionplans/${planId}/requests/${requestId}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export interface ReorderTestRequestsRequest {
  requestIds: string[];
}

export interface MoveTestRequestRequest {
  newExecutionPlanId: string;
}

export async function reorderTestRequests(planId: string, data: ReorderTestRequestsRequest): Promise<void> {
  return fetchAPI<void>(`/executionplans/${planId}/reorder`, {
    method: 'PUT',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function moveTestRequest(planId: string, requestId: string, data: MoveTestRequestRequest): Promise<void> {
  return fetchAPI<void>(`/executionplans/${planId}/requests/${requestId}/move`, {
    method: 'PUT',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}
