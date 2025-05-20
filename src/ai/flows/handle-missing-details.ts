// use server'

/**
 * @fileOverview This file defines a Genkit flow for handling missing details in room booking requests.
 *
 * - handleMissingDetails - A function that orchestrates the process of identifying and requesting missing information.
 * - HandleMissingDetailsInput - The input type for the handleMissingDetails function.
 * - HandleMissingDetailsOutput - The return type for the handleMissingDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HandleMissingDetailsInputSchema = z.object({
  room: z.string().optional().describe('The room requested for booking.'),
  date: z.string().optional().describe('The date for the booking (e.g., April 1, 2025).'),
  time: z.string().optional().describe('The time slot for the booking (e.g., 10:30 AM - 12:30 PM (GMT+7)).'),
  purpose: z.string().optional().describe('The purpose of the booking (e.g., Weekly AI workshop).'),
  estimated_number_of_attendees: z
    .number()
    .optional()
    .describe('The estimated number of attendees (e.g., 20).'),
  special_requirements: z
    .string()
    .optional()
    .describe('Any special requirements for the booking (e.g., Projector, whiteboard).'),
  target_email: z
    .string()
    .email()
    .optional()
    .describe('The target email address for booking confirmations.'),
  cc_email: z.string().email().optional().describe('The CC email address for booking confirmations.'),
  requestorMail: z.string().email().describe('The email address of the requestor.'),
  requestorMSSV: z.string().describe('The student ID of the requestor.'),
  requestorRole: z.string().describe('The role of the requestor (e.g., Chưởng ban).'),
  requestorDept: z.string().describe('The department of the requestor (e.g., Khoa Khoa học).'),
  CLB: z.string().describe('The club or organization making the request (e.g., Edtech).'),
  requestorName: z.string().describe('The name of the requestor.'),
});

export type HandleMissingDetailsInput = z.infer<typeof HandleMissingDetailsInputSchema>;

const HandleMissingDetailsOutputSchema = z.object({
  missingDetails: z.array(z.string()).describe('An array of missing details in the booking request.'),
  followUpQuestions: z
    .array(z.string())
    .describe('An array of follow-up questions to ask the user to gather missing details.'),
  isComplete: z.boolean().describe('Whether all required details are present.'),
});

export type HandleMissingDetailsOutput = z.infer<typeof HandleMissingDetailsOutputSchema>;

export async function handleMissingDetails(input: HandleMissingDetailsInput): Promise<HandleMissingDetailsOutput> {
  return handleMissingDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'handleMissingDetailsPrompt',
  input: {schema: HandleMissingDetailsInputSchema},
  output: {schema: HandleMissingDetailsOutputSchema},
  prompt: `You are a helpful assistant that identifies missing information from a room booking request and formulates follow-up questions to collect the missing details.

  Here's the booking request information you have so far:
  Room: {{{room}}}
  Date: {{{date}}}
  Time: {{{time}}}
  Purpose: {{{purpose}}}
  Number of Attendees: {{{estimated_number_of_attendees}}}
  Special Requirements: {{{special_requirements}}}
  Target Email: {{{target_email}}}
  CC Email: {{{cc_email}}}
  Requestor Email: {{{requestorMail}}}
  Requestor MSSV: {{{requestorMSSV}}}
  Requestor Role: {{{requestorRole}}}
  Requestor Department: {{{requestorDept}}}
  Club: {{{CLB}}}
  Requestor Name: {{{requestorName}}}

  1.  Identify which of the following details are missing: room, date, time, purpose, estimated_number_of_attendees, special_requirements, target_email.
  2.  Formulate a list of follow-up questions to ask the user to gather the missing details. Each question should be clear and specific.
  3.  If no details are missing, then isComplete should be true. Otherwise, isComplete should be false.

  Return the missing details and follow-up questions in the format specified by the output schema.`,
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
