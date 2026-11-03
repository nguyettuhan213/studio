// src/app/actions.ts
"use server";
import { z } from "genkit";
import {
  extractBookingDetails,
  type ExtractBookingDetailsInput,
  type ExtractBookingDetailsOutput,
} from "@/ai/flows/extract-booking-details";
import {
  extractWorkflowDetails,
  type ExtractWorkflowDetailsOutput,
} from "@/ai/flows/extract-workflow-details";
import {
  handleMissingDetails,
  type HandleMissingDetailsInput,
  type HandleMissingDetailsOutput,
} from "@/ai/flows/handle-missing-details";
import {
  assessRequestValidity,
  type AssessRequestValidityInput,
  type AssessRequestValidityOutput,
} from "@/ai/flows/assess-request-validity";
import {
  saveBookingDetailsToFirestore,
  saveWorkflowDetailsToFirestore,
} from "@/services/booking-service";
import {
  getWorkflows,
  getWorkflowById,
  validateExtractedValues,
} from "@/services/workflow-service";
import type { WorkflowConfig, WorkflowValidationResult } from "@/types/workflow";

// Re-export AI types for client-side usage
export type ParsedBookingDetails = Record<string, any>;
export type MissingDetailsResponse = HandleMissingDetailsOutput;
export type ValidityResponse = AssessRequestValidityOutput;

export async function getInitialBotMessage(): Promise<string> {
  return "Xin chào! Tôi là trợ lý AI. Tôi có thể hỗ trợ bạn thực hiện các thủ tục và quy trình trong hệ thống. Vui lòng mô tả yêu cầu của bạn bằng ngôn ngữ tự nhiên để bắt đầu.";
}

export async function processUserMessage(
  userInput: string,
  currentAccumulatedDetails: Record<string, any> = {},
  currentWorkflowId?: string | null,
  conversationHistory?: Array<{ sender: "user" | "ai"; text: string }>
): Promise<{
  updatedDetails: Record<string, any>;
  workflowId: string | null;
  workflowName: string | null;
  isWorkflowIdentified: boolean;
  missingDetailsResponse?: MissingDetailsResponse;
  aiMessage: string;
  validation?: WorkflowValidationResult | null;
  error?: string;
}> {
  try {
    // 1. Dynamic multi-workflow extraction using Gemini API
    const extractionResult = await extractWorkflowDetails({
      request: userInput,
      preferredWorkflowId: currentWorkflowId || undefined,
      conversationHistory,
    });

    // If intent is ambiguous or workflow cannot be identified
    if (!extractionResult.workflowId || !extractionResult.isConfident) {
      return {
        updatedDetails: {},
        workflowId: null,
        workflowName: null,
        isWorkflowIdentified: false,
        aiMessage:
          extractionResult.clarificationMessage ||
          "Xin lỗi, tôi chưa rõ bạn muốn thực hiện quy trình nào. Vui lòng mô tả rõ hơn yêu cầu của bạn.",
        validation: null,
      };
    }

    const workflow = await getWorkflowById(extractionResult.workflowId);
    if (!workflow) {
      return {
        updatedDetails: {},
        workflowId: null,
        workflowName: null,
        isWorkflowIdentified: false,
        aiMessage:
          "Xin lỗi, quy trình bạn yêu cầu hiện không có trong hệ thống. Vui lòng chọn một quy trình khác.",
        validation: null,
      };
    }

    // 2. Merge details: if switching workflows, start fresh with new workflow fields; otherwise merge
    const isSameWorkflow =
      Boolean(currentWorkflowId) && currentWorkflowId === workflow.id;
    const baseDetails = isSameWorkflow ? { ...currentAccumulatedDetails } : {};

    const updatedDetails: Record<string, any> = { ...baseDetails };

    // Update with newly extracted non-empty values
    for (const field of workflow.fields) {
      const newVal = extractionResult.extractedDetails[field.name];
      if (newVal !== undefined && newVal !== null && newVal !== "") {
        updatedDetails[field.name] = newVal;
      }
    }

    // 3. Validate extracted values against field types and required-field rules
    const validation = validateExtractedValues(workflow, updatedDetails);

    // 4. Format missing fields & follow-up messages
    const missingFieldDisplayNames = validation.missingFields.map((fName) => {
      const f = workflow.fields.find((fld) => fld.name === fName);
      return f ? (f.label || f.displayName) : fName;
    });

    const missingDetailsResponse: MissingDetailsResponse = {
      missingDetails: validation.missingFields,
      followUpQuestions:
        validation.missingFields.length > 0
          ? [
              `Vui lòng cung cấp thêm thông tin: ${missingFieldDisplayNames.join(
                ", "
              )}.`,
            ]
          : [],
      isComplete: validation.isValid,
    };

    let aiMessage = "";
    const isFirstIdentification = !currentWorkflowId || currentWorkflowId !== workflow.id;
    const prefix = isFirstIdentification
      ? `Tôi đã nhận diện bạn muốn thực hiện quy trình [${workflow.name}]. `
      : "";

    if (!validation.isValid && validation.missingFields.length > 0) {
      aiMessage = `${prefix}Để hoàn tất quy trình [${workflow.name}], tôi vẫn cần thêm các thông tin: ${missingFieldDisplayNames.join(
        ", "
      )}. Bạn có thể trả lời trực tiếp hoặc điền vào biểu mẫu bên cạnh.`;
    } else if (validation.isValid) {
      aiMessage = `${prefix}Tuyệt vời! Tôi đã nhận đầy đủ các thông tin cần thiết cho quy trình [${workflow.name}]. Vui lòng xem lại biểu mẫu bên cạnh và nhấn Xác nhận để gửi yêu cầu.`;
    } else {
      aiMessage = `${prefix}Tôi đã ghi nhận thông tin cho quy trình [${workflow.name}].`;
    }

    // Append type error warnings if any
    const typeErrors = validation.errors.filter(
      (err) => !err.includes("là bắt buộc")
    );
    if (typeErrors.length > 0) {
      aiMessage += ` (Lưu ý kiểm tra lại: ${typeErrors.join("; ")})`;
    }

    return {
      updatedDetails,
      workflowId: workflow.id,
      workflowName: workflow.name,
      isWorkflowIdentified: true,
      missingDetailsResponse,
      aiMessage,
      validation,
    };
  } catch (e: any) {
    console.error("Error processing user message:", e);
    const errorMessage =
      e.message ||
      "Xin lỗi, tôi đã gặp lỗi khi xử lý tin nhắn. Bạn có thể thử diễn đạt lại không?";
    return {
      updatedDetails: currentWorkflowId ? currentAccumulatedDetails : {},
      workflowId: currentWorkflowId || null,
      workflowName: null,
      isWorkflowIdentified: Boolean(currentWorkflowId),
      aiMessage: errorMessage,
      validation: null,
      error: errorMessage,
    };
  }
}

