// src/services/booking-service.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { ExtractBookingDetailsOutput } from '@/ai/flows/extract-booking-details';

/**
 * Saves the booking details to Firestore.
 * @param bookingDetails The booking details extracted by the AI.
 * @returns The ID of the newly created document in Firestore.
 * @throws Error if saving to Firestore fails.
 */
export async function saveBookingDetailsToFirestore(bookingDetails: ExtractBookingDetailsOutput): Promise<string> {
  try {
    const bookingsCollectionRef = collection(db, "bookings");
    const docRef = await addDoc(bookingsCollectionRef, {
      ...bookingDetails,
      createdAt: serverTimestamp(), // Automatically adds the server's timestamp
      status: 'pending', // Default status for new bookings
    });
    console.log("Booking details saved to Firestore with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving booking details to Firestore: ", error);
    // Re-throw a more generic error to avoid leaking too much detail to the client if this function were ever client-callable (though it's 'use server').
    throw new Error("Failed to save booking details. Please try again later.");
  }
}
