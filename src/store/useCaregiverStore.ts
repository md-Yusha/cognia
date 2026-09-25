import { create } from 'zustand';
import { CaregiverProfile, PatientProfile, CaregiverAlert, ReminderItem, CaregiverRole } from '../types';
import { fetchCaregiverPatientsFromFirestore, updateCaregiverRole } from '../services/authService';

let caregiverPatientsUnsub: (() => void) | null = null;

interface CaregiverState {
  caregiver: CaregiverProfile | null;
  activeRole: CaregiverRole;
  patients: PatientProfile[];
  alerts: CaregiverAlert[];
  selectedPatient: PatientProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setCaregiver: (caregiver: CaregiverProfile | null) => void;
  setActiveRole: (role: CaregiverRole) => Promise<void>;
  loadCaregiverPatients: (caregiverId: string) => Promise<void>;
  setPatients: (patients: PatientProfile[]) => void;
  addPatient: (patient: PatientProfile) => void;
  setSelectedPatient: (patient: PatientProfile | null) => void;
  setAlerts: (alerts: CaregiverAlert[]) => void;
  markAlertRead: (alertId: string) => void;
  loadSamplePatientsDemo: () => void;
  clearAllPatients: () => void;
  logoutCaregiver: () => void;
}

export const useCaregiverStore = create<CaregiverState>((set, get) => ({
  caregiver: null,
  activeRole: 'family',
  patients: [],
  alerts: [],
  selectedPatient: null,
  isAuthenticated: false,
  isLoading: false,

  setCaregiver: (caregiver) => {
    set({ 
      caregiver, 
      activeRole: caregiver?.role || 'family',
      isAuthenticated: !!caregiver 
    });
    if (caregiver?.uid) {
      get().loadCaregiverPatients(caregiver.uid);
    } else {
      if (caregiverPatientsUnsub) {
        caregiverPatientsUnsub();
        caregiverPatientsUnsub = null;
      }
    }
  },

  setActiveRole: async (role) => {
    const { caregiver } = get();
    set({ activeRole: role });
    if (caregiver) {
      const updated = { ...caregiver, role };
      set({ caregiver: updated });
      await updateCaregiverRole(caregiver.uid, role);
    }
  },

  loadCaregiverPatients: async (caregiverId: string) => {
    set({ isLoading: true });
    
    // Clean up any existing listener
    if (caregiverPatientsUnsub) {
      caregiverPatientsUnsub();
      caregiverPatientsUnsub = null;
    }

    try {
      const { collection, query, where, onSnapshot, doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      
      const pRef = collection(db, 'patients');
      
      // Check caregiver doc for linked patientIds
      let linkedPatientIds: string[] = [];
      try {
        const cgSnap = await getDoc(doc(db, 'caregivers', caregiverId));
        if (cgSnap.exists() && Array.isArray(cgSnap.data()?.patientIds)) {
          linkedPatientIds = cgSnap.data().patientIds;
        }
      } catch {}

      // Realtime map of patients
      const patientMap = new Map<string, PatientProfile>();

      const updateStore = () => {
        const list = Array.from(patientMap.values());
        set({ patients: list, isLoading: false });
      };

      // 1. Listen for patients where caregiverId == caregiverId (Clinical / direct)
      const qCreator = query(pRef, where('caregiverId', '==', caregiverId));
      const unsub1 = onSnapshot(qCreator, (snapshot) => {
        snapshot.forEach((d) => {
          patientMap.set(d.id, d.data() as PatientProfile);
        });
        updateStore();
      }, (err) => {
        console.warn('Realtime qCreator patients error:', err);
        set({ isLoading: false });
      });

      // 2. Listen for patients where familyCaregiverIds contains caregiverId (Family member)
      const qFamily = query(pRef, where('familyCaregiverIds', 'array-contains', caregiverId));
      const unsub2 = onSnapshot(qFamily, (snapshot) => {
        snapshot.forEach((d) => {
          patientMap.set(d.id, d.data() as PatientProfile);
        });
        updateStore();
      }, () => {});

      // 3. For any explicitly linked patient IDs from profile, fetch/listen to them
      const unsubsLinked: (() => void)[] = [];
      for (const pid of linkedPatientIds) {
        if (!pid) continue;
        const pDocRef = doc(db, 'patients', pid);
        const u = onSnapshot(pDocRef, (pSnap) => {
          if (pSnap.exists()) {
            patientMap.set(pSnap.id, pSnap.data() as PatientProfile);
            updateStore();
          }
        }, () => {});
        unsubsLinked.push(u);
      }

      caregiverPatientsUnsub = () => {
        unsub1();
        unsub2();
        unsubsLinked.forEach((u) => u());
      };
    } catch (e) {
      console.warn('Error setting up realtime caregiver patients:', e);
      set({ isLoading: false });
    }
  },

  setPatients: (patients) => {
    set({ patients });
  },

  addPatient: (patient) => {
    const existing = get().patients.filter((p) => p.id !== patient.id);
    set({ patients: [patient, ...existing] });
  },

  setSelectedPatient: (patient) => {
    set({ selectedPatient: patient });
  },

  setAlerts: (alerts) => {
    set({ alerts });
  },

  markAlertRead: (alertId) => {
    const updated = get().alerts.map((a) => 
      a.id === alertId ? { ...a, isRead: true } : a
    );
    set({ alerts: updated });
  },

  loadSamplePatientsDemo: () => {
    const samplePatients: PatientProfile[] = [
      {
        id: 'patient_sample_01',
        caregiverId: get().caregiver?.uid || 'caregiver_active',
        name: 'Rupali Barua',
        city: 'Guwahati',
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
      },
      {
        id: 'patient_sample_02',
        caregiverId: get().caregiver?.uid || 'caregiver_active',
        name: 'Khrawbor Khongwir',
        city: 'Shillong',
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
      }
    ];

    const sampleAlerts: CaregiverAlert[] = [
      {
        id: 'alt_1',
        caregiverId: get().caregiver?.uid || 'caregiver_active',
        patientId: 'patient_sample_01',
        patientName: 'Rupali Barua',
        type: 'milestone',
        severity: 'info',
        message: 'Completed morning Rhino Memory Match with 92% accuracy!',
        timestamp: Date.now() - 3600000 * 2,
        isRead: false,
      }
    ];

    set({ patients: samplePatients, alerts: sampleAlerts });
  },

  clearAllPatients: () => {
    set({ patients: [], alerts: [] });
  },

  logoutCaregiver: () => {
    if (caregiverPatientsUnsub) {
      caregiverPatientsUnsub();
      caregiverPatientsUnsub = null;
    }
    set({ caregiver: null, isAuthenticated: false, selectedPatient: null, patients: [], alerts: [] });
  },
}));
