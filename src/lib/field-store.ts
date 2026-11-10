/**
 * Shared field store: ONE map of values keyed by field name, shared by every workflow.
 * Same name = same value everywhere; the latest write wins. Defaults are never stored
 * (two workflows can have different defaults for the same field) — they are only shown in the
 * form and filled in when building a submission.
 */
import type { ApiWorkflow } from '@/types/api';

export type FieldValues = Record<string, string | number>;

const isEmpty = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** All field names configured in any workflow; only these may enter the store. */
export function knownFieldNames(workflows: ApiWorkflow[]): Set<string> {
  return new Set(workflows.flatMap((w) => w.fields.map((f) => f.name)));
}

/** Merge AI-extracted values: non-empty, known names only, latest wins. */
export function mergeExtracted(store: FieldValues, incoming: Record<string, unknown>, known: Set<string>): FieldValues {
  const next = { ...store };
  for (const [name, value] of Object.entries(incoming)) {
    if (known.has(name) && !isEmpty(value)) next[name] = value as string | number;
  }
  return next;
}

/** Manual edit. An emptied field is kept as "" so it stays visibly empty instead of showing a default. */
export function setFieldValue(store: FieldValues, name: string, value: string | number | undefined): FieldValues {
  return { ...store, [name]: value ?? '' };
}

/** The active workflow's non-empty values (sent to the chat). */
export function activeValues(store: FieldValues, workflow: ApiWorkflow | null): FieldValues {
  const out: FieldValues = {};
  for (const f of workflow?.fields ?? []) {
    if (!isEmpty(store[f.name])) out[f.name] = store[f.name];
  }
  return out;
}

/** What the form shows: stored value if the key exists (even ""), otherwise the field's default. */
export function displayValue(store: FieldValues, field: ApiWorkflow['fields'][number]): string | number | undefined {
  return field.name in store ? store[field.name] : field.valueHandling?.defaultValue;
}

/** Submission payload: ONLY the active workflow's fields (store value or default), empties skipped. */
export function buildSubmission(store: FieldValues, workflow: ApiWorkflow): FieldValues {
  const out: FieldValues = {};
  for (const f of workflow.fields) {
    const v = displayValue(store, f);
    if (!isEmpty(v)) out[f.name] = v as string | number;
  }
  return out;
}

const normalizeReply = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const YES = new Set(['co', 'dong y', 'yes', 'agree']);
const NO = new Set(['khong', 'giu', 'no']);

/**
 * Typed answer to a pending workflow-switch suggestion. The WHOLE message must be an explicit
 * yes/no; anything else is null (not a confirmation).
 */
export function matchSwitchReply(text: string): 'yes' | 'no' | null {
  const t = normalizeReply(text);
  if (YES.has(t)) return 'yes';
  if (NO.has(t)) return 'no';
  return null;
}
