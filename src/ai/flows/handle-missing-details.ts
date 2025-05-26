// use server'
'use server';
/**
 * @fileOverview Tệp này xác định một luồng Genkit để xử lý các chi tiết còn thiếu trong yêu cầu đặt phòng.
 *
 * - handleMissingDetails - Một hàm điều phối quá trình xác định và yêu cầu thông tin còn thiếu.
 * - HandleMissingDetailsInput - Kiểu đầu vào cho hàm handleMissingDetails.
 * - HandleMissingDetailsOutput - Kiểu trả về cho hàm handleMissingDetails.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HandleMissingDetailsInputSchema = z.object({
  room: z.string().optional().describe('Phòng được yêu cầu đặt.'),
  date: z.string().optional().describe('Ngày đặt phòng (ví dụ: 01 tháng 4, 2025).'),
  time: z.string().optional().describe('Khung giờ đặt phòng (ví dụ: 10:30 SA - 12:30 CH (GMT+7)).'),
  purpose: z.string().optional().describe('Mục đích của việc đặt phòng (ví dụ: Hội thảo AI hàng tuần).'),
  estimated_number_of_attendees: z
    .number()
    .optional()
    .describe('Số lượng người tham dự dự kiến (ví dụ: 20).'),
  special_requirements: z
    .string()
    .optional()
    .describe('Bất kỳ yêu cầu đặc biệt nào cho việc đặt phòng (ví dụ: Máy chiếu, bảng trắng).'),
  target_email: z
    .string()
    .optional()
    .describe('Địa chỉ email người nhận để xác nhận đặt phòng.'),
  cc_email: z.string().optional().describe('Địa chỉ email CC để xác nhận đặt phòng.'),
  requestorMail: z.string().describe('Địa chỉ email của người yêu cầu.'),
  requestorMSSV: z.string().describe('Mã số sinh viên của người yêu cầu.'),
  requestorRole: z.string().describe('Vai trò của người yêu cầu (ví dụ: Trưởng ban).'),
  requestorDept: z.string().describe('Khoa của người yêu cầu (ví dụ: Khoa Khoa học).'),
  CLB: z.string().describe('Câu lạc bộ hoặc tổ chức thực hiện yêu cầu (ví dụ: Edtech).'),
  requestorName: z.string().describe('Tên của người yêu cầu.'),
});

export type HandleMissingDetailsInput = z.infer<typeof HandleMissingDetailsInputSchema>;

const HandleMissingDetailsOutputSchema = z.object({
  missingDetails: z.array(z.string()).describe('Một mảng các chi tiết còn thiếu trong yêu cầu đặt phòng.'),
  followUpQuestions: z
    .array(z.string())
    .describe('Một mảng các câu hỏi nối tiếp để hỏi người dùng nhằm thu thập các chi tiết còn thiếu (bằng tiếng Việt).'),
  isComplete: z.boolean().describe('Liệu tất cả các chi tiết cần thiết đã có mặt hay chưa.'),
});

export type HandleMissingDetailsOutput = z.infer<typeof HandleMissingDetailsOutputSchema>;

export async function handleMissingDetails(input: HandleMissingDetailsInput): Promise<HandleMissingDetailsOutput> {
  return handleMissingDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'handleMissingDetailsPrompt',
  input: {schema: HandleMissingDetailsInputSchema},
  output: {schema: HandleMissingDetailsOutputSchema},
  prompt: `Bạn là một trợ lý hữu ích giúp xác định thông tin còn thiếu từ yêu cầu đặt phòng và xây dựng các câu hỏi nối tiếp để thu thập các chi tiết còn thiếu bằng tiếng Việt.

  Đây là thông tin yêu cầu đặt phòng bạn có cho đến nay:
  Phòng: {{{room}}}
  Ngày: {{{date}}}
  Thời gian: {{{time}}}
  Mục đích: {{{purpose}}}
  Số người tham dự: {{{estimated_number_of_attendees}}}
  Yêu cầu đặc biệt: {{{special_requirements}}}
  Email đích: {{{target_email}}}
  Email CC: {{{cc_email}}}
  Email người yêu cầu: {{{requestorMail}}}
  MSSV người yêu cầu: {{{requestorMSSV}}}
  Vai trò người yêu cầu: {{{requestorRole}}}
  Khoa người yêu cầu: {{{requestorDept}}}
  Câu lạc bộ: {{{CLB}}}
  Tên người yêu cầu: {{{requestorName}}}

  1.  Xác định những chi tiết nào sau đây còn thiếu: phòng, ngày, thời gian, mục đích, số người tham dự dự kiến, yêu cầu đặc biệt, email đích.
  2.  Xây dựng một danh sách các câu hỏi nối tiếp bằng tiếng Việt để hỏi người dùng nhằm thu thập các chi tiết còn thiếu. Mỗi câu hỏi phải rõ ràng và cụ thể.
  3.  Nếu không có chi tiết nào còn thiếu, thì isComplete phải là true. Ngược lại, isComplete phải là false.

  Trả về các chi tiết còn thiếu và các câu hỏi nối tiếp theo định dạng được chỉ định bởi schema đầu ra.`,
});

const handleMissingDetailsFlow = ai.defineFlow(
  {
    name: 'handleMissingDetailsFlow',
    inputSchema: HandleMissingDetailsInputSchema,
    outputSchema: HandleMissingDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
