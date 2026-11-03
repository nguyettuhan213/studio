/**
 * @fileOverview Client-safe workflow utility functions.
 *
 * This module contains pure utility logic for resolving field definitions,
 * resolving field options, and validating extracted workflow values.
 * It has NO server-only dependencies (no genkit, no fs, no Node.js built-ins)
 * and is safe to import in both server components and client components ("use client").
 */
import type {
  WorkflowConfig,
  WorkflowFieldConfig,
  ResolvedWorkflowFieldConfig,
  ResolvedWorkflowConfig,
  WorkflowValidationResult,
  FieldDefinitionsConfig,
  FieldType,
  FieldDisplaySettings,
} from '@/types/workflow';
import { getPredefinedOptions } from '@/config/predefined-options';
import defaultFieldDefinitionsData from '@/config/field-definitions.json';

/**
 * Returns the default shared field definitions from field-definitions.json.
 */
export function getDefaultFieldDefinitions(): FieldDefinitionsConfig {
  return defaultFieldDefinitionsData as FieldDefinitionsConfig;
}

/**
 * Resolves a single workflow field by merging its shared definition from
 * `field-definitions.json` with workflow-specific settings, prioritizing workflow-level overrides.
 */
export function resolveWorkflowField(
  field: WorkflowFieldConfig,
  fieldDefinitions: FieldDefinitionsConfig = defaultFieldDefinitionsData as FieldDefinitionsConfig
): ResolvedWorkflowFieldConfig {
  const defKey = field.fieldDefinitionKey || field.name;
  const sharedDef = fieldDefinitions ? fieldDefinitions[defKey] : undefined;

  // Workflow-level overrides take precedence
  const type: FieldType = field.type || sharedDef?.type || 'text';
  const label: string =
    field.label || field.displayName || sharedDef?.label || field.name;
  const placeholder: string =
    field.displaySettings?.placeholder ||
    field.placeholder ||
    sharedDef?.placeholder ||
    '';
  const description: string | undefined =
    field.description || sharedDef?.description;

  const displaySettings: FieldDisplaySettings = {
    component:
      field.displaySettings?.component ||
      (type === 'option' ? 'select' : 'input'),
    colSpan: field.displaySettings?.colSpan || 1,
    ...field.displaySettings,
    placeholder,
  };

  return {
    ...field,
    name: field.name,
    fieldDefinitionKey: defKey,
    type,
    label,
    displayName: label,
    placeholder,
    description,
    required: Boolean(field.required),
    displaySettings,
  };
}

/**
 * Resolves all fields in a workflow against shared field definitions.
 */
export function resolveWorkflow(
  workflow: WorkflowConfig<any>,
  fieldDefinitions: FieldDefinitionsConfig = defaultFieldDefinitionsData as FieldDefinitionsConfig
): ResolvedWorkflowConfig {
  const fields = Array.isArray(workflow.fields)
    ? workflow.fields.map((f) => resolveWorkflowField(f, fieldDefinitions))
    : [];

  return {
    ...workflow,
    fields,
  };
}

/**
 * Resolves the list of options for a given workflow field.
 * For type 'option', resolves dynamically from the centralized predefined options registry.
 */
export function resolveFieldOptions(
  field: WorkflowFieldConfig | ResolvedWorkflowFieldConfig
): string[] | undefined {
  if (field.type === 'option') {
    if (field.optionKey) {
      return getPredefinedOptions(field.optionKey);
    }
    return undefined;
  }
  if (field.displaySettings?.options && Array.isArray(field.displaySettings.options)) {
    return field.displaySettings.options;
  }
  return undefined;
}

/**
 * Validates extracted values against field types ('number' | 'text' | 'option'),
 * required-field rules, predefined option values, and value-handling specifications.
 * Resolves fields at runtime first so shared definitions and workflow overrides are respected.
 * Strips unconfigured fields to ensure only fields configured for this workflow are returned.
 */
export function validateExtractedValues(
  workflow: WorkflowConfig<any>,
  data: Record<string, any>,
  fieldDefinitions?: FieldDefinitionsConfig
): WorkflowValidationResult {
  const resolvedWorkflow = resolveWorkflow(workflow, fieldDefinitions);
  const errors: string[] = [];
  const missingFields: string[] = [];
  const validatedData: Record<string, string | number> = {};

  for (const field of resolvedWorkflow.fields) {
    const rawVal = data ? data[field.name] : undefined;
    const fieldLabel = field.label || field.displayName;

    // Check presence
    const isProvided =
      rawVal !== undefined &&
      rawVal !== null &&
      (typeof rawVal !== 'string' || rawVal.trim() !== '');

    if (!isProvided) {
      if (field.required) {
        missingFields.push(field.name);
        errors.push(`Trường "${fieldLabel}" là bắt buộc.`);
      } else if (field.valueHandling?.defaultValue !== undefined) {
        validatedData[field.name] = field.valueHandling.defaultValue;
      }
      continue;
    }

    // Type & value handling validation
    if (field.type === 'number') {
      let numVal: number | null = null;
      if (typeof rawVal === 'number' && !isNaN(rawVal)) {
        numVal = rawVal;
      } else if (
        typeof rawVal === 'string' &&
        rawVal.trim() !== '' &&
        !isNaN(Number(rawVal.trim()))
      ) {
        numVal = Number(rawVal.trim());
      } else {
        errors.push(`Trường "${fieldLabel}" phải là kiểu số (number).`);
      }

      if (numVal !== null) {
        if (field.valueHandling?.min !== undefined && numVal < field.valueHandling.min) {
          errors.push(
            `Trường "${fieldLabel}" phải có giá trị tối thiểu là ${field.valueHandling.min}.`
          );
        }
        if (field.valueHandling?.max !== undefined && numVal > field.valueHandling.max) {
          errors.push(
            `Trường "${fieldLabel}" không được vượt quá ${field.valueHandling.max}.`
          );
        }
        validatedData[field.name] = numVal;
      }
    } else if (field.type === 'option') {
      const allowedOptions = resolveFieldOptions(field);
      if (!allowedOptions || allowedOptions.length === 0) {
        errors.push(
          `Trường "${fieldLabel}" tham chiếu đến khóa tùy chọn không hợp lệ "${field.optionKey}".`
        );
      } else {
        const strVal = typeof rawVal === 'string' ? rawVal.trim() : String(rawVal);
        // Match exact or case-insensitive/trimmed
        const matched =
          allowedOptions.find((opt) => opt === strVal) ||
          allowedOptions.find((opt) => opt.trim().toLowerCase() === strVal.toLowerCase());

        if (matched) {
          validatedData[field.name] = matched;
        } else {
          errors.push(
            `Giá trị "${strVal}" cho trường "${fieldLabel}" không hợp lệ. Vui lòng chọn một trong các lựa chọn định sẵn.`
          );
        }
      }
    } else {
      // field.type === 'text'
      const strVal = typeof rawVal === 'string' ? rawVal.trim() : String(rawVal);
      if (field.valueHandling?.pattern) {
        try {
          const reg = new RegExp(field.valueHandling.pattern);
          if (!reg.test(strVal)) {
            errors.push(
              field.valueHandling.errorMessage ||
                `Trường "${fieldLabel}" không đúng định dạng yêu cầu.`
            );
          }
        } catch {
          // ignore invalid regex pattern in config
        }
      }
      validatedData[field.name] = strVal;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    missingFields,
    validatedData,
  };
}

