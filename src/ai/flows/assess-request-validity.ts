/**
 * @fileOverview Tác nhân AI đánh giá tính hợp lệ của yêu cầu theo cấu hình quy trình động.
 * 
 * - assessRequestValidity - Đánh giá tính hợp lệ và đầy đủ của yêu cầu dựa trên cấu hình workflow.
 * - AssessRequestValidityInput - Dữ liệu đầu vào.
 * - AssessRequestValidityOutput - Kết quả đánh giá.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  getWorkflows,
  getWorkflowById,
  validateExtractedValues,
} from '@/services/workflow-service';
import type { WorkflowConfig } from '@/types/workflow';

export const AssessRequestValidityInputSchema = z.record(z.any());
export type AssessRequestValidityInput = Record<string, any>;

export const AssessRequestValidityOutputSchema = z.object({
  isValid: z.boolean().describe('Liệu yêu cầu có hợp lệ và đầy đủ hay không.'),
  errors: z.array(z.string()).describe('Danh sách các lỗi xác thực (bằng tiếng Việt).'),
  missingFields: z.array(z.string()).optional().describe('Danh sách các trường bắt buộc còn thiếu.'),
});
export type AssessRequestValidityOutput = z.infer<typeof AssessRequestValidityOutputSchema>;

export async function assessRequestValidity(
  input: AssessRequestValidityInput
): Promise<AssessRequestValidityOutput> {
  return assessRequestValidityFlow(input);
}

const assessRequestValidityFlow = ai.defineFlow(
  {
    name: 'assessRequestValidityFlow',
    inputSchema: AssessRequestValidityInputSchema,
    outputSchema: AssessRequestValidityOutputSchema,
  },
  async (input) => {
    const workflows = await getWorkflows();
    let targetWorkflow: WorkflowConfig | undefined;

    if (typeof input.workflowId === 'string' && input.workflowId.trim()) {
      targetWorkflow = workflows.find((w) => w.id === input.workflowId);
    }

    if (!targetWorkflow) {
      // Intelligently match workflow by field intersection
      let maxMatches = 0;
      for (const wf of workflows) {
        const matches = wf.fields.filter((f) => f.name in input).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          targetWorkflow = wf;
        }
      }
    }

    if (!targetWorkflow) {
      return {
        isValid: false,
        errors: ['Chưa xác định quy trình hợp lệ để đánh giá.'],
        missingFields: [],
      };
    }

    // Dynamic validation using selected workflow's configuration
    const validation = validateExtractedValues(targetWorkflow, input);

    return {
      isValid: validation.isValid,
      errors: validation.errors,
      missingFields: validation.missingFields,
    };
  }
);
