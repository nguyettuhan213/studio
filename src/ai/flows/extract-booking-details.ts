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
  date: z.string().describe('The date for the booking (e.g., April 1, 2025).'),
  time: z.string().describe('The time slot for the booking (e.g., 10:30 AM - 12:30 PM (GMT+7)).'),
  purpose: z.string().describe('The purpose of the booking (e.g., Weekly AI workshop).'),
  estimated_number_of_attendees: z.number().describe('The estimated number of attendees.'),
  special_requirements: z.string().describe('Any special requirements for the booking (e.g., Projector, whiteboard, and access to power outlets).'),
  target_email: z.string().email().describe('The target email to which the booking confirmation will be sent.'),
  cc_email: z.string().email().optional().describe('The CC email address for the booking confirmation.'),
  requestorMail: z.string().email().describe('The email of the person requesting.'),
  requestorMSSV: z.string().describe('The MSSV of the person requesting.'),
  requestorRole: z.string().describe('The role of the person requesting.'),
  requestorDept: z.string().describe('The department of the person requesting.'),
  CLB: z.string().describe('The CLB of the person requesting.'),
  requestorName: z.string().describe('The name of the person requesting.'),
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
  - date: The date for the booking (e.g., April 1, 2025).
  - time: The time slot for the booking (e.g., 10:30 AM - 12:30 PM (GMT+7)).
  - purpose: The purpose of the booking (e.g., Weekly AI workshop).
  - estimated_number_of_attendees: The estimated number of attendees.
  - special_requirements: Any special requirements for the booking (e.g., Projector, whiteboard, and access to power outlets).
  - target_email: The target email to which the booking confirmation will be sent.
  - cc_email: The CC email address for the booking confirmation.
  - requestorMail: The email of the person requesting.
  - requestorMSSV: The MSSV of the person requesting.
  - requestorRole: The role of the person requesting.
  - requestorDept: The department of the person requesting.
  - CLB: The CLB of the person requesting.
  - requestorName: The name of the person requesting.

  Request: {{{request}}}

  Please provide the extracted information in JSON format.
  If any information is missing, make a reasonable guess.
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

