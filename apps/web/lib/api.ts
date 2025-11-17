import { TestResult, LoadTestExecution, RequestMetric } from '@apimetrics/shared';
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

export async function deleteTestResult(id: string): Promise<void> {
  return fetchAPI<void>(`/results/${id}`, { 
    method: 'DELETE',
    requireAuth: true 
  });
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

export interface ExecutionPlanWithRequests {
  id: string;
  name: string;
  createdAt: string;
  createdBy?: string;
  testRequests: TestRequest[];
  executionTime?: string;
  delayBetweenRequests?: string;
  iterations?: number;
  rampUpPeriods?: string;
}

export interface CreateExecutionPlanRequest {
  name: string;
  executionTime?: string;
  delayBetweenRequests?: string;
  iterations?: number;
  rampUpPeriods?: string;
}

export interface GetLoadTestPlansResponse {
  tenantId: string;
  loadtestplans: ExecutionPlanWithRequests[];
}

export async function createExecutionPlan(data: CreateExecutionPlanRequest): Promise<ExecutionPlanWithRequests> {
  return fetchAPI<ExecutionPlanWithRequests>('/loadtestsplans', {
    method: 'POST',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function getLoadTestPlans(tenantId?: string): Promise<GetLoadTestPlansResponse> {
  const path = tenantId ? `/loadtestsplans?tenantId=${encodeURIComponent(tenantId)}` : '/loadtestsplans';
  return fetchAPI<GetLoadTestPlansResponse>(path, { requireAuth: true });
}

export interface CreateTestRequestRequest {
  executionPlanId: string;
  endpoint: string;
  httpMethod: string;
  requestBody?: string;
  headers?: string;
}

export async function createTestRequest(data: CreateTestRequestRequest): Promise<TestRequest> {
  return fetchAPI<TestRequest>('/loadtestsplans/requests', {
    method: 'POST',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function deleteExecutionPlan(id: string): Promise<void> {
  return fetchAPI<void>(`/loadtestsplans/${id}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export interface UpdateExecutionPlanRequest {
  name?: string;
  executionTime?: string;
  delayBetweenRequests?: string;
  iterations?: number;
  rampUpPeriods?: string;
}

export interface UpdateTestRequestRequest {
  endpoint?: string;
  httpMethod?: string;
  requestBody?: string;
  headers?: string;
}

export async function updateExecutionPlan(id: string, data: UpdateExecutionPlanRequest): Promise<ExecutionPlanWithRequests> {
  return fetchAPI<ExecutionPlanWithRequests>(`/loadtestsplans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function updateTestRequest(planId: string, requestId: string, data: UpdateTestRequestRequest): Promise<TestRequest> {
  return fetchAPI<TestRequest>(`/loadtestsplans/${planId}/requests/${requestId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function deleteTestRequest(planId: string, requestId: string): Promise<void> {
  return fetchAPI<void>(`/loadtestsplans/${planId}/requests/${requestId}`, {
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
  return fetchAPI<void>(`/loadtestsplans/${planId}/reorder`, {
    method: 'PUT',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function moveTestRequest(planId: string, requestId: string, data: MoveTestRequestRequest): Promise<void> {
  return fetchAPI<void>(`/loadtestsplans/${planId}/requests/${requestId}/move`, {
    method: 'PUT',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export interface CreateLoadTestExecutionRequest {
  executionPlanId: string;
  name: string;
}

export interface GetLoadTestExecutionsResponse {
  loadtestsexecutions: (LoadTestExecution & { loadtests: any[] })[];
}

export async function createLoadTestExecution(data: CreateLoadTestExecutionRequest): Promise<LoadTestExecution> {
  return fetchAPI<LoadTestExecution>('/loadtestsexecutions', {
    method: 'POST',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function getLoadTestExecutions(executionPlanId?: string): Promise<GetLoadTestExecutionsResponse> {
  const url = executionPlanId 
    ? `/loadtestsexecutions?executionPlanId=${executionPlanId}` 
    : '/loadtestsexecutions';
  return fetchAPI<GetLoadTestExecutionsResponse>(url, {
    method: 'GET',
    requireAuth: true,
  });
}

// Removed: getLoadTestExecution(id) - No longer used, all data is included in getLoadTestExecutions()
// Removed: getLoadTestExecutionResults(id) - Results are now included in the execution response

export async function updateLoadTestExecution(id: string, data: Partial<LoadTestExecution>): Promise<LoadTestExecution> {
  return fetchAPI<LoadTestExecution>(`/loadtestsexecutions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    requireAuth: true,
  });
}

export async function deleteLoadTestExecution(id: string): Promise<void> {
  return fetchAPI<void>(`/loadtestsexecutions/${id}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function downloadLoadTestExecution(id: string): Promise<{ filename: string; instructions: any }> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/loadtestsexecutions/${id}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Download failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  // Get the JSON data
  const jsonData = await response.json();

  // Extract filename from the instructions.step2 command
  let filename = 'execution-plan.json';
  if (jsonData.instructions && jsonData.instructions.step2) {
    const match = jsonData.instructions.step2.match(/~\/Downloads\/(.+?)(?:\s|$)/);
    if (match) {
      filename = match[1];
    }
  }

  // Fallback: Try to get filename from Content-Disposition header
  if (filename === 'execution-plan.json') {
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/);
      
      if (filenameStarMatch) {
        filename = decodeURIComponent(filenameStarMatch[1]);
      } else if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
  }

  // Create blob and download with the correct filename
  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  return {
    filename,
    instructions: jsonData.instructions
  };
}

export async function getExecutionRequestMetrics(executionId: string): Promise<{ count: number; metrics: RequestMetric[] }> {
  return fetchAPI(`/loadtestsexecutions/${executionId}/metrics`, { 
    requireAuth: true 
  });
}

export async function getTestResultRequestMetrics(executionId: string, testResultId: string): Promise<{ count: number; metrics: RequestMetric[] }> {
  return fetchAPI(`/loadtestsexecutions/${executionId}/metrics/${testResultId}/requests`, { 
    requireAuth: true 
  });
}
