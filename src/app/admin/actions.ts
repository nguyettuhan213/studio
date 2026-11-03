'use server';

import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  resetWorkflowsToDefault,
  saveWorkflows,
  getFieldDefinitions,
  resolveWorkflowField,
} from '@/services/workflow-service';
import {
  getAllPredefinedOptionKeys,
  isValidPredefinedOptionKey,
  PREDEFINED_OPTIONS,
} from '@/config/predefined-options';
import type { WorkflowConfig, FieldDefinitionsConfig } from '@/types/workflow';

export async function getWorkflowsAction(): Promise<WorkflowConfig[]> {
  return getWorkflows();
}

export async function getWorkflowByIdAction(id: string): Promise<WorkflowConfig | null> {
  return getWorkflowById(id);
}

export async function getFieldDefinitionsAction(): Promise<FieldDefinitionsConfig> {
  return getFieldDefinitions();
}

export async function getPredefinedOptionsMetadataAction() {
  return getAllPredefinedOptionKeys();
}

export async function saveWorkflowAction(
  workflow: WorkflowConfig<any>,
  isNew: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate workflow structure
    if (!workflow.id || !workflow.name) {
      return { success: false, error: 'Mã (ID) và Tên quy trình không được để trống.' };
    }

    if (!Array.isArray(workflow.fields) || workflow.fields.length === 0) {
      return { success: false, error: 'Quy trình phải có ít nhất 1 trường cấu hình.' };
    }

    const fieldDefs = await getFieldDefinitions();

    // Validate fields
    const seenNames = new Set<string>();
    for (const rawField of workflow.fields) {
      if (!rawField.name) {
        return { success: false, error: 'Tất cả các trường phải có Tên định danh (name).' };
      }
      if (seenNames.has(rawField.name)) {
        return { success: false, error: `Tên định danh trường "${rawField.name}" bị trùng lặp.` };
      }
      seenNames.add(rawField.name);

      const resolved = resolveWorkflowField(rawField, fieldDefs);
      const label = resolved.label || resolved.displayName;
      if (!label) {
        return {
          success: false,
          error: `Trường "${rawField.name}" phải có Tên hiển thị (label) hoặc khóa định nghĩa hợp lệ.`,
        };
      }

      if (resolved.type !== 'text' && resolved.type !== 'number' && resolved.type !== 'option') {
        return {
          success: false,
          error: `Kiểu dữ liệu của trường "${rawField.name}" phải là 'text', 'number', hoặc 'option'.`,
        };
      }

      if (resolved.type === 'option') {
        if (!resolved.optionKey) {
          return {
            success: false,
            error: `Trường "${rawField.name}" có kiểu "option" nhưng chưa chỉ định khóa tùy chọn (optionKey).`,
          };
        }
        if (!isValidPredefinedOptionKey(resolved.optionKey)) {
          const validKeys = Object.keys(PREDEFINED_OPTIONS).join(', ');
          return {
            success: false,
            error: `Khóa tùy chọn "${resolved.optionKey}" của trường "${rawField.name}" không tồn tại. Các khóa hợp lệ là: ${validKeys}.`,
          };
        }
      }
    }

    if (isNew) {
      await createWorkflow(workflow);
    } else {
      await updateWorkflow(workflow.id, workflow);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi lưu cấu hình quy trình:', error);
    return { success: false, error: error.message || 'Lỗi không xác định khi lưu quy trình.' };
  }
}

export async function deleteWorkflowAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteWorkflow(id);
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi xóa quy trình:', error);
    return { success: false, error: error.message || 'Lỗi không xác định khi xóa quy trình.' };
  }
}

export async function resetWorkflowsAction(): Promise<{
  success: boolean;
  workflows?: WorkflowConfig[];
  error?: string;
}> {
  try {
    const workflows = await resetWorkflowsToDefault();
    return { success: true, workflows };
  } catch (error: any) {
    console.error('Lỗi khi khôi phục quy trình mặc định:', error);
    return { success: false, error: error.message || 'Lỗi không xác định.' };
  }
}
