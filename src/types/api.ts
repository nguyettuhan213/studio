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
  /** Post-submission actions. The request is already persisted regardless of this status. */
  actions: SubmitActionsReport;
}

// ---- Post-submission actions ----
export interface GeneratedFile {
  fileId: string;
  fileName: string;
  size: number;
  /** Same-origin API path, e.g. "/api/files/<fileId>". */
  downloadUrl: string;
  /** ISO timestamp after which the download link stops working. */
  expiresAt: string;
}

export interface WordDocumentOutput {
  kind: 'word_document';
  file: GeneratedFile;
}

/** Prepared email only; it is never sent. */
export interface EmailPreview {
  kind: 'email';
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  /** For bodyFormat 'html', substituted values are HTML-escaped; render it sandboxed. */
  body: string;
  bodyFormat: 'text' | 'html';
  attachments: GeneratedFile[];
}

export type ActionOutput = WordDocumentOutput | EmailPreview;

export interface ActionResult {
  id: string;
  /** 'word_document' | 'email' | 'n8n', or the raw value of an invalid configuration. */
  type: string;
  status: 'success' | 'failed' | 'skipped';
  /** Set when status is 'failed'. */
  error?: { code: string; message: string };
  /** Set when status is 'skipped'. */
  reason?: string;
  output?: ActionOutput;
}

export interface SubmitActionsReport {
  /** 'success' also when no action is configured (results is then empty). */
  status: 'success' | 'partial_success' | 'failed';
  results: ActionResult[];
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
