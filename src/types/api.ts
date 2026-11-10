/**
 * Backend API contract types.
 * MIRROR of backend/src/contracts.ts (source of truth) — update both together.
 */
import type {
  RawWorkflowConfig,
  ResolvedWorkflowConfig,
  ResolvedWorkflowFieldConfig,
  WorkflowValidationResult,
  FieldDefinitionsConfig,
} from '@/types/workflow';

export type { RawWorkflowConfig, FieldDefinitionsConfig };

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export type ApiWorkflowField = ResolvedWorkflowFieldConfig & { resolvedOptions?: string[] };
export type ApiWorkflow = Omit<ResolvedWorkflowConfig, 'fields'> & { fields: ApiWorkflowField[] };

export interface ApiOptionSet {
  key: string;
  label: string;
  values: string[];
}

export interface ChatRequest {
  message: string;
  /** The ACTIVE workflow's values from the shared store. */
  values?: Record<string, any>;
  /** Active (locked) workflow; null before first identification. */
  workflowId?: string | null;
  history?: Array<{ sender: 'user' | 'ai'; text: string }>;
}

export interface ChatResponse {
  /** Values explicitly extracted from this message only (no defaults). */
  extracted: Record<string, string | number>;
  workflowId: string | null;
  workflowName: string | null;
  isWorkflowIdentified: boolean;
  aiMessage: string;
  validation: WorkflowValidationResult | null;
  /** Explicit switch request; must be confirmed by the user before switching. */
  suggestedWorkflow: { id: string; name: string } | null;
}

export interface SubmitRequestBody {
  workflowId: string;
  details: Record<string, any>;
}

export interface SubmitRequestResponse {
  requestId: string;
  aiMessage: string;
}

export interface FlowTrackingData {
  flowId?: string;
  status?: string;
  owner?: string;
  timestamp?: number;
  startAt?: number;
  step?: number;
  details?: any;
}
