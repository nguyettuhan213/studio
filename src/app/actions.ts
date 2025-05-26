// src/app/actions.ts
'use server';
import {z} from 'genkit';
import {
  extractBookingDetails,
  type ExtractBookingDetailsInput,
  type ExtractBookingDetailsOutput,
} from '@/ai/flows/extract-booking-details';
import {
  handleMissingDetails,
  type HandleMissingDetailsInput,
  type HandleMissingDetailsOutput,
} from '@/ai/flows/handle-missing-details';
import {
  assessRequestValidity,
  type AssessRequestValidityInput,
  type AssessRequestValidityOutput,
} from '@/ai/flows/assess-request-validity';
import { saveBookingDetailsToFirestore } from '@/services/booking-service'; // Added import

// Re-export AI types for client-side usage if needed, or define specific types for actions
export type { ExtractBookingDetailsOutput as ParsedBookingDetails };
export type { HandleMissingDetailsOutput as MissingDetailsResponse };
export type { AssessRequestValidityOutput as ValidityResponse };

type ParsedBookingDetails = ExtractBookingDetailsOutput;
type MissingDetailsResponse = HandleMissingDetailsOutput;
type ValidityResponse = AssessRequestValidityOutput;

export async function getInitialBotMessage(): Promise<string> {
    return "Xin chào! Tôi là trợ lý đặt phòng AI của bạn. Tôi có thể giúp bạn tìm và đặt phòng như thế nào hôm nay? Vui lòng mô tả những gì bạn đang tìm kiếm.";
}

export async function processUserMessage(
  userInput: string,
  currentAccumulatedDetails: Partial<ExtractBookingDetailsOutput>
): Promise<{
  updatedDetails: ParsedBookingDetails; // Use the exported type alias
  missingDetailsResponse: MissingDetailsResponse;
  aiMessage: string;
  error?: string;
}> {
  try {
    const extractionInput: ExtractBookingDetailsInput = { request: userInput };
    const newlyExtracted = await extractBookingDetails(extractionInput);

    const updatedDetails: ParsedBookingDetails = { ...currentAccumulatedDetails } as ParsedBookingDetails;
    // Merge details: prioritize newly extracted non-empty values
    for (const key in newlyExtracted) {
      const typedKey = key as keyof ParsedBookingDetails;
      const newValue = newlyExtracted[typedKey];
      if (newValue !== null && newValue !== undefined && (typeof newValue !== 'string' || newValue !== "")) {
        (updatedDetails[typedKey] as any) = newValue;
      } else if (!(typedKey in updatedDetails) || updatedDetails[typedKey] === null || updatedDetails[typedKey] === undefined) {
        (updatedDetails[typedKey] as any) = newValue; // Keep new (even if empty) if old was not set
      }
    }
    
    // Ensure all fields defined in ParsedBookingDetails (ExtractBookingDetailsOutput) are present,
    // even if they are empty strings or default values from the AI.
    const defaultsFromSchema = z.object({
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
    }).parse(newlyExtracted); // Get defaults if schema defines them
    Object.keys(defaultsFromSchema).forEach(key => {
      const typedKey = key as keyof ParsedBookingDetails;
      if (updatedDetails[typedKey] === undefined) {
        (updatedDetails[typedKey] as any) = defaultsFromSchema[typedKey];
      }
    });


    const missingDetailsInput = updatedDetails as HandleMissingDetailsInput; // Assuming structure matches
    const missingDetailsResponse = await handleMissingDetails(missingDetailsInput);

    let aiMessage = "Cảm ơn bạn đã cung cấp thông tin. ";
    if (!missingDetailsResponse.isComplete && missingDetailsResponse.followUpQuestions.length > 0) {
      aiMessage += `Tôi vẫn cần thêm một chút thông tin: ${missingDetailsResponse.followUpQuestions.join(' ')}`;
    } else if (missingDetailsResponse.isComplete) {
      aiMessage += "Tôi nghĩ rằng tôi đã có đầy đủ các chi tiết. Vui lòng xem lại chúng dưới đây và xác nhận nếu mọi thứ đều chính xác.";
    } else {
        aiMessage += "Tôi có thể giúp gì khác cho bạn liên quan đến việc đặt phòng này không?";
    }

    return { updatedDetails, missingDetailsResponse, aiMessage };

  } catch (e: any) {
    console.error("Error processing user message:", e);
    const errorMessage = e.message || "Xin lỗi, tôi đã gặp lỗi. Bạn có thể thử diễn đạt lại hoặc cung cấp lại thông tin chi tiết không?";
    return {
      updatedDetails: currentAccumulatedDetails as ParsedBookingDetails,
      missingDetailsResponse: { missingDetails: [], followUpQuestions: [errorMessage], isComplete: false },
      aiMessage: errorMessage,
      error: errorMessage,
    };
  }
}

export async function submitBookingRequest(
  finalDetails: ParsedBookingDetails
): Promise<{
  validityResponse: ValidityResponse;
  aiMessage: string;
  bookingId?: string; // Optional: return bookingId on success
  error?: string;
}> {
  try {
    const validityInput = finalDetails as AssessRequestValidityInput; 
    const validityResponse = await assessRequestValidity(validityInput);

    let aiMessage = "";
    let bookingId: string | undefined = undefined;

    if (validityResponse.isValid) {
      try {
        bookingId = await saveBookingDetailsToFirestore(finalDetails);
        aiMessage = `Tuyệt vời! Yêu cầu đặt phòng của bạn (ID: ${bookingId}) đã được lưu thành công và đang chờ xác nhận. Bạn sẽ sớm nhận được email.`;
      } catch (saveError: any) {
        console.error("Error saving booking to Firestore:", saveError);
        validityResponse.isValid = false;
        validityResponse.errors = validityResponse.errors || [];
        validityResponse.errors.push("Không thể lưu chi tiết đặt phòng của bạn. Vui lòng thử lại.");
        aiMessage = `Đã có sự cố khi lưu đặt phòng của bạn: ${saveError.message || 'Vui lòng thử lại.'}`;
        return { validityResponse, aiMessage, error: saveError.message || "Không thể lưu đặt phòng." };
      }
    } else {
      aiMessage = `Có một số vấn đề với yêu cầu của bạn: ${validityResponse.errors.join('. ')}. Vui lòng sửa chúng và thử lại.`;
    }

    return { validityResponse, aiMessage, bookingId };
  } catch (e: any) {
    console.error("Error submitting booking request:", e);
    const errorMessage = e.message || "Xin lỗi, đã xảy ra lỗi khi gửi yêu cầu của bạn. Vui lòng thử lại sau.";
    return {
      validityResponse: { isValid: false, errors: [errorMessage] },
      aiMessage: errorMessage,
      error: errorMessage,
    };
  }
}