const startFlowN8N = async (finalDetails: Record<string, any>) => {
  const varFlowN8NURL =
    "https://loudly-good-ghost.ngrok-free.app/webhook/888f6aa2-c9a9-44ac-ab30-bbf11a76de59";
  const varQuery = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(finalDetails),
  };
  try {
    const response = await fetch(varFlowN8NURL, varQuery);
    const response_json = await response.json();
    return { ok: response.ok, response_json };
  } catch (error) {
    console.error("Failed to post entity ID:", error);
    return false;
  }
};

export async function submitWorkflowRequest(
  workflowId: string,
  finalDetails: Record<string, any>
): Promise<{
  validityResponse: ValidityResponse;
  aiMessage: string;
  requestId?: string;
  error?: string;
}> {
  try {
    if (!workflowId) {
      return {
        validityResponse: {
          isValid: false,
          errors: ["Chưa xác định quy trình cần gửi yêu cầu."],
        },
        aiMessage: "Lỗi: Chưa xác định quy trình hợp lệ.",
        error: "Missing workflow ID",
      };
    }

    const workflow = await getWorkflowById(workflowId);
    if (!workflow) {
      return {
        validityResponse: {
          isValid: false,
          errors: [`Không tìm thấy quy trình với mã: ${workflowId}`],
        },
        aiMessage: `Lỗi: Không tìm thấy quy trình "${workflowId}".`,
        error: "Workflow not found",
      };
    }
    const validation = validateExtractedValues(workflow, finalDetails);

    if (!validation.isValid) {
      return {
        validityResponse: {
          isValid: false,
          errors: validation.errors,
        },
        aiMessage: `Có một số thông tin chưa hợp lệ: ${validation.errors.join(
          "; "
        )}. Vui lòng bổ sung hoặc chỉnh sửa.`,
      };
    }

    let requestId: string | undefined = undefined;
    try {
      // Save details to Firestore dynamically
      requestId = await saveWorkflowDetailsToFirestore(workflow.id, {
        ...finalDetails,
        workflowName: workflow.name,
      });

      await startFlowN8N({ ...finalDetails, workflowId: workflow.id, requestId });

      const aiMessage = `Tuyệt vời! Yêu cầu [${workflow.name}] của bạn (Mã: ${requestId}) đã được lưu thành công và đang chờ xử lý.`;
      return {
        validityResponse: { isValid: true, errors: [] },
        aiMessage,
        requestId,
      };
    } catch (saveError: any) {
      console.error("Error saving workflow request:", saveError);
      return {
        validityResponse: {
          isValid: false,
          errors: [saveError.message || "Không thể lưu dữ liệu."],
        },
        aiMessage: `Đã có sự cố khi lưu yêu cầu: ${
          saveError.message || "Vui lòng thử lại sau."
        }`,
        error: saveError.message,
      };
    }
  } catch (e: any) {
    console.error("Error submitting workflow request:", e);
    const errorMessage =
      e.message || "Xin lỗi, đã xảy ra lỗi khi gửi yêu cầu của bạn.";
    return {
      validityResponse: { isValid: false, errors: [errorMessage] },
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
  bookingId?: string;
  error?: string;
}> {
  const result = await submitWorkflowRequest("room_booking", finalDetails);
  return {
    validityResponse: result.validityResponse,
    aiMessage: result.aiMessage,
    bookingId: result.requestId,
    error: result.error,
  };
}
