/**
 * The only module the UI uses to reach the backend. Requests go to same-origin `/api/*`,
 * which next.config.ts rewrites to BACKEND_URL. The signed-in user's Firebase ID token is
 * attached automatically.
 */
import { auth } from '@/lib/firebase';
import type {
  ApiErrorBody,
  ApiOptionSet,
  ApiWorkflow,
  ChatRequest,
  ChatResponse,
  FieldDefinitionsConfig,
  FlowTrackingData,
  RawWorkflowConfig,
  SubmitRequestBody,
  SubmitRequestResponse,
} from '@/types/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = await auth.currentUser?.getIdToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối tới máy chủ. Vui lòng thử lại.');
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? `Yêu cầu thất bại (HTTP ${res.status}).`,
      err?.details
    );
  }
  return data as T;
}

export const api = {
  getWorkflows: () => request<ApiWorkflow[]>('/workflows'),
  createWorkflow: (wf: RawWorkflowConfig) => request<ApiWorkflow>('/workflows', 'POST', wf),
  updateWorkflow: (wf: RawWorkflowConfig) =>
    request<ApiWorkflow>(`/workflows/${encodeURIComponent(wf.id)}`, 'PUT', wf),
  deleteWorkflow: (id: string) => request<void>(`/workflows/${encodeURIComponent(id)}`, 'DELETE'),
  resetWorkflows: () => request<ApiWorkflow[]>('/workflows/reset', 'POST'),
  getFieldDefinitions: () => request<FieldDefinitionsConfig>('/field-definitions'),
  getOptions: () => request<ApiOptionSet[]>('/options'),
  chat: (body: ChatRequest) => request<ChatResponse>('/chat', 'POST', body),
  submitRequest: (body: SubmitRequestBody) =>
    request<SubmitRequestResponse>('/requests', 'POST', body),
  getFlows: () => request<FlowTrackingData[]>('/flows'),
  downloadFile,
};

/**
 * Downloads a generated file. `downloadUrl` comes from the backend ("/api/files/<id>"); links are
 * anonymous and expire server-side. fetch + blob so expired/missing files surface as an ApiError.
 */
async function downloadFile(downloadUrl: string, fileName: string): Promise<void> {
  if (!/^\/api\/files\/[0-9a-f-]{36}$/.test(downloadUrl)) {
    throw new ApiError(0, 'INVALID_URL', 'Liên kết tải tệp không hợp lệ.');
  }
  let res: Response;
  try {
    res = await fetch(downloadUrl);
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối tới máy chủ. Vui lòng thử lại.');
  }
  if (!res.ok) {
    const err = ((await res.json().catch(() => null)) as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `Tải tệp thất bại (HTTP ${res.status}).`);
  }

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
