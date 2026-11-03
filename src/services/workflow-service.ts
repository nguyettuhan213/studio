import fs from 'fs/promises';
import path from 'path';
import { z } from 'genkit';
import type {
  WorkflowConfig,
  RawWorkflowConfig,
  ResolvedWorkflowConfig,
  WorkflowsConfigFile,
  FieldDefinitionsConfig,
  WorkflowFieldConfig,
} from '@/types/workflow';
import defaultWorkflowsData from '@/config/workflows.json';
import defaultFieldDefinitionsData from '@/config/field-definitions.json';
import {
  isValidPredefinedOptionKey,
  PREDEFINED_OPTIONS,
} from '@/config/predefined-options';
import {
  resolveWorkflow,
  resolveWorkflowField,
  resolveFieldOptions,
  validateExtractedValues,
  getDefaultFieldDefinitions,
} from '@/lib/workflow-utils';
export {
  resolveWorkflow,
  resolveWorkflowField,
  resolveFieldOptions,
  validateExtractedValues,
  getDefaultFieldDefinitions,
} from '@/lib/workflow-utils';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'src', 'config', 'workflows.json');
const FIELD_DEFINITIONS_FILE_PATH = path.join(
  process.cwd(),
  'src',
  'config',
  'field-definitions.json'
);

// In-memory cache for fast access
let cachedWorkflows: ResolvedWorkflowConfig[] | null = null;
let cachedFieldDefinitions: FieldDefinitionsConfig | null = null;

export async function getFieldDefinitions(): Promise<FieldDefinitionsConfig> {
  try {
    const raw = await fs.readFile(FIELD_DEFINITIONS_FILE_PATH, 'utf-8');
    const parsed: FieldDefinitionsConfig = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      cachedFieldDefinitions = parsed;
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to read field definitions from file, using fallback:', error);
  }

  if (cachedFieldDefinitions) {
    return cachedFieldDefinitions;
  }

  return defaultFieldDefinitionsData as FieldDefinitionsConfig;
}

export async function getWorkflows(): Promise<ResolvedWorkflowConfig[]> {
  const fieldDefinitions = await getFieldDefinitions();

  try {
    const raw = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    const parsed: WorkflowsConfigFile = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.workflows)) {
      const resolved = parsed.workflows.map((wf) =>
        resolveWorkflow(wf, fieldDefinitions)
      );
      cachedWorkflows = resolved;
      return resolved;
    }
  } catch (error) {
    console.warn('Failed to read workflows from file, using fallback:', error);
  }

  if (cachedWorkflows) {
    return cachedWorkflows;
  }

  const rawDefaults = (defaultWorkflowsData as WorkflowsConfigFile).workflows;
  const resolved = rawDefaults.map((wf) =>
    resolveWorkflow(wf, fieldDefinitions)
  );
  cachedWorkflows = resolved;
  return resolved;
}

export async function getWorkflowById(
  id: string
): Promise<ResolvedWorkflowConfig | null> {
  const workflows = await getWorkflows();
  return workflows.find((w) => w.id === id) || null;
}

export async function saveWorkflows(
  workflows: WorkflowConfig<any>[]
): Promise<void> {
  const fieldDefinitions = await getFieldDefinitions();

  for (const wf of workflows) {
    validateWorkflowConfiguration(wf, fieldDefinitions);
  }

  // Deduplicate fields against field-definitions.json before persisting
  const cleanedWorkflows: RawWorkflowConfig[] = workflows.map((wf) => {
    const cleanedFields: WorkflowFieldConfig[] = wf.fields.map((field) => {
      const defKey = field.fieldDefinitionKey || field.name;
      const sharedDef = fieldDefinitions[defKey];

      const cleaned: WorkflowFieldConfig = {
        name: field.name,
        fieldDefinitionKey: defKey,
        required: Boolean(field.required),
      };

      // Only save overrides if they differ from shared definitions
      if (sharedDef) {
        if (field.label && field.label !== sharedDef.label && field.label !== field.name) {
          cleaned.label = field.label;
        }
        if (field.type && field.type !== sharedDef.type) {
          cleaned.type = field.type;
        }
      } else {
        if (field.label) cleaned.label = field.label;
        if (field.type) cleaned.type = field.type;
      }

      if (field.optionKey) {
        cleaned.optionKey = field.optionKey;
      }
      if (field.valueHandling) {
        cleaned.valueHandling = field.valueHandling;
      }
      if (field.description) {
        cleaned.description = field.description;
      }

      if (field.displaySettings) {
        const ds = { ...field.displaySettings };
        // If placeholder matches shared definition placeholder, omit from displaySettings
        if (sharedDef && ds.placeholder === sharedDef.placeholder) {
          delete ds.placeholder;
        }
        if (Object.keys(ds).length > 0) {
          cleaned.displaySettings = ds;
        }
      }

      return cleaned;
    });

    return {
      id: wf.id,
      name: wf.name,
      description: wf.description,
      ...(wf.layout ? { layout: wf.layout } : {}),
      fields: cleanedFields,
    };
  });

  const configData: WorkflowsConfigFile = { workflows: cleanedWorkflows };
  await fs.writeFile(
    CONFIG_FILE_PATH,
    JSON.stringify(configData, null, 2),
    'utf-8'
  );

  // Invalidate cache and update
  cachedWorkflows = workflows.map((wf) => resolveWorkflow(wf, fieldDefinitions));
}

