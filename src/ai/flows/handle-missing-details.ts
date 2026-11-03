/**
 * @fileOverview Luồng Genkit xử lý các chi tiết còn thiếu trong yêu cầu một cách hoàn toàn động
 * dựa trên cấu hình workflow được chọn.
 *
 * - handleMissingDetails - Hàm xác định và yêu cầu thông tin còn thiếu theo workflow.
 * - HandleMissingDetailsInput - Kiểu đầu vào linh hoạt.
 * - HandleMissingDetailsOutput - Kiểu kết quả trả về.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  getWorkflows,
  getWorkflowById,
  validateExtractedValues,
} from '@/services/workflow-service';
import type { WorkflowConfig } from '@/types/workflow';

export const HandleMissingDetailsInputSchema = z.record(z.any());
export type HandleMissingDetailsInput = Record<string, any>;

export const HandleMissingDetailsOutputSchema = z.object({
  missingDetails: z.array(z.string()).describe('Danh sách các trường bắt buộc còn thiếu trong yêu cầu.'),
  followUpQuestions: z
    .array(z.string())
    .describe('Danh sách câu hỏi gợi ý để thu thập các trường còn thiếu bằng tiếng Việt.'),
  isComplete: z.boolean().describe('Liệu tất cả các chi tiết cần thiết đã có mặt hay chưa.'),
});
export type HandleMissingDetailsOutput = z.infer<typeof HandleMissingDetailsOutputSchema>;

export async function handleMissingDetails(
  input: HandleMissingDetailsInput
): Promise<HandleMissingDetailsOutput> {
  return handleMissingDetailsFlow(input);
}

const handleMissingDetailsFlow = ai.defineFlow(
  {
    name: 'handleMissingDetailsFlow',
    inputSchema: HandleMissingDetailsInputSchema,
    outputSchema: HandleMissingDetailsOutputSchema,
  },
  async (input) => {
    const workflows = await getWorkflows();
    let targetWorkflow: WorkflowConfig | undefined;

    if (typeof input.workflowId === 'string' && input.workflowId.trim()) {
      targetWorkflow = workflows.find((w) => w.id === input.workflowId);
    }

    if (!targetWorkflow) {
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
        missingDetails: [],
        followUpQuestions: [
          'Vui lòng xác định quy trình bạn muốn thực hiện để tiếp tục.',
        ],
        isComplete: false,
      };
    }

    // Dynamic validation to identify missing required fields
    const validation = validateExtractedValues(targetWorkflow, input);
    const missingFieldNames = validation.missingFields;

    const missingDisplayNames = missingFieldNames.map((name) => {
      const f = targetWorkflow.fields.find((field) => field.name === name);
      return f ? (f.label || f.displayName) : name;
    });

    const followUpQuestions: string[] = [];
    if (missingDisplayNames.length > 0) {
      followUpQuestions.push(
        `Để hoàn tất quy trình [${targetWorkflow.name}], bạn vui lòng cung cấp thêm: ${missingDisplayNames.join(
          ', '
        )}.`
      );
    }

    return {
      missingDetails: missingFieldNames,
      followUpQuestions,
      isComplete: validation.isValid,
    };
  }
);
