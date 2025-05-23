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
    const defaultsFromSchema = z.object({
      room: z.string().describe('The room requested for booking.'),
      date: z.string().describe('The date for the booking, preferably in ISO 8601 format (e.g., 2025-04-01).'),
      time: z.string().describe('The time range for the booking as a human-readable string (e.g., 10:30 AM - 12:30 PM GMT+7).'),
      purpose: z.string().describe('The purpose of the booking (e.g., Weekly AI workshop).'),
      estimated_number_of_attendees: z.number().describe('The estimated number of attendees.'),
      special_requirements: z.string().describe('Any special requirements for the booking (e.g., Projector, whiteboard, and access to power outlets).'),
      target_email: z.string().describe('Recipient email for request confirmation or processing.'),
      cc_email: z.string().optional().describe('Optional CC email address for the booking confirmation.'),
      requestorMail: z.string().describe('The email of the person requesting.'),
      requestorMSSV: z.string().describe('The student ID (MSSV) of the person requesting.'),
      requestorRole: z.string().describe('The role of the person requesting in their club or organization (e.g., Chưởng ban).'),
      requestorDept: z.string().describe('The department or faculty of the person requesting (e.g., Khoa Khoa học).'),
      CLB: z.string().describe('The club or organization name (CLB) making the request (e.g., Edtech).'),
      requestorName: z.string().describe('The full name of the person requesting.'),
 }).parse(newlyExtracted); // Get defaults if schema defines them
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
        aiMessage = `Great! Your booking request (ID: ${bookingId}) has been saved successfully and is pending confirmation. You should receive an email shortly.`;
        // TODO: Implement actual submission logic (e.g., send email, log to DB)
      } catch (saveError: any) {
        console.error("Error saving booking to Firestore:", saveError);
        // Update validityResponse to reflect the save error, as the overall operation failed.
        validityResponse.isValid = false;
        validityResponse.errors = validityResponse.errors || [];
        validityResponse.errors.push("Failed to save your booking details. Please try again.");
        aiMessage = `There was an issue saving your booking: ${saveError.message || 'Please try again.'}`;
        return { validityResponse, aiMessage, error: saveError.message || "Failed to save booking." };
      }
    } else {
      aiMessage = `There are some issues with your request: ${validityResponse.errors.join('. ')}. Please correct them and try again.`;
    }

    return { validityResponse, aiMessage, bookingId };
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

