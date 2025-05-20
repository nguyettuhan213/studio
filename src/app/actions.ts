// src/app/actions.ts
'use server';

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

// Re-export AI types for client-side usage if needed, or define specific types for actions
export type { ExtractBookingDetailsOutput as ParsedBookingDetails };
export type { HandleMissingDetailsOutput as MissingDetailsResponse };
export type { AssessRequestValidityOutput as ValidityResponse };


export async function getInitialBotMessage(): Promise<string> {
    // You can customize this initial message
    return "Hello! I'm your room booking assistant. How can I help you find and book a room today? Please describe what you're looking for.";
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
    // Zod default() in schema or AI prompt should handle this.
    const defaultsFromSchema = ExtractBookingDetailsOutput.parse({}); // Get defaults if schema defines them
    Object.keys(defaultsFromSchema).forEach(key => {
      const typedKey = key as keyof ParsedBookingDetails;
      if (updatedDetails[typedKey] === undefined) {
        (updatedDetails[typedKey] as any) = defaultsFromSchema[typedKey];
      }
    });


    const missingDetailsInput = updatedDetails as HandleMissingDetailsInput; // Assuming structure matches
    const missingDetailsResponse = await handleMissingDetails(missingDetailsInput);

    let aiMessage = "Thanks for the information. ";
    if (!missingDetailsResponse.isComplete && missingDetailsResponse.followUpQuestions.length > 0) {
      aiMessage += `I still need a bit more information: ${missingDetailsResponse.followUpQuestions.join(' ')}`;
    } else if (missingDetailsResponse.isComplete) {
      aiMessage += "I think I have all the details. Please review them below and confirm if everything looks correct.";
    } else {
        aiMessage += "Is there anything else I can help you with regarding this booking?";
    }

    return { updatedDetails, missingDetailsResponse, aiMessage };

  } catch (e: any) {
    console.error("Error processing user message:", e);
    const errorMessage = e.message || "Sorry, I encountered an error. Could you try rephrasing or providing the details again?";
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
  error?: string;
}> {
  try {
    const validityInput = finalDetails as AssessRequestValidityInput; 
    const validityResponse = await assessRequestValidity(validityInput);

    let aiMessage = "";
    if (validityResponse.isValid) {
      aiMessage = "Great! Your booking request has been submitted successfully. You should receive a confirmation via email shortly.";
      // TODO: Implement actual submission logic (e.g., send email, log to DB)
    } else {
      aiMessage = `There are some issues with your request: ${validityResponse.errors.join('. ')}. Please correct them and try again.`;
    }

    return { validityResponse, aiMessage };
  } catch (e: any) {
    console.error("Error submitting booking request:", e);
    const errorMessage = e.message || "Sorry, an error occurred while submitting your request. Please try again later.";
    return {
      validityResponse: { isValid: false, errors: [errorMessage] },
      aiMessage: errorMessage,
      error: errorMessage,
    };
  }
}
