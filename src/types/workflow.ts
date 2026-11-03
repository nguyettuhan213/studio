export type FieldType = 'number' | 'text' | 'option';
export type FieldComponentType = 'input' | 'textarea' | 'select';

export interface FieldDisplaySettings {
  component?: FieldComponentType;
  colSpan?: 1 | 2;
  placeholder?: string;
  options?: string[];
}

export interface FieldValueHandling {
  defaultValue?: string | number;
  min?: number;
  max?: number;
  pattern?: string;
  errorMessage?: string;
}


/**
 * Shared field metadata defined in field-definitions.json.
 */
export interface FieldDefinition {
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
}

export type FieldDefinitionsConfig = Record<string, FieldDefinition>;

/**
 * Workflow field configuration in workflows.json.
 * References shared field metadata via `fieldDefinitionKey` and supports workflow-level overrides.
 */
export interface WorkflowFieldConfig {
  name: string;
  fieldDefinitionKey?: string;
  label?: string;
  displayName?: string;
  type?: FieldType;
  placeholder?: string;
  description?: string;
  required: boolean;
  /**
   * For fields of type 'option', references a predefined constant array key
   * in the centralized predefined options registry (e.g. 'validDepartments').
   */
  optionKey?: string;
  displaySettings?: FieldDisplaySettings;
  valueHandling?: FieldValueHandling;
}

/**
 * Resolved field configuration where shared metadata has been merged
 * with workflow-level overrides.
 */
export interface ResolvedWorkflowFieldConfig extends WorkflowFieldConfig {
  name: string;
  fieldDefinitionKey: string;
  label: string;
  displayName: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  description?: string;
  optionKey?: string;
  displaySettings?: FieldDisplaySettings;
  valueHandling?: FieldValueHandling;
}

export interface WorkflowLayoutConfig {
  columns?: 1 | 2;
  submitButtonText?: string;
  cancelButtonText?: string;
}

export interface WorkflowConfig<TField = ResolvedWorkflowFieldConfig> {
  id: string;
  name: string;
  description: string;
  layout?: WorkflowLayoutConfig;
  fields: TField[];
}

export type RawWorkflowConfig = WorkflowConfig<WorkflowFieldConfig>;
export type ResolvedWorkflowConfig = WorkflowConfig<ResolvedWorkflowFieldConfig>;

export interface WorkflowsConfigFile {
  workflows: WorkflowConfig<any>[];
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  missingFields: string[];
  validatedData: Record<string, string | number>;
}

