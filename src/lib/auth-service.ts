import { auth } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { FirebaseApp } from 'firebase/app';

export const signup = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Error signing up:', error);
    throw new Error(error.message);
  }
};

export const signin = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Error signing in:', error);
    throw new Error(error.message);
  }
};

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    throw new Error(error.message);
  }
};

export const signout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Error signing out:', error);
    throw new Error(error.message);
  }
};

export const observeAuthState = (callback: (user: User | null) => void): () => void => {
  const unsubscribe = onAuthStateChanged(auth, callback);
  return unsubscribe; // Return the unsubscribe function
};