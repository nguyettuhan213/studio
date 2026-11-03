/**
 * @fileOverview Luồng trích xuất thông tin động đa quy trình (multi-workflow) sử dụng Gemini API.
 * 
 * - Tự động nhận diện loại quy trình (workflow type) từ cuộc trò chuyện.
 * - Chỉ trích xuất các trường được cấu hình cho quy trình đó.
 * - Xác thực giá trị trích xuất theo kiểu trường ('number' | 'text') và quy tắc trường bắt buộc.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  getWorkflows,
  getWorkflowById,
  validateExtractedValues,
  resolveFieldOptions,
} from '@/services/workflow-service';
import type { WorkflowConfig, WorkflowValidationResult } from '@/types/workflow';

export const ExtractWorkflowDetailsInputSchema = z.object({
  request: z.string().describe('Tin nhắn hoặc yêu cầu của người dùng.'),
  preferredWorkflowId: z.string().nullable().optional().describe('ID quy trình đang diễn ra (nếu có).'),
  conversationHistory: z
    .array(
      z.object({
        sender: z.enum(['user', 'ai']),
        text: z.string(),
      })
    )
    .optional()
    .describe('Lịch sử cuộc trò chuyện gần đây.'),
});
export type ExtractWorkflowDetailsInput = z.infer<typeof ExtractWorkflowDetailsInputSchema>;

export const ExtractWorkflowDetailsOutputSchema = z.object({
  workflowId: z.string().nullable().describe('ID của quy trình đã nhận diện, hoặc null nếu chưa xác định được hoặc mơ hồ.'),
  workflowName: z.string().nullable().describe('Tên hiển thị của quy trình, hoặc null.'),
  workflowDescription: z.string().nullable().describe('Mô tả quy trình, hoặc null.'),
  isConfident: z.boolean().describe('True nếu nhận diện được quy trình một cách tự tin, false nếu mơ hồ hoặc không xác định được.'),
  clarificationMessage: z.string().nullable().describe('Tin nhắn làm rõ nếu chưa xác định được quy trình hoặc yêu cầu mơ hồ.'),
  extractedDetails: z.record(z.union([z.string(), z.number()])).describe('Các trường đã trích xuất.'),
  validation: z
    .object({
      isValid: z.boolean(),
      errors: z.array(z.string()),
      missingFields: z.array(z.string()),
      validatedData: z.record(z.union([z.string(), z.number()])),
    })
    .nullable(),
  missingFieldsDisplayNames: z.array(z.string()).describe('Tên hiển thị của các trường bắt buộc còn thiếu.'),
});
export type ExtractWorkflowDetailsOutput = z.infer<typeof ExtractWorkflowDetailsOutputSchema>;

function parseJsonFromText(text: string): Record<string, any> | null {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('Failed to parse JSON from AI response:', err);
    return null;
  }
}

export async function extractWorkflowDetails(
  input: ExtractWorkflowDetailsInput
): Promise<ExtractWorkflowDetailsOutput> {
  return extractWorkflowDetailsFlow(input);
}

export const extractWorkflowDetailsFlow = ai.defineFlow(
  {
    name: 'extractWorkflowDetailsFlow',
    inputSchema: ExtractWorkflowDetailsInputSchema,
    outputSchema: ExtractWorkflowDetailsOutputSchema,
  },
  async (input) => {
    const workflows = await getWorkflows();

    const workflowsContext = workflows
      .map((w) => {
        const fieldList = w.fields
          .map((f) => {
            const options = resolveFieldOptions(f);
            const optionsStr =
              options && options.length > 0
                ? `, allowedValues=[${options.join(' | ')}]`
                : '';
            const label = f.label || f.displayName || f.name;
            const placeholderStr = f.placeholder ? `, placeholder="${f.placeholder}"` : '';
            return `- ${f.name}: label="${label}", type=${f.type}, required=${f.required}${
              f.description ? `, description="${f.description}"` : ''
            }${placeholderStr}${optionsStr}`;
          })
          .join('\n');
        return `### Workflow ID: "${w.id}"\nTên: "${w.name}"\nMô tả: "${w.description}"\nCác trường cấu hình:\n${fieldList}`;
      })
      .join('\n\n');

    let historyContext = "";
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      historyContext =
        "\nLỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY:\n" +
        input.conversationHistory
          .map(
            (msg) =>
              `${msg.sender === "user" ? "Người dùng" : "Trợ lý AI"}: ${msg.text}`
          )
          .join("\n") +
        "\n";
    }

    const preferredWfNotice = input.preferredWorkflowId
      ? `- Quy trình đang được chọn trước đó là: "${input.preferredWorkflowId}". Nếu người dùng tiếp tục cung cấp thông tin hoặc trả lời cho quy trình này, hãy TIẾP TỤC giữ "identifiedWorkflowId": "${input.preferredWorkflowId}". Nếu người dùng nói rõ ý định đổi sang quy trình khác, hãy nhận diện quy trình mới.`
      : '- Hiện tại CHƯA CÓ quy trình nào được chọn (activeWorkflow = null).';

    const workflowNamesList = workflows.map((w) => w.name).join(', ');

    const promptSections: string[] = [
      'Bạn là một trợ lý AI phân tích ý định và trích xuất thông tin đa quy trình.',
      'Hệ thống hiện hỗ trợ các quy trình với cấu hình trường sau:\n',
      workflowsContext,
      historyContext,
      'YÊU CẦU MỚI NHẤT CỦA NGƯỜI DÙNG:',
      `"""${input.request}"""\n`,
      'HÃY THỰC HIỆN CÁC BƯỚC PHÂN TÍCH SAU:',
      '1. PHÂN TÍCH Ý ĐỊNH VÀ NHẬN DIỆN QUY TRÌNH:',
      '   - Dựa vào yêu cầu của người dùng và lịch sử trò chuyện (nếu có), xác định người dùng muốn thực hiện quy trình nào trong danh sách trên.',
      `   ${preferredWfNotice}`,
      '   - NGUYÊN TẮC QUAN TRỌNG:',
      '     * TỰ TIN (isConfident: true): Khi người dùng thể hiện rõ ý định liên quan đến một quy trình cụ thể (ví dụ: mượn/đặt phòng hội trường -> room_booking; mượn máy chiếu/thiết bị -> equipment_booking; hỗ trợ sự kiện/hội thảo -> event_support).',
      '     * MƠ HỒ / KHÔNG RÕ RÀNG / CHÀO HỎI (isConfident: false, identifiedWorkflowId: null):',
      '       Nếu người dùng chỉ chào hỏi ("xin chào", "hello"), hỏi thông tin chung ("bạn giúp được gì"), hoặc đưa ra yêu cầu mơ hồ có thể thuộc nhiều quy trình ("tôi muốn đăng ký", "tôi muốn mượn đồ"), TUYỆT ĐỐI KHÔNG tự tiện chọn một quy trình mặc định.',
      '       Trong trường hợp này:',
      '       + Đặt "identifiedWorkflowId": null',
      '       + Đặt "isConfident": false',
      `       + Tạo "clarificationMessage" bằng tiếng Việt lịch sự, tự nhiên, giới thiệu ngắn gọn các quy trình hệ thống đang hỗ trợ (${workflowNamesList}) và hỏi xem người dùng muốn thực hiện quy trình nào.`,
      '',
      '2. TRÍCH XUẤT CÁC TRƯỜNG DỮ LIỆU (Chỉ thực hiện khi identifiedWorkflowId khác null):',
      '   - CHỈ TRÍCH XUẤT các trường thuộc quy trình đã nhận diện. TUYỆT ĐỐI KHÔNG trích xuất bất kỳ trường nào không có trong cấu hình của quy trình đó.',
      '   - Quy tắc kiểu dữ liệu:',
      "     * Trường có type='number': Giá trị trích xuất phải là số (number, ví dụ: 20 hoặc 3).",
      "     * Trường có type='text': Giá trị trích xuất là chuỗi văn bản (string).",
      "     * Trường có type='option': BẮT BUỘC chỉ chọn giá trị chính xác từ danh sách allowedValues đã cung cấp. Nếu người dùng dùng cách diễn đạt tương đương hoặc viết tắt, hãy chuẩn hóa về đúng tên trong allowedValues.",
      '     * Nếu người dùng chưa cung cấp thông tin cho trường đó trong tin nhắn, ĐỪNG tự bịa ra thông tin. Hãy bỏ qua trường đó trong extractedFields.',
      '',
      '3. ĐỊNH DẠNG TRẢ VỀ:',
      'Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm văn bản ngoài JSON):',
      '{',
      '  "identifiedWorkflowId": "<id của workflow phù hợp, hoặc null nếu mơ hồ/chưa xác định được>",',
      '  "isConfident": <true hoặc false>,',
      '  "clarificationMessage": "<câu hỏi làm rõ/hướng dẫn nếu identifiedWorkflowId là null, hoặc null nếu đã xác định rõ>",',
      '  "extractedFields": {',
      '    "<tên_trường_1>": <giá trị>,',
      '    "<tên_trường_2>": <giá trị>',
      '  }',
      '}',
    ];

    const promptText = promptSections.join('\n');

    let identifiedWorkflowId: string | null = null;
    let isConfident = false;
    let clarificationMessage: string | null = null;
    let extractedFields: Record<string, any> = {};

    try {
      const response = await ai.generate({
        prompt: promptText,
      });

      const parsed = parseJsonFromText(response.text);
      if (parsed) {
        if (parsed.identifiedWorkflowId && typeof parsed.identifiedWorkflowId === 'string') {
          const found = workflows.find((w) => w.id === parsed.identifiedWorkflowId);
          if (found && parsed.isConfident !== false) {
            identifiedWorkflowId = found.id;
            isConfident = true;
          }
        }
        if (typeof parsed.clarificationMessage === 'string' && parsed.clarificationMessage.trim()) {
          clarificationMessage = parsed.clarificationMessage.trim();
        }
        if (parsed.extractedFields && typeof parsed.extractedFields === 'object' && parsed.extractedFields !== null) {
          extractedFields = parsed.extractedFields;
        }
      }
    } catch (error) {
      console.error('Lỗi khi gọi Gemini để trích xuất quy trình:', error);
      if (input.preferredWorkflowId) {
        identifiedWorkflowId = input.preferredWorkflowId;
        isConfident = true;
      }
    }

    // If no workflow is confidently identified
    if (!identifiedWorkflowId || !isConfident) {
      const defaultClarification =
        workflows.length > 0
          ? `Tôi có thể hỗ trợ bạn các quy trình sau:\n${workflows
              .map((w) => `- **${w.name}**: ${w.description || 'Hỗ trợ xử lý yêu cầu'}`)
              .join('\n')}\n\nBạn muốn thực hiện quy trình nào? Vui lòng mô tả chi tiết yêu cầu của bạn.`
          : 'Tôi có thể hỗ trợ bạn thực hiện các quy trình trong hệ thống. Vui lòng cho tôi biết bạn cần hỗ trợ quy trình nào?';

      return {
        workflowId: null,
        workflowName: null,
        workflowDescription: null,
        isConfident: false,
        clarificationMessage: clarificationMessage || defaultClarification,
        extractedDetails: {},
        validation: null,
        missingFieldsDisplayNames: [],
      };
    }

    const workflowConfig = workflows.find((w) => w.id === identifiedWorkflowId)!;

    // Validate extracted values against field types and required-field rules
    const validation = validateExtractedValues(workflowConfig, extractedFields);

    // Map missing field names to display names
    const missingFieldsDisplayNames = validation.missingFields.map((fieldName) => {
      const field = workflowConfig.fields.find((f) => f.name === fieldName);
      return field ? (field.label || field.displayName) : fieldName;
    });

    return {
      workflowId: workflowConfig.id,
      workflowName: workflowConfig.name,
      workflowDescription: workflowConfig.description,
      isConfident: true,
      clarificationMessage: null,
      extractedDetails: validation.validatedData,
      validation,
      missingFieldsDisplayNames,
    };
  }
);
