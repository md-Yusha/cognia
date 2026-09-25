import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PatientCodeMapping, PatientProfile } from '../types';
import { Platform } from 'react-native';

const PATIENT_SESSION_KEY = 'cognia_active_patient_session';
const LOCAL_CODES_STORAGE_KEY = 'cognia_local_code_mappings';

const REGIONAL_PREFIXES = ['TEA', 'RHINO', 'ASSAM', 'KHASI', 'MAJULI', 'KAZI', 'MEGH', 'MANI'];

/**
 * Generates a memorable, elderly-friendly regional code (e.g. TEA-204)
 */
export function generateMemorableCode(): string {
  const prefix = REGIONAL_PREFIXES[Math.floor(Math.random() * REGIONAL_PREFIXES.length)];
  const num = Math.floor(100 + Math.random() * 900); // 3-digit number
  return `${prefix}-${num}`;
}

/**
 * Resolves patient profile by access code.
 * Checks Firestore with offline cache and falls back to local storage if necessary.
 */
export async function resolvePatientCode(code: string): Promise<{
  mapping: PatientCodeMapping;
  patient: PatientProfile;
} | null> {
  const normalizedCode = code.trim().toUpperCase();

  try {
    // 1. Check Firestore
    const codeRef = doc(db, 'patient_codes', normalizedCode);
    const codeSnap = await getDoc(codeRef);

    if (codeSnap.exists()) {
      const mapping = codeSnap.data() as PatientCodeMapping;
      const patientRef = doc(db, 'patients', mapping.patientId);
      const patientSnap = await getDoc(patientRef);

      if (patientSnap.exists()) {
        const patient = { id: patientSnap.id, ...patientSnap.data() } as PatientProfile;
        
        // Cache mapping locally for instant offline boots
        await saveLocalCodeMapping(mapping, patient);
        return { mapping, patient };
      }
    }
  } catch (err) {
    console.warn('Network lookup failed, trying local cache for code:', normalizedCode, err);
  }

  // 2. Fallback to local cached mappings
  return await getLocalCodeMapping(normalizedCode);
}

/**
 * Registers a new patient code in Firestore and caches locally
 */
export async function registerPatientCode(
  patientId: string, 
  caregiverId: string, 
  patientName: string,
  preferredLanguage: string = 'en',
  extraProfileData?: Partial<PatientProfile>
): Promise<string> {
  let uniqueCode = '';
  let attempts = 0;

  while (attempts < 5) {
    uniqueCode = generateMemorableCode();
    try {
      const codeRef = doc(db, 'patient_codes', uniqueCode);
      const existing = await getDoc(codeRef);
      if (!existing.exists()) {
        break;
      }
    } catch {
      // Offline mode: proceed with generated code
      break;
    }
    attempts++;
  }

  const mapping: PatientCodeMapping = {
    code: uniqueCode,
    patientId,
    caregiverId,
    patientName,
    createdAt: Date.now(),
  };

  const patient: PatientProfile = {
    id: patientId,
    caregiverId,
    name: patientName,
    preferredLanguage: preferredLanguage as any,
    accessCode: uniqueCode,
    createdAt: Date.now(),
    difficultyLevels: {
      memory_match: 'easy',
      daily_routine_recall: 'easy',
      pattern_recognition: 'easy',
      focus_tap: 'easy',
    },
    ...extraProfileData,
  };

  try {
    await setDoc(doc(db, 'patient_codes', uniqueCode), mapping);
    await setDoc(doc(db, 'patients', patientId), patient);
  } catch (err) {
    console.warn('Firestore write queued in offline cache:', err);
  }

  await saveLocalCodeMapping(mapping, patient);
  return uniqueCode;
}

/**
 * Stores the active patient session securely on-device
 */
export async function savePatientSession(patient: PatientProfile): Promise<void> {
  const json = JSON.stringify(patient);
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(PATIENT_SESSION_KEY, json);
    } else {
      await SecureStore.setItemAsync(PATIENT_SESSION_KEY, json);
    }
  } catch (e) {
    await AsyncStorage.setItem(PATIENT_SESSION_KEY, json);
  }
}

/**
 * Retrieves the stored patient session from device
 */
export async function getStoredPatientSession(): Promise<PatientProfile | null> {
  try {
    let json: string | null = null;
    if (Platform.OS === 'web') {
      json = await AsyncStorage.getItem(PATIENT_SESSION_KEY);
    } else {
      json = await SecureStore.getItemAsync(PATIENT_SESSION_KEY);
    }
    if (!json) {
      json = await AsyncStorage.getItem(PATIENT_SESSION_KEY);
    }
    return json ? JSON.parse(json) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Clears the patient session from device
 */
export async function clearPatientSession(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(PATIENT_SESSION_KEY);
    } else {
      await SecureStore.deleteItemAsync(PATIENT_SESSION_KEY);
    }
  } catch {}
  await AsyncStorage.removeItem(PATIENT_SESSION_KEY);
}

// Internal Local Storage Helper for Offline Code Caching
async function saveLocalCodeMapping(mapping: PatientCodeMapping, patient: PatientProfile) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CODES_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing[mapping.code] = { mapping, patient };
    await AsyncStorage.setItem(LOCAL_CODES_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save local mapping', e);
  }
}

async function getLocalCodeMapping(code: string) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CODES_STORAGE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    if (store[code]) return store[code];

    // Built-in registered demo profiles for offline evaluation
    if (code === 'ASSAM-102') {
      const patient: PatientProfile = {
        id: 'patient_sample_01',
        caregiverId: 'caregiver_active',
        name: 'Rupali Barua',
        age: 72,
        gender: 'female',
        preferredLanguage: 'as',
        accessCode: 'ASSAM-102',
        dementiaStage: 'early',
        createdAt: Date.now() - 86400000 * 10,
        difficultyLevels: {
          memory_match: 'medium',
          daily_routine_recall: 'easy',
          pattern_recognition: 'easy',
          focus_tap: 'medium',
        }
      };
      const mapping: PatientCodeMapping = {
        code: 'ASSAM-102',
        patientId: patient.id,
        caregiverId: patient.caregiverId,
        patientName: patient.name,
        createdAt: patient.createdAt,
      };
      return { mapping, patient };
    }

    if (code === 'KHASI-404') {
      const patient: PatientProfile = {
        id: 'patient_sample_02',
        caregiverId: 'caregiver_active',
        name: 'Khrawbor Khongwir',
        age: 68,
        gender: 'male',
        preferredLanguage: 'kha',
        accessCode: 'KHASI-404',
        dementiaStage: 'moderate',
        createdAt: Date.now() - 86400000 * 5,
        difficultyLevels: {
          memory_match: 'easy',
          daily_routine_recall: 'easy',
          pattern_recognition: 'easy',
          focus_tap: 'easy',
        }
      };
      const mapping: PatientCodeMapping = {
        code: 'KHASI-404',
        patientId: patient.id,
        caregiverId: patient.caregiverId,
        patientName: patient.name,
        createdAt: patient.createdAt,
      };
      return { mapping, patient };
    }

    return null;
  } catch {
    return null;
  }
}

