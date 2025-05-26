// 'use server'
'use server';

/**
 * @fileOverview Trích xuất chi tiết đặt phòng từ đầu vào ngôn ngữ tự nhiên bằng AI.
 *
 * - extractBookingDetails - Một hàm trích xuất chi tiết đặt phòng từ đầu vào ngôn ngữ tự nhiên.
 * - ExtractBookingDetailsInput - Kiểu đầu vào cho hàm extractBookingDetails.
 * - ExtractBookingDetailsOutput - Kiểu trả về cho hàm extractBookingDetails.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractBookingDetailsInputSchema = z.object({
  request: z.string().describe('Yêu cầu đặt phòng bằng ngôn ngữ tự nhiên.'),
});
export type ExtractBookingDetailsInput = z.infer<typeof ExtractBookingDetailsInputSchema>;

const ExtractBookingDetailsOutputSchema = z.object({
  room: z.string().describe('Phòng được yêu cầu đặt.'),
  date: z.string().describe('Ngày đặt phòng, ưu tiên định dạng ISO 8601 (ví dụ: 2025-04-01).'),
  time: z.string().describe('Khoảng thời gian đặt phòng dưới dạng chuỗi dễ đọc (ví dụ: 10:30 SA - 12:30 CH GMT+7).'),
  purpose: z.string().describe('Mục đích của việc đặt phòng (ví dụ: Hội thảo AI hàng tuần).'),
  estimated_number_of_attendees: z.number().describe('Số lượng người tham dự dự kiến.'),
  special_requirements: z.string().describe('Bất kỳ yêu cầu đặc biệt nào cho việc đặt phòng (ví dụ: Máy chiếu, bảng trắng, và quyền truy cập vào ổ cắm điện).'),
  target_email: z.string().describe('Email người nhận để xác nhận hoặc xử lý yêu cầu.'),
  cc_email: z.string().optional().describe('Địa chỉ email CC tùy chọn cho xác nhận đặt phòng.'),
  requestorMail: z.string().describe('Email của người yêu cầu.'),
  requestorMSSV: z.string().describe('Mã số sinh viên (MSSV) của người yêu cầu.'),
  requestorRole: z.string().describe('Vai trò của người yêu cầu trong câu lạc bộ hoặc tổ chức của họ (ví dụ: Trưởng ban).'),
  requestorDept: z.string().describe('Khoa hoặc phòng ban của người yêu cầu (ví dụ: Khoa Khoa học).'),
  CLB: z.string().describe('Tên câu lạc bộ hoặc tổ chức (CLB) thực hiện yêu cầu (ví dụ: Edtech).'),
  requestorName: z.string().describe('Họ tên đầy đủ của người yêu cầu.'),
});
export type ExtractBookingDetailsOutput = z.infer<typeof ExtractBookingDetailsOutputSchema>;

export async function extractBookingDetails(input: ExtractBookingDetailsInput): Promise<ExtractBookingDetailsOutput> {
  return extractBookingDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBookingDetailsPrompt',
  input: { schema: ExtractBookingDetailsInputSchema },
  output: { schema: ExtractBookingDetailsOutputSchema },
  prompt: `Bạn là một trợ lý đặt phòng. Vui lòng trích xuất các thông tin sau từ yêu cầu của người dùng:

  - room: Phòng được yêu cầu đặt.
  - date: Ngày đặt phòng, ưu tiên định dạng ISO 8601 (ví dụ: 2025-04-01).
  - time: Khoảng thời gian đặt phòng dưới dạng chuỗi dễ đọc (ví dụ: 10:30 SA - 12:30 CH GMT+7).
  - purpose: Mục đích của việc đặt phòng (ví dụ: Hội thảo AI hàng tuần).
  - estimated_number_of_attendees: Số lượng người tham dự dự kiến.
  - special_requirements: Bất kỳ yêu cầu đặc biệt nào cho việc đặt phòng (ví dụ: Máy chiếu, bảng trắng, và quyền truy cập vào ổ cắm điện).
  - target_email: Email người nhận để xác nhận hoặc xử lý yêu cầu.
  - cc_email: Địa chỉ email CC tùy chọn cho xác nhận đặt phòng.
  - requestorMail: Email của người yêu cầu.
  - requestorMSSV: Mã số sinh viên (MSSV) của người yêu cầu.
  - requestorRole: Vai trò của người yêu cầu trong câu lạc bộ hoặc tổ chức của họ (ví dụ: Trưởng ban).
  - requestorDept: Khoa hoặc phòng ban của người yêu cầu (ví dụ: Khoa Khoa học).
  - CLB: Tên câu lạc bộ hoặc tổ chức (CLB) thực hiện yêu cầu (ví dụ: Edtech).
  - requestorName: Họ tên đầy đủ của người yêu cầu.

  Yêu cầu: {{{request}}}

  Vui lòng cung cấp thông tin đã trích xuất ở định dạng JSON.
  Nếu thiếu bất kỳ thông tin nào, hãy đưa ra một phỏng đoán hợp lý hoặc để trống trường đó nếu phỏng đoán không phù hợp. Đối với các trường tùy chọn như cc_email, hãy để trống nếu không được cung cấp. Đối với các trường số như estimated_number_of_attendees, nếu không được chỉ định, bạn có thể sử dụng giá trị mặc định hợp lý như 1 hoặc 0 nếu phù hợp với ngữ cảnh, hoặc yêu cầu làm rõ nếu thông tin đó quan trọng.
`,
});

const extractBookingDetailsFlow = ai.defineFlow(
  {
    name: 'extractBookingDetailsFlow',
    inputSchema: ExtractBookingDetailsInputSchema,
    outputSchema: ExtractBookingDetailsOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

