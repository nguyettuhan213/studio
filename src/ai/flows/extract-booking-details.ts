// 'use server'
'use server';

/**
 * @fileOverview Extracts booking details from natural language input using AI.
 *
 * - extractBookingDetails - A function that extracts booking details from natural language input.
 * - ExtractBookingDetailsInput - The input type for the extractBookingDetails function.
 * - ExtractBookingDetailsOutput - The return type for the extractBookingDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractBookingDetailsInputSchema = z.object({
  request: z.string().describe('The room booking request in natural language.'),
});
export type ExtractBookingDetailsInput = z.infer<typeof ExtractBookingDetailsInputSchema>;

const ExtractBookingDetailsOutputSchema = z.object({
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
});
export type ExtractBookingDetailsOutput = z.infer<typeof ExtractBookingDetailsOutputSchema>;

export async function extractBookingDetails(input: ExtractBookingDetailsInput): Promise<ExtractBookingDetailsOutput> {
  return extractBookingDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBookingDetailsPrompt',
  input: { schema: ExtractBookingDetailsInputSchema },
  output: { schema: ExtractBookingDetailsOutputSchema },
  prompt: `You are a room booking assistant. Please extract the following information from the user's request:

  - room: The room requested for booking.
  - date: The date for the booking, preferably in ISO 8601 format (e.g., 2025-04-01).
  - time: The time range for the booking as a human-readable string (e.g., 10:30 AM - 12:30 PM GMT+7).
  - purpose: The purpose of the booking (e.g., Weekly AI workshop).
  - estimated_number_of_attendees: The estimated number of attendees.
  - special_requirements: Any special requirements for the booking (e.g., Projector, whiteboard, and access to power outlets).
  - target_email: Recipient email for request confirmation or processing.
  - cc_email: Optional CC email address for the booking confirmation.
  - requestorMail: The email of the person requesting.
  - requestorMSSV: The student ID (MSSV) of the person requesting.
  - requestorRole: The role of the person requesting in their club or organization (e.g., Chưởng ban).
  - requestorDept: The department or faculty of the person requesting (e.g., Khoa Khoa học).
  - CLB: The club or organization name (CLB) making the request (e.g., Edtech).
  - requestorName: The full name of the person requesting.

  Request: {{{request}}}

  Please provide the extracted information in JSON format.
  If any information is missing, make a reasonable guess or leave the field empty if a guess is not appropriate. For optional fields like cc_email, leave them empty if not provided. For numerical fields like estimated_number_of_attendees, if not specified, you can use a sensible default like 1 or 0 if appropriate for the context, or ask for clarification if critical.
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