/**
 * Validates a workflow's configuration structure, field types, and option references.
 * Resolves each field against field-definitions.json first.
 * Throws an Error if references are invalid.
 */
export function validateWorkflowConfiguration(
  workflow: WorkflowConfig<any>,
  fieldDefinitions: FieldDefinitionsConfig = defaultFieldDefinitionsData as FieldDefinitionsConfig
): void {
  if (!workflow.id || !workflow.name) {
    throw new Error('Mã (ID) và Tên quy trình không được để trống.');
  }

  if (!Array.isArray(workflow.fields) || workflow.fields.length === 0) {
    throw new Error('Quy trình phải có ít nhất 1 trường cấu hình.');
  }

  const seenNames = new Set<string>();
  for (const rawField of workflow.fields) {
    if (!rawField.name) {
      throw new Error('Tất cả các trường phải có Tên định danh (name).');
    }
    if (seenNames.has(rawField.name)) {
      throw new Error(`Tên định danh trường "${rawField.name}" bị trùng lặp.`);
    }
    seenNames.add(rawField.name);

    const resolved = resolveWorkflowField(rawField, fieldDefinitions);
    const label = resolved.label || resolved.displayName;
    if (!label) {
      throw new Error(
        `Trường "${rawField.name}" chưa có Tên hiển thị (label) hoặc khóa định nghĩa không hợp lệ.`
      );
    }

    if (
      resolved.type !== 'text' &&
      resolved.type !== 'number' &&
      resolved.type !== 'option'
    ) {
      throw new Error(
        `Kiểu dữ liệu của trường "${rawField.name}" phải là 'text', 'number', hoặc 'option'.`
      );
    }

    if (resolved.type === 'option') {
      if (!resolved.optionKey) {
        throw new Error(
          `Trường "${rawField.name}" có kiểu "option" nhưng chưa cấu hình khóa tùy chọn (optionKey).`
        );
      }
      if (!isValidPredefinedOptionKey(resolved.optionKey)) {
        const validKeys = Object.keys(PREDEFINED_OPTIONS).join(', ');
        throw new Error(
          `Trường "${rawField.name}" tham chiếu đến khóa tùy chọn không tồn tại "${resolved.optionKey}". Các khóa hợp lệ gồm: ${validKeys}.`
        );
      }
    }
  }
}

export async function createWorkflow(
  workflow: WorkflowConfig<any>
): Promise<ResolvedWorkflowConfig> {
  const workflows = await getWorkflows();
  if (workflows.some((w) => w.id === workflow.id)) {
    throw new Error(`Workflow with ID "${workflow.id}" already exists.`);
  }
  const updated = [...workflows, workflow];
  await saveWorkflows(updated);
  return (await getWorkflowById(workflow.id))!;
}

export async function updateWorkflow(
  id: string,
  updatedConfig: WorkflowConfig<any>
): Promise<ResolvedWorkflowConfig> {
  const workflows = await getWorkflows();
  const index = workflows.findIndex((w) => w.id === id);
  if (index === -1) {
    throw new Error(`Workflow with ID "${id}" not found.`);
  }
  workflows[index] = updatedConfig;
  await saveWorkflows(workflows);
  return (await getWorkflowById(id))!;
}

export async function deleteWorkflow(id: string): Promise<void> {
  const workflows = await getWorkflows();
  if (workflows.length <= 1) {
    throw new Error(
      'Không thể xóa quy trình cuối cùng. Hệ thống cần ít nhất 1 quy trình.'
    );
  }
  const filtered = workflows.filter((w) => w.id !== id);
  if (filtered.length === workflows.length) {
    throw new Error(`Workflow with ID "${id}" not found.`);
  }
  await saveWorkflows(filtered);
}

export async function resetWorkflowsToDefault(): Promise<ResolvedWorkflowConfig[]> {
  const defaults = (defaultWorkflowsData as WorkflowsConfigFile).workflows;
  await saveWorkflows(defaults);
  return getWorkflows();
}

/**
 * Generates a dynamic Zod schema from a workflow's configuration.
 * Resolves fields against field definitions before building the schema.
 * NOTE: This function uses genkit's z (Zod) and must remain server-only.
 */
export function buildWorkflowZodSchema(
  workflow: WorkflowConfig<any>
): z.ZodObject<any> {
  const resolved = resolveWorkflow(workflow);
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of resolved.fields) {
    let s: z.ZodTypeAny;

    if (field.type === 'number') {
      s = z.number();
    } else if (field.type === 'option') {
      const options = resolveFieldOptions(field);
      if (options && options.length > 0) {
        s = z.enum(options as [string, ...string[]]);
      } else {
        s = z.string();
      }
    } else {
      s = z.string();
    }

    const desc = field.description || field.label || field.displayName;
    if (desc) {
      s = s.describe(desc);
    }
    shape[field.name] = field.required ? s : s.optional();
  }
  return z.object(shape);
}

