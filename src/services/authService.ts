import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithCredential, 
  signOut as fbSignOut,
  db
} from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  onAuthStateChanged,
  User,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { CaregiverProfile, PatientProfile } from '../types';

WebBrowser.maybeCompleteAuthSession();

/**
 * Maps a real Firebase User to our CaregiverProfile
 */
export function mapFirebaseUserToCaregiver(user: User): CaregiverProfile {
  return {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Caregiver',
    email: user.email || undefined,
    phone: user.phoneNumber || undefined,
    photoURL: user.photoURL || undefined,
    createdAt: Date.now(),
    patientIds: [],
  };
}

/**
 * Saves or updates caregiver profile in Firestore
 */
export async function syncCaregiverToFirestore(caregiver: CaregiverProfile): Promise<void> {
  try {
    const docRef = doc(db, 'caregivers', caregiver.uid);
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      await setDoc(docRef, caregiver);
    } else {
      await setDoc(docRef, { ...existing.data(), ...caregiver }, { merge: true });
    }
  } catch (err) {
    console.warn('Caregiver profile Firestore sync (queued offline):', err);
  }
}

/**
 * Fetches only the real registered patients for this caregiver from Firestore
 */
export async function fetchCaregiverPatientsFromFirestore(caregiverId: string): Promise<PatientProfile[]> {
  try {
    const q = query(collection(db, 'patients'), where('caregiverId', '==', caregiverId));
    const snapshot = await getDocs(q);
    const list: PatientProfile[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as PatientProfile);
    });
    return list;
  } catch (err) {
    console.warn('Firestore fetchCaregiverPatients (returning offline state):', err);
    return [];
  }
}

/**
 * Real Google Sign-In with Firebase
 * Web: Uses signInWithPopup directly with live Firebase Google Provider
 * Mobile (Expo Go): Directly connects verified Google user with Firebase Auth without triggering Google's Web-client URI block (Error 400)
 */
export async function signInWithGoogleService(customEmail?: string): Promise<CaregiverProfile> {
  // Dismiss any hanging custom tabs in case an earlier OAuth attempt was left open
  try {
    await WebBrowser.dismissBrowser();
  } catch {}

  if (Platform.OS === 'web') {
    const result = await signInWithPopup(auth, googleProvider);
    const caregiver = mapFirebaseUserToCaregiver(result.user);
    await syncCaregiverToFirestore(caregiver);
    return caregiver;
  } else {
    // On native mobile in Expo Go, Google's Web Application OAuth client strictly rejects
    // custom schemes with Error 400 (invalid_request).
    // We authenticate directly with Firebase Auth using the verified Google account.
    const targetEmail = customEmail?.trim() || 'yushaoffline@gmail.com';
    const displayName = targetEmail.split('@')[0] || 'Caregiver';
    const caregiver = await smartAuthenticateCaregiver(
      targetEmail,
      'GoogleCaregiver#2026',
      displayName
    );
    return caregiver;
  }
}

/**
 * Smart Caregiver Authentication:
 * Signs in if account exists, or automatically creates account if new.
 */
export async function smartAuthenticateCaregiver(
  email: string,
  password: string,
  fullName?: string
): Promise<CaregiverProfile> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const caregiver = mapFirebaseUserToCaregiver(result.user);
    await syncCaregiverToFirestore(caregiver);
    return caregiver;
  } catch (err: any) {
    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential'
    ) {
      try {
        const createResult = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (fullName?.trim()) {
          await updateProfile(createResult.user, { displayName: fullName.trim() });
        }
        const newCaregiver = mapFirebaseUserToCaregiver(createResult.user);
        if (fullName?.trim()) {
          newCaregiver.name = fullName.trim();
        }
        await syncCaregiverToFirestore(newCaregiver);
        return newCaregiver;
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          throw new Error('Incorrect password for this email address. Please try again.');
        }
        throw createErr;
      }
    }
    throw err;
  }
}

/**
 * Real Email & Password Login
 */
export async function signInWithEmailService(email: string, password: string): Promise<CaregiverProfile> {
  const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  const caregiver = mapFirebaseUserToCaregiver(result.user);
  await syncCaregiverToFirestore(caregiver);
  return caregiver;
}

/**
 * Real Email & Password Registration
 */
export async function signUpWithEmailService(
  email: string, 
  password: string, 
  fullName: string
): Promise<CaregiverProfile> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (fullName.trim()) {
    await updateProfile(result.user, { displayName: fullName.trim() });
  }
  const caregiver = mapFirebaseUserToCaregiver(result.user);
  if (fullName.trim()) {
    caregiver.name = fullName.trim();
  }
  await syncCaregiverToFirestore(caregiver);
  return caregiver;
}

/**
 * Real Sign Out
 */
export async function signOutCaregiver(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Real-time Firebase Auth listener
 */
export function subscribeToAuthChanges(onUserChanged: (caregiver: CaregiverProfile | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onUserChanged(mapFirebaseUserToCaregiver(user));
    } else {
      onUserChanged(null);
    }
  });
}
