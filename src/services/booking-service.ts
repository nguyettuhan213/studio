// src/services/booking-service.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Saves the workflow request details to Firestore dynamically.
 * @param workflowId The ID of the workflow.
 * @param details The extracted and validated workflow request details.
 * @returns The ID of the newly created document in Firestore.
 */
export async function saveWorkflowDetailsToFirestore(
  workflowId: string,
  details: Record<string, any>
): Promise<string> {
  try {
    const requestsCollectionRef = collection(db, "requests");
    const docRef = await addDoc(requestsCollectionRef, {
      ...details,
      workflowId,
      createdAt: serverTimestamp(),
      status: 'pending',
    });
    console.log(`Workflow request [${workflowId}] saved to Firestore with ID:`, docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving workflow details to Firestore:", error);
    throw new Error("Failed to save request details. Please try again later.");
  }
}

/**
 * Backward-compatible wrapper for saving booking details to Firestore.
 */
export async function saveBookingDetailsToFirestore(
  bookingDetails: Record<string, any>
): Promise<string> {
  const workflowId = bookingDetails.workflowId || 'room_booking';
  return saveWorkflowDetailsToFirestore(workflowId, bookingDetails);
}
