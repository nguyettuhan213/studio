/**
 * @fileOverview Trích xuất chi tiết từ đầu vào ngôn ngữ tự nhiên bằng AI.
 * Tạo ExtractBookingDetailsOutputSchema động từ cấu hình JSON của quy trình được chọn.
 *
 * - extractBookingDetails - Hàm trích xuất chi tiết theo cấu hình quy trình động.
 * - getExtractWorkflowDetailsOutputSchema - Tạo Zod Schema động từ cấu hình quy trình.
 * - ExtractBookingDetailsOutputSchema - Zod Schema tạo động từ quy trình.
 * - ExtractBookingDetailsInput - Kiểu đầu vào.
 * - ExtractBookingDetailsOutput - Kiểu trả về động.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { extractWorkflowDetails } from './extract-workflow-details';
import {
  buildWorkflowZodSchema,
  getWorkflowById,
  getWorkflows,
} from '@/services/workflow-service';
import defaultWorkflowsData from '@/config/workflows.json';
import type { WorkflowConfig, WorkflowsConfigFile } from '@/types/workflow';

export const ExtractBookingDetailsInputSchema = z.object({
  request: z.string().describe('Yêu cầu bằng ngôn ngữ tự nhiên.'),
  workflowId: z.string().nullable().optional().describe('Mã quy trình cần trích xuất (tùy chọn).'),
});
export type ExtractBookingDetailsInput = z.infer<typeof ExtractBookingDetailsInputSchema>;

/**
 * Generates ExtractBookingDetailsOutputSchema dynamically from the selected workflow's configuration.
 */
export function getExtractWorkflowDetailsOutputSchema(
  workflow?: WorkflowConfig
): z.ZodObject<any> {
  const targetWorkflow =
    workflow || (defaultWorkflowsData as WorkflowsConfigFile).workflows[0];
  return buildWorkflowZodSchema(targetWorkflow);
}

// Dynamically generate default output schema from the primary workflow in JSON config
export const ExtractBookingDetailsOutputSchema = getExtractWorkflowDetailsOutputSchema();
export type ExtractBookingDetailsOutput = Record<string, any>;

export async function extractBookingDetails(
  input: ExtractBookingDetailsInput
): Promise<ExtractBookingDetailsOutput> {
  return extractBookingDetailsFlow(input);
}

const extractBookingDetailsFlow = ai.defineFlow(
  {
    name: 'extractBookingDetailsFlow',
    inputSchema: ExtractBookingDetailsInputSchema,
    outputSchema: z.record(z.any()),
  },
  async (input) => {
    const result = await extractWorkflowDetails({
      request: input.request,
      preferredWorkflowId: input.workflowId ?? undefined,
    });

    if (!result.workflowId) {
      return {};
    }

    const matchedWorkflowId: string = result.workflowId;
    const activeWorkflow = await getWorkflowById(matchedWorkflowId);
    if (!activeWorkflow) {
      return {};
    }
    const dynamicSchema = getExtractWorkflowDetailsOutputSchema(activeWorkflow);

    // Validate and parse against the dynamically generated schema
    const parsedOutput = dynamicSchema.partial().parse(result.extractedDetails);
    return parsedOutput;
  }
);
